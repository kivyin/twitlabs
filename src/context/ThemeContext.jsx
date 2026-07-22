import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  getNextTheme,
  getStoredTheme,
  getThemeLabel,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "../utils/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(getStoredTheme()));

  const setPreference = useCallback((nextPreference) => {
    setPreferenceState(nextPreference);
    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setResolvedTheme(applyTheme(nextPreference));
  }, []);

  const cycleTheme = useCallback(() => {
    setPreference(getNextTheme(preference));
  }, [preference, setPreference]);

  useEffect(() => {
    setResolvedTheme(applyTheme(preference));
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setResolvedTheme(applyTheme("system"));
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      themeLabel: getThemeLabel(preference),
      setPreference,
      cycleTheme,
    }),
    [preference, resolvedTheme, setPreference, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
