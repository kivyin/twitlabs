/** Module-level FK label maps keyed by referenced table. Survives route changes. */
const labelCache = new Map();
const inFlight = new Map();
const listeners = new Set();
let cacheVersion = 0;

function notifyListeners(refTable) {
  cacheVersion += 1;
  listeners.forEach((listener) => {
    try {
      listener(cacheVersion, refTable ?? null);
    } catch {
      // Ignore subscriber errors.
    }
  });
}

export function subscribeForeignKeyLabelCache(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getForeignKeyLabelCacheVersion() {
  return cacheVersion;
}

export function getCachedForeignKeyLabelMap(refTable) {
  return labelCache.has(refTable) ? labelCache.get(refTable) : null;
}

export function setCachedForeignKeyLabelMap(refTable, labelMap) {
  labelCache.set(refTable, labelMap);
}

export function getInFlightForeignKeyLabelFetch(refTable) {
  return inFlight.get(refTable) ?? null;
}

export function setInFlightForeignKeyLabelFetch(refTable, promise) {
  inFlight.set(refTable, promise);
}

export function clearInFlightForeignKeyLabelFetch(refTable) {
  inFlight.delete(refTable);
}

export function invalidateForeignKeyLabelCache(refTable) {
  if (refTable) {
    labelCache.delete(refTable);
    inFlight.delete(refTable);
  } else {
    labelCache.clear();
    inFlight.clear();
  }
  notifyListeners(refTable);
}
