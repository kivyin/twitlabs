import { useEffect, useMemo, useState } from "react";
import {
  buildRefMetaByColumn,
  buildRefTableByColumnFromMeta,
  collectReferencedTableSpecs,
  collectReferencedTables,
  ensureForeignKeyLabelMaps,
  formatReferenceValue,
  getCachedForeignKeyLabelMap,
} from "../utils/foreignKeyLabels";
import { subscribeForeignKeyLabelCache } from "../utils/foreignKeyLabelCache";

function snapshotCachedMaps(refTables) {
  return Object.fromEntries(
    refTables.map((refTable) => [refTable, getCachedForeignKeyLabelMap(refTable) ?? {}])
  );
}

/**
 * Loads display labels for all foreign-key columns on a table.
 * Uses a module-level cache so navigating between list views does not re-query
 * the same referenced tables (accounts, categories, users, etc.).
 */
export function useForeignKeyLabelMaps({
  table,
  fieldDefinitions = [],
  pragmaForeignKeys = [],
  columns = [],
  enabled = true,
} = {}) {
  const refMetaByColumn = useMemo(
    () =>
      buildRefMetaByColumn({
        table,
        fieldDefinitions,
        pragmaForeignKeys,
        columns,
      }),
    [table, fieldDefinitions, pragmaForeignKeys, columns]
  );

  const refTableByColumn = useMemo(
    () => buildRefTableByColumnFromMeta(refMetaByColumn),
    [refMetaByColumn]
  );

  const neededSpecs = useMemo(
    () => collectReferencedTableSpecs(refMetaByColumn),
    [refMetaByColumn]
  );

  const neededTables = useMemo(
    () => collectReferencedTables(refMetaByColumn),
    [refMetaByColumn]
  );

  const neededKey = neededSpecs
    .map((spec) => `${spec.table}:${spec.labelField ?? ""}:${spec.idColumn ?? ""}`)
    .sort()
    .join(",");

  const [labelMaps, setLabelMaps] = useState(() => snapshotCachedMaps(neededTables));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || neededSpecs.length === 0) {
      return undefined;
    }

    let active = true;

    async function loadMaps() {
      setLoading(true);
      try {
        const maps = await ensureForeignKeyLabelMaps(neededSpecs);
        if (active) {
          setLabelMaps(maps);
        }
      } catch {
        if (active) {
          setLabelMaps(snapshotCachedMaps(neededTables));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMaps();

    const unsubscribe = subscribeForeignKeyLabelCache((_version, invalidatedTable) => {
      if (invalidatedTable && !neededTables.includes(invalidatedTable)) {
        return;
      }
      loadMaps();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, neededKey, neededSpecs, neededTables]);

  const formatReference = useMemo(
    () => (column, value) => formatReferenceValue(column, value, labelMaps, refTableByColumn),
    [labelMaps, refTableByColumn]
  );

  return {
    labelMaps,
    refMetaByColumn,
    refTableByColumn,
    loading,
    formatReference,
  };
}
