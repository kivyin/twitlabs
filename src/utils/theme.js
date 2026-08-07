export const THEME_STORAGE_KEY = "twitlabs-theme";
export const THEME_OPTIONS = ["light", "dark", "lcars", "studiotwitty", "system"];

/** Older installs may still have the pre-rename id stored. */
function normalizeThemePreference(value) {
  if (value === "ironman") return "studiotwitty";
  return value;
}

export function getStoredTheme() {
  try {
    const stored = normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
    return THEME_OPTIONS.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference = getStoredTheme()) {
  const normalized = normalizeThemePreference(preference);
  if (normalized === "lcars") {
    return "lcars";
  }
  if (normalized === "studiotwitty") {
    return "studiotwitty";
  }
  if (normalized === "dark") {
    return "dark";
  }
  if (normalized === "light") {
    return "light";
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(preference = getStoredTheme()) {
  if (typeof document === "undefined") {
    return resolveTheme(preference);
  }

  const normalized = normalizeThemePreference(preference);
  const resolved = resolveTheme(normalized);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePreference = normalized;
  root.style.colorScheme = resolved === "light" ? "light" : "dark";

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    if (resolved === "lcars") {
      metaTheme.content = "#d2a679";
    } else if (resolved === "studiotwitty") {
      metaTheme.content = "#041820";
    } else if (resolved === "dark") {
      metaTheme.content = "#111827";
    } else {
      metaTheme.content = "#2563eb";
    }
  }

  return resolved;
}

export function getThemeLabel(preference) {
  const normalized = normalizeThemePreference(preference);
  if (normalized === "lcars") return "LCARS";
  if (normalized === "studiotwitty") return "StudioTwitty";
  if (normalized === "dark") return "Dark";
  if (normalized === "light") return "Light";
  return "System";
}

export function getNextTheme(preference) {
  const normalized = normalizeThemePreference(preference);
  const index = THEME_OPTIONS.indexOf(normalized);
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
}

export function isLcarsTheme(preferenceOrResolved) {
  return preferenceOrResolved === "lcars";
}

export function isStudioTwittyTheme(preferenceOrResolved) {
  return normalizeThemePreference(preferenceOrResolved) === "studiotwitty";
}

/** @deprecated Use isStudioTwittyTheme */
export function isIronmanTheme(preferenceOrResolved) {
  return isStudioTwittyTheme(preferenceOrResolved);
}
