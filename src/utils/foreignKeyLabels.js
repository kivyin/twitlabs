import { fetchReferenceLabels } from "../api/dbApi";
import { buildForeignKeyOptionLabel, buildOptionsFromLabelMap } from "./tableForm";
import {
  clearInFlightForeignKeyLabelFetch,
  getCachedForeignKeyLabelMap,
  getInFlightForeignKeyLabelFetch,
  invalidateForeignKeyLabelCache,
  setCachedForeignKeyLabelMap,
  setInFlightForeignKeyLabelFetch,
} from "./foreignKeyLabelCache";

export { getCachedForeignKeyLabelMap, invalidateForeignKeyLabelCache };

const AUDIT_USER_COLUMNS = new Set(["created_by", "updated_by", "user_id"]);

/**
 * Fallback refs when SQLite has no FK and dictionary ref_table is empty.
 * Table-scoped overrides win over the global map.
 */
const GLOBAL_COLUMN_REF_FALLBACKS = {
  account_id: "accounts",
  source_account_id: "accounts",
  category_id: "categories",
  default_category_id: "categories",
  payee_id: "payees",
  account_type_id: "account_types",
  user_id: "users",
  created_by: "users",
  updated_by: "users",
  project_id: "task_projects",
  notebook_id: "notebooks",
  subject_id: "note_subjects",
  topic_id: "note_topics",
  task_id: "tasks",
  parent_note_id: "notes",
  linked_transaction_id: "transactions",
  transaction_id: "transactions",
  tag_id: "task_tags",
};

const TABLE_COLUMN_REF_FALLBACKS = {
  categories: { type_id: "category_types" },
  system_navigation: { parent_id: "system_navigation" },
  note_topics: { parent_topic_id: "note_topics" },
};

export function buildRefLabelMap(rows, refTable, idColumn = "id", labelField) {
  return Object.fromEntries(
    (rows ?? [])
      .filter((row) => row[idColumn] !== undefined && row[idColumn] !== null && row[idColumn] !== "")
      .map((row) => [
        String(row[idColumn]),
        buildForeignKeyOptionLabel(row, idColumn, refTable, labelField),
      ])
  );
}

function resolveColumnRefFallback(table, columnName) {
  const tableFallback = TABLE_COLUMN_REF_FALLBACKS[table]?.[columnName];
  if (tableFallback) {
    return tableFallback;
  }
  return GLOBAL_COLUMN_REF_FALLBACKS[columnName] ?? null;
}

/**
 * Merge PRAGMA foreign keys, dictionary ref_table / ref_label_field, and known column fallbacks.
 * Returns { [column]: { refTable, refColumn, refLabelField } }.
 */
export function buildRefMetaByColumn({
  table,
  fieldDefinitions = [],
  pragmaForeignKeys = [],
  columns = [],
} = {}) {
  const meta = {};
  const labelFieldByColumn = Object.fromEntries(
    (fieldDefinitions ?? [])
      .filter((field) => field?.name && field.ref_label_field)
      .map((field) => [field.name, field.ref_label_field])
  );

  for (const fk of pragmaForeignKeys) {
    if (!fk?.from || !fk?.table) continue;
    meta[fk.from] = {
      refTable: fk.table,
      refColumn: fk.to || "id",
      refLabelField: labelFieldByColumn[fk.from] ?? null,
    };
  }

  for (const field of fieldDefinitions) {
    if (!field?.name || !field.ref_table) continue;
    if (!meta[field.name]) {
      meta[field.name] = {
        refTable: field.ref_table,
        refColumn: "id",
        refLabelField: field.ref_label_field ?? null,
      };
    } else if (field.ref_label_field && !meta[field.name].refLabelField) {
      meta[field.name].refLabelField = field.ref_label_field;
    }
  }

  for (const field of fieldDefinitions) {
    if (!field?.name) continue;
    if (AUDIT_USER_COLUMNS.has(field.name) && !meta[field.name]) {
      meta[field.name] = {
        refTable: "users",
        refColumn: "id",
        refLabelField: field.ref_label_field ?? "display_name",
      };
    }
  }

  const columnNames =
    columns.length > 0
      ? columns.map((column) => (typeof column === "string" ? column : column.name)).filter(Boolean)
      : fieldDefinitions.map((field) => field.name).filter(Boolean);

  for (const columnName of columnNames) {
    if (meta[columnName]) continue;
    const fallback = resolveColumnRefFallback(table, columnName);
    if (fallback) {
      meta[columnName] = {
        refTable: fallback,
        refColumn: "id",
        refLabelField: labelFieldByColumn[columnName] ?? null,
      };
    }
  }

  return meta;
}

export function buildRefTableByColumnFromMeta(refMetaByColumn = {}) {
  return Object.fromEntries(
    Object.entries(refMetaByColumn).map(([column, meta]) => [column, meta.refTable])
  );
}

export function collectReferencedTables(refMetaByColumn = {}) {
  return [...new Set(Object.values(refMetaByColumn).map((meta) => meta.refTable).filter(Boolean))];
}

