/** Session-backed browse stack helpers (ServiceNow-style navigation memory). */

export const BROWSE_STACK_STORAGE_KEY = "twitlabs.browseStack";
export const BROWSE_STACK_NAV_KEY = "__browseStackNav";
export const MAX_BROWSE_STACK = 40;

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
  } catch {
    // ignore
  }
}
