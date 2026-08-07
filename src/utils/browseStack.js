/** Session-backed browse stack helpers (ServiceNow-style navigation memory). */

export const BROWSE_STACK_STORAGE_KEY = "twitlabs.browseStack";
export const BROWSE_VISITS_STORAGE_KEY = "twitlabs.browseVisits";
export const BROWSE_HISTORY_LIMIT_KEY = "browse-history-limit";
export const BROWSE_STACK_NAV_KEY = "__browseStackNav";
export const MAX_BROWSE_STACK = 40;
export const DEFAULT_HISTORY_LIMIT = 30;
export const HISTORY_LIMIT_OPTIONS = [10, 20, 30, 50];
export const MAX_BROWSE_VISITS = 50;

export function normalizeHistoryLimit(value) {
  const n = Number(value);
  return HISTORY_LIMIT_OPTIONS.includes(n) ? n : DEFAULT_HISTORY_LIMIT;
}

export function locationToPath(location) {
  if (!location) return "";
  if (typeof location === "string") return location;
  return `${location.pathname}${location.search || ""}${location.hash || ""}`;
}

export function isSafeBrowsePath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/** Paths that should never enter the browse stack. */
export function shouldTrackBrowsePath(path) {
  if (!isSafeBrowsePath(path)) return false;
  if (path === "/login" || path.startsWith("/login?")) return false;
  return true;
}

export function loadBrowseStack() {
  try {
    const raw = sessionStorage.getItem(BROWSE_STACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSafeBrowsePath).slice(-MAX_BROWSE_STACK);
  } catch {
    return [];
  }
}

export function saveBrowseStack(stack) {
  const next = (Array.isArray(stack) ? stack : []).filter(isSafeBrowsePath).slice(-MAX_BROWSE_STACK);
  try {
    sessionStorage.setItem(BROWSE_STACK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export function clearBrowseStackStorage() {
  try {
    sessionStorage.removeItem(BROWSE_STACK_STORAGE_KEY);
    sessionStorage.removeItem(BROWSE_VISITS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadBrowseVisits(max = DEFAULT_HISTORY_LIMIT) {
  const limit = normalizeHistoryLimit(max);
  try {
    const raw = sessionStorage.getItem(BROWSE_VISITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSafeBrowsePath).slice(-limit);
  } catch {
    return [];
  }
}

export function saveBrowseVisits(visits, max = DEFAULT_HISTORY_LIMIT) {
  const limit = normalizeHistoryLimit(max);
  const next = (Array.isArray(visits) ? visits : [])
    .filter(isSafeBrowsePath)
    .slice(-limit);
  try {
    sessionStorage.setItem(BROWSE_VISITS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export function readLocalHistoryLimit(storageKey) {
  if (!storageKey) return DEFAULT_HISTORY_LIMIT;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_HISTORY_LIMIT;
    const parsed = JSON.parse(raw);
    return normalizeHistoryLimit(parsed?.limit ?? parsed);
  } catch {
    return DEFAULT_HISTORY_LIMIT;
  }
}

export function writeLocalHistoryLimit(storageKey, limit) {
  if (!storageKey) return;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ limit: normalizeHistoryLimit(limit) })
    );
  } catch {
    // ignore
  }
}
