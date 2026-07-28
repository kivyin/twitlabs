import { useTheme } from "../context/ThemeContext";
import { THEME_OPTIONS, getThemeLabel } from "../utils/theme";

function Icon({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ThemeIcon({ preference, resolvedTheme }) {
  if (preference === "lcars" || resolvedTheme === "lcars") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.95" />
        <rect x="2" y="10.5" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.75" />
        <rect x="2" y="16" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }

  if (preference === "system") {
    return (
      <Icon>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </Icon>
    );
  }

  if (resolvedTheme === "dark") {
    return (
      <Icon>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </Icon>
    );
  }

  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Icon>
  );
}

/** Theme preference dropdown (user menu and auth). */
export function ThemePreferenceSelect({ id = "theme-preference", className = "" }) {
  const { preference, setPreference } = useTheme();

  return (
    <label className={`theme-preference-field${className ? ` ${className}` : ""}`} htmlFor={id}>
      <span className="theme-preference-label">Theme</span>
      <select
        id={id}
        className="theme-preference-select"
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
        aria-label="Theme"
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {getThemeLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Standalone theme control for login / surfaces without a user menu.
 */
function ThemeToggle({ className = "theme-toggle" }) {
  const { preference, resolvedTheme } = useTheme();

  return (
    <div className={`theme-toggle-menu${className ? ` ${className}` : ""}`}>
      <ThemeIcon preference={preference} resolvedTheme={resolvedTheme} />
      <ThemePreferenceSelect id="auth-theme-preference" className="theme-preference-field--inline" />
    </div>
  );
}

export default ThemeToggle;
