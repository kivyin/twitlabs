import { useEffect, useRef, useState } from "react";
import { ThemePreferenceSelect } from "./ThemeToggle";

/**
 * Logged-in user control with preferences (theme) and Sign out.
 */
function UserMenuButton({ displayName = "", onSignOut, className = "", compact = false }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const name = String(displayName || "").trim() || "User";
  const initial = name.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className={`user-menu${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`user-menu-trigger${open ? " active" : ""}`}
        aria-label={`${name} account menu`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={name}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="nav-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu-name">{name}</span>
      </button>
      {open ? (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-section" onClick={(event) => event.stopPropagation()}>
            <ThemePreferenceSelect id="user-menu-theme-preference" />
          </div>
          <div className="user-menu-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default UserMenuButton;
