import { useBranding } from "../context/BrandingContext";
import { useTheme } from "../context/ThemeContext";

export function BrandMark({ size = 18 }) {
  const { resolvedTheme } = useTheme();

  if (resolvedTheme === "lcars") {
    return (
      <span className="brand-mark brand-mark-lcars" aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="4" rx="2" fill="#ff9900" />
          <rect x="3" y="10" width="12" height="4" rx="2" fill="#cc99cc" />
          <rect x="3" y="16" width="16" height="4" rx="2" fill="#99ccff" />
        </svg>
      </span>
    );
  }

  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function AppBrandText({ showShip = true, compact = false }) {
  const { appName, shipName } = useBranding();
  const { resolvedTheme } = useTheme();

  if (compact) {
    return null;
  }

  return (
    <span className="app-brand-text">
      {resolvedTheme === "lcars" && shipName && showShip ? (
        <>
          <span className="app-brand-ship sidebar-label">{shipName}</span>
          <span className="app-brand-app subtext sidebar-label">{appName}</span>
        </>
      ) : (
        <>
          <span className="app-brand-app sidebar-label">{appName}</span>
          {showShip && shipName && (
            <span className="app-brand-ship subtext sidebar-label">{shipName}</span>
          )}
        </>
      )}
    </span>
  );
}
