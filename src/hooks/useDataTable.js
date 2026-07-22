import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUserPreference, setUserPreference } from "../api/preferencesApi";
import { useAuth } from "../context/AuthContext";
import { sortRows } from "../utils/tableSort";

function readLocalPreferences(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalPreferences(storageKey, preferences) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // ignore quota / private mode
  }
}

function isDateLikeSortColumn(column) {
  return /(_date|_on|_at)$/i.test(column) || column === "date";
}

function normalizeSort(sort) {
  if (!sort?.column || !sort?.direction) {
    return { column: null, direction: null };
  }
  const direction = sort.direction === "asc" ? "asc" : "desc";
  return { column: String(sort.column), direction };
}

function hasSavedSort(sort) {
  return Boolean(sort?.column && sort?.direction);
}

function sortsEqual(a, b) {
  return a?.column === b?.column && a?.direction === b?.direction;
}

function hasSavedVisibleColumns(preferences) {
  return Array.isArray(preferences?.visibleColumns) && preferences.visibleColumns.length > 0;
}

function computeNextSort(current, column) {
  if (current?.column !== column) {
    return { column, direction: isDateLikeSortColumn(column) ? "desc" : "asc" };
  }
  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }
  if (current.direction === "desc") {
    return { column: null, direction: null };
  }
  return { column, direction: "asc" };
}

function normalizeVisibleColumns(columns, availableColumns, fallbackVisible) {
  const availableSet = new Set(availableColumns);
  const pruned = (Array.isArray(columns) ? columns : []).filter((column) =>
    availableSet.has(column)
  );
  if (pruned.length > 0) return pruned;
  if (fallbackVisible.length > 0) return fallbackVisible;
  return availableColumns;
}

