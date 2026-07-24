/** Baked in at build/dev time from package.json (or VITE_APP_VERSION). */
export function getAppVersion() {
  try {
    return String(__APP_VERSION__ || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

export function getAppRepo() {
  try {
    return String(__APP_REPO__ || "kivyin/twitlabs");
  } catch {
    return "kivyin/twitlabs";
  }
}

export function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[+/]/)[0];
}

/** Compare dotted versions like 1.6, v1.6.0, 1.6.1-beta → -1 / 0 / 1 */
export function compareVersions(left, right) {
  const a = normalizeVersion(left)
    .split(".")
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const b = normalizeVersion(right)
    .split(".")
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta > 0) return 1;
    if (delta < 0) return -1;
  }
  return 0;
}

export function formatVersionLabel(value) {
  const normalized = normalizeVersion(value);
  if (!normalized) return "—";
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}
