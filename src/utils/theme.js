export const THEME_STORAGE_KEY = "twitlabs-theme";
export const THEME_OPTIONS = ["light", "dark", "lcars", "system"];

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference = getStoredTheme()) {
  if (preference === "lcars") {
    return "lcars";
  }
  if (preference === "dark") {
    return "dark";
  }
  if (preference === "light") {
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

  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved === "light" ? "light" : "dark";

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    if (resolved === "lcars") {
      metaTheme.content = "#d2a679";
    } else if (resolved === "dark") {
      metaTheme.content = "#111827";
    } else {
      metaTheme.content = "#2563eb";
    }
  }

  return resolved;
}

export function getThemeLabel(preference) {
  if (preference === "lcars") return "LCARS";
  if (preference === "dark") return "Dark";
  if (preference === "light") return "Light";
  return "System";
}

export function getNextTheme(preference) {
  const index = THEME_OPTIONS.indexOf(preference);
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
}

export function isLcarsTheme(preferenceOrResolved) {
  return preferenceOrResolved === "lcars";
}