export function useDataTable({
  rows,
  columns,
  defaultVisibleColumns,
  storageKey,
  serverSide = false,
  sort: controlledSort,
  onSortChange,
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const saveTimerRef = useRef(null);
  const hydratedKeyRef = useRef("");
  const onSortChangeRef = useRef(onSortChange);
  const pendingHydratedSortRef = useRef(null);
  const userTouchedSortRef = useRef(false);
  onSortChangeRef.current = onSortChange;

  const availableColumns = useMemo(() => {
    if (columns.length > 0) {
      return columns;
    }
    if (rows.length > 0) {
      return Object.keys(rows[0]);
    }
    return [];
  }, [columns, rows]);

  const fallbackVisible = useMemo(() => {
    if (defaultVisibleColumns?.length > 0) {
      return defaultVisibleColumns.filter((column) => availableColumns.includes(column));
    }
    return availableColumns;
  }, [availableColumns, defaultVisibleColumns]);

  const [visibleColumns, setVisibleColumnsState] = useState(() => {
    const saved = readLocalPreferences(storageKey);
    return normalizeVisibleColumns(saved?.visibleColumns, availableColumns, fallbackVisible);
  });

  const [internalSort, setInternalSort] = useState(() =>
    normalizeSort(readLocalPreferences(storageKey)?.sort)
  );
  const [prefsReady, setPrefsReady] = useState(!storageKey);
  // Avoid writing the page default sort over a saved preference before hydrate finishes.
  const [sortHydrated, setSortHydrated] = useState(!storageKey || !serverSide);

  const sort = serverSide ? controlledSort : internalSort;

  const persistPreferences = useCallback(
    (nextVisible, nextSort) => {
      if (!storageKey) return;
      const payload = {
        visibleColumns: nextVisible,
        sort: normalizeSort(nextSort),
      };
      writeLocalPreferences(storageKey, payload);

      if (!userId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        setUserPreference(storageKey, payload).catch(() => {
          // local cache already written
        });
      }, 300);
    },
    [storageKey, userId]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateKey = `${userId ?? "anon"}:${storageKey ?? ""}`;

    async function hydrate() {
      if (!storageKey) {
        setSortHydrated(true);
        setPrefsReady(true);
        return;
      }

      setPrefsReady(false);
      if (serverSide) {
        setSortHydrated(false);
        pendingHydratedSortRef.current = null;
        userTouchedSortRef.current = false;
      }
      const local = readLocalPreferences(storageKey);

      const applySource = (source) => {
        setVisibleColumnsState((current) =>
          normalizeVisibleColumns(source?.visibleColumns ?? current, availableColumns, fallbackVisible)
        );

        const savedSort = normalizeSort(source?.sort);
        if (!serverSide) {
          setInternalSort(savedSort);
          setSortHydrated(true);
          return;
        }

        if (
          hasSavedSort(savedSort) &&
          (availableColumns.length === 0 || availableColumns.includes(savedSort.column))
        ) {
          pendingHydratedSortRef.current = savedSort;
          onSortChangeRef.current?.(savedSort);
        } else {
          pendingHydratedSortRef.current = null;
        }
        setSortHydrated(true);
      };

      if (!userId) {
        if (!active) return;
        applySource(local);
        hydratedKeyRef.current = hydrateKey;
        setPrefsReady(true);
        return;
      }

      try {
        const preference = await getUserPreference(storageKey);
        if (!active) return;
        const remote = preference?.value;
        const remoteUseful = hasSavedVisibleColumns(remote) || hasSavedSort(remote?.sort);
        const source = remoteUseful ? remote : local;

        // First-time migrate local prefs into the user preference table.
        if (!remoteUseful && (hasSavedVisibleColumns(local) || hasSavedSort(local?.sort))) {
          setUserPreference(storageKey, {
            visibleColumns: local?.visibleColumns ?? [],
            sort: normalizeSort(local?.sort),
          }).catch(() => {});
        }

        applySource(source);
      } catch {
        if (!active) return;
        applySource(local);
      } finally {
        if (active) {
          hydratedKeyRef.current = hydrateKey;
          setPrefsReady(true);
        }
      }
    }

    if (hydratedKeyRef.current !== hydrateKey) {
      hydrate();
    } else {
      setSortHydrated(true);
      setPrefsReady(true);
    }

    return () => {
      active = false;
    };
    // Intentionally hydrate when user/storageKey changes; available columns prune separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, userId, serverSide]);

  useEffect(() => {
    if (availableColumns.length === 0) return;
    setVisibleColumnsState((current) =>
      normalizeVisibleColumns(current, availableColumns, fallbackVisible)
    );
  }, [availableColumns, fallbackVisible]);

  useEffect(() => {
    if (!prefsReady || !storageKey || !sortHydrated || visibleColumns.length === 0) return;

    let sortToPersist;
    if (serverSide) {
      const pending = pendingHydratedSortRef.current;
      if (pending && !userTouchedSortRef.current) {
        // Wait until the parent accepts the hydrated sort so we don't persist the page default.
        if (!sortsEqual(normalizeSort(controlledSort), pending)) {
          return;
        }
        pendingHydratedSortRef.current = null;
      }
      sortToPersist = controlledSort;
    } else {
      sortToPersist = internalSort;
    }

    persistPreferences(visibleColumns, sortToPersist);
  }, [
    visibleColumns,
    internalSort,
    controlledSort,
    storageKey,
    serverSide,
    prefsReady,
    sortHydrated,
    persistPreferences,
  ]);

  const setVisibleColumns = useCallback(
    (nextColumns) => {
      setVisibleColumnsState((current) => {
        const next = normalizeVisibleColumns(nextColumns, availableColumns, fallbackVisible);
        return next.length > 0 ? next : current;
      });
    },
    [availableColumns, fallbackVisible]
  );

  const toggleColumn = useCallback(
    (column) => {
      setVisibleColumnsState((current) => {
        const isVisible = current.includes(column);
        const nextRaw = isVisible
          ? current.filter((name) => name !== column)
          : [...current, column];
        if (nextRaw.length === 0) return current;
        return normalizeVisibleColumns(nextRaw, availableColumns, fallbackVisible);
      });
    },
    [availableColumns, fallbackVisible]
  );

  const markSortTouched = useCallback(() => {
    userTouchedSortRef.current = true;
    pendingHydratedSortRef.current = null;
  }, []);

  const toggleSort = useCallback(
    (column) => {
      markSortTouched();
      const nextSort = computeNextSort(sort, column);
      if (serverSide) {
        onSortChange?.(nextSort);
        return;
      }
      setInternalSort(nextSort);
    },
    [markSortTouched, onSortChange, serverSide, sort]
  );

  const resetColumns = useCallback(() => {
    setVisibleColumnsState(fallbackVisible);
    markSortTouched();
    if (serverSide) {
      onSortChange?.({ column: null, direction: null });
      return;
    }
    setInternalSort({ column: null, direction: null });
  }, [fallbackVisible, markSortTouched, onSortChange, serverSide]);

  const sortedRows = useMemo(() => {
    if (serverSide) {
      return rows;
    }
    return sortRows(rows, sort);
  }, [rows, sort, serverSide]);

  const resolvedVisible =
    visibleColumns.length > 0
      ? visibleColumns.filter((column) => availableColumns.includes(column))
      : fallbackVisible;

  return {
    availableColumns,
    visibleColumns: resolvedVisible,
    sortedRows,
    sort,
    toggleSort,
    toggleColumn,
    setVisibleColumns,
    resetColumns,
  };
}
