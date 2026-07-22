/** Build labels and a reverse-chronological unique history list for the sidebar. */

function pathnameOf(path) {
  if (typeof path !== "string") return "";
  return path.split("?")[0].split("#")[0] || "";
}

function humanizeSegment(segment) {
  if (!segment) return "";
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Prefer favorite label, then longest matching nav item, then a short path label.
 */
export function getSidebarHistoryLabel(path, { favorites = [], navItems = [] } = {}) {
  const pathname = pathnameOf(path);

  const favorite = favorites.find(
    (entry) => entry.path === path || pathnameOf(entry.path) === pathname
  );
  if (favorite?.label) {
    return favorite.label;
  }

  if (pathname === "/" || pathname === "") {
    return "Home";
  }
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return "Documentation";
  }

  let bestNav = null;
  for (const item of navItems) {
    const itemPath = pathnameOf(item.path);
    if (!itemPath) continue;
    if (pathname === itemPath || pathname.startsWith(`${itemPath}/`)) {
      if (!bestNav || itemPath.length > pathnameOf(bestNav.path).length) {
        bestNav = item;
      }
    }
  }

  if (bestNav?.label) {
    const rest = pathname.slice(pathnameOf(bestNav.path).length);
    if (/\/new\/?$/.test(rest)) {
      return `${bestNav.label} · New`;
    }
    if (/\/\d+\/edit\/?$/.test(rest)) {
      return `${bestNav.label} · Edit`;
    }
    if (rest && rest !== "/") {
      const tail = rest.split("/").filter(Boolean).slice(-1)[0];
      return `${bestNav.label} · ${humanizeSegment(tail)}`;
    }
    return bestNav.label;
  }

  const parts = pathname.split("/").filter(Boolean).slice(-2).map(humanizeSegment);
  return parts.join(" / ") || path;
}

/**
 * Newest-first unique history entries, excluding the current location.
 */
export function buildSidebarHistoryEntries(stack = [], currentPath = "") {
  const current = typeof currentPath === "string" ? currentPath : "";
  const seen = new Set();
  const entries = [];

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const path = stack[index];
    if (!path || path === current || seen.has(path)) {
      continue;
    }
    seen.add(path);
    entries.push(path);
  }

  return entries;
}