/** Normalize string table names or ref specs into API request refs. */
export function normalizeReferenceLabelSpecs(refSpecs = []) {
  const byTable = new Map();

  for (const spec of refSpecs ?? []) {
    if (!spec) continue;
    if (typeof spec === "string") {
      if (!byTable.has(spec)) {
        byTable.set(spec, { table: spec });
      }
      continue;
    }

    const table = spec.table || spec.refTable;
    if (!table) continue;
    const existing = byTable.get(table) ?? { table };
    byTable.set(table, {
      table,
      idColumn: spec.idColumn || spec.refColumn || existing.idColumn,
      labelField: spec.labelField || spec.refLabelField || existing.labelField,
      limit: spec.limit || existing.limit,
    });
  }

  return [...byTable.values()];
}

export function collectReferencedTableSpecs(refMetaByColumn = {}) {
  return normalizeReferenceLabelSpecs(
    Object.values(refMetaByColumn).map((meta) => ({
      table: meta.refTable,
      idColumn: meta.refColumn,
      labelField: meta.refLabelField,
    }))
  );
}

async function fetchAndCacheLabelMaps(refSpecs = []) {
  const specs = normalizeReferenceLabelSpecs(refSpecs);
  if (specs.length === 0) {
    return {};
  }

  const missing = specs.filter((spec) => getCachedForeignKeyLabelMap(spec.table) === null);
  if (missing.length === 0) {
    return Object.fromEntries(
      specs.map((spec) => [spec.table, getCachedForeignKeyLabelMap(spec.table) ?? {}])
    );
  }

  const inflightKey = missing
    .map((spec) => spec.table)
    .sort()
    .join(",");
  const pending = getInFlightForeignKeyLabelFetch(inflightKey);
  if (pending) {
    await pending;
    return Object.fromEntries(
      specs.map((spec) => [spec.table, getCachedForeignKeyLabelMap(spec.table) ?? {}])
    );
  }

  const promise = fetchReferenceLabels(missing)
    .then((payload) => {
      const maps = payload?.maps ?? {};
      for (const spec of missing) {
        setCachedForeignKeyLabelMap(spec.table, maps[spec.table] ?? {});
      }
      clearInFlightForeignKeyLabelFetch(inflightKey);
      return maps;
    })
    .catch((error) => {
      clearInFlightForeignKeyLabelFetch(inflightKey);
      for (const spec of missing) {
        setCachedForeignKeyLabelMap(spec.table, {});
      }
      throw error;
    });

  setInFlightForeignKeyLabelFetch(inflightKey, promise);
  await promise;

  return Object.fromEntries(
    specs.map((spec) => [spec.table, getCachedForeignKeyLabelMap(spec.table) ?? {}])
  );
}

/**
 * Ensure label maps for the given ref tables/specs are loaded into the module cache.
 * Accepts table name strings or { table, idColumn, labelField } objects.
 */
export async function ensureForeignKeyLabelMaps(refSpecs = [], { force = false } = {}) {
  const specs = normalizeReferenceLabelSpecs(refSpecs);
  const uniqueTables = specs.map((spec) => spec.table);

  if (force) {
    uniqueTables.forEach((refTable) => invalidateForeignKeyLabelCache(refTable));
  }

  try {
    await fetchAndCacheLabelMaps(specs);
  } catch {
    // Empty maps already cached in fetchAndCacheLabelMaps.
  }

  return Object.fromEntries(
    uniqueTables.map((refTable) => [refTable, getCachedForeignKeyLabelMap(refTable) ?? {}])
  );
}

/**
 * Load shared FK meta, label maps, and select options for a table.
 * Use from list pages (via the hook) and forms (directly).
 */
export async function loadForeignKeyResources({
  table,
  fieldDefinitions = [],
  pragmaForeignKeys = [],
  columns = [],
  force = false,
} = {}) {
  const refMetaByColumn = buildRefMetaByColumn({
    table,
    fieldDefinitions,
    pragmaForeignKeys,
    columns,
  });
  const refTableByColumn = buildRefTableByColumnFromMeta(refMetaByColumn);
  const specs = collectReferencedTableSpecs(refMetaByColumn);
  const labelMaps = await ensureForeignKeyLabelMaps(specs, { force });

  const optionsByColumn = Object.fromEntries(
    Object.entries(refMetaByColumn).map(([column, meta]) => [
      column,
      buildOptionsFromLabelMap(labelMaps[meta.refTable] ?? {}),
    ])
  );

  return {
    refMetaByColumn,
    refTableByColumn,
    labelMaps,
    optionsByColumn,
  };
}

export function resolveReferenceLabel(value, labelMap = {}) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return labelMap[String(value)] ?? String(value);
}

/**
 * Format a cell value when the column is a foreign key.
 * Returns null when the column is not a reference (caller continues with other formatters).
 */
export function formatReferenceValue(column, value, labelMapsByTable = {}, refTableByColumn = {}) {
  const refTable = refTableByColumn[column];
  if (!refTable) {
    return null;
  }

  return resolveReferenceLabel(value, labelMapsByTable[refTable] ?? {});
}
