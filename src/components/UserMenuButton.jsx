import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTroublehubStatus,
  listTroublehubNotifications,
  markAllTroublehubNotificationsRead,
  markTroublehubNotificationRead,
} from "../api/troublehubApi";
import { useAuth } from "../context/AuthContext";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useTheme } from "../context/ThemeContext";
import { useLcarsEffects } from "../hooks/useLcarsEffects";
import { HISTORY_LIMIT_OPTIONS } from "../utils/browseStack";
import { ThemePreferenceSelect } from "./ThemeToggle";

export function HistoryLimitSelect({ id = "history-limit-preference", className = "" }) {
  const { historyLimit, setHistoryLimit } = useBrowseStack();

  return (
    <label className={`theme-preference-field${className ? ` ${className}` : ""}`} htmlFor={id}>
      <span className="theme-preference-label">History size</span>
      <select
        id={id}
        className="theme-preference-select"
        value={historyLimit}
        onChange={(event) => setHistoryLimit(Number(event.target.value))}
        aria-label="Browse history size"
      >
        {HISTORY_LIMIT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            Last {option} pages
          </option>
        ))}
      </select>
    </label>
  );
}

function PreferenceToggle({ id, label, checked, onChange }) {
  return (
    <label className="theme-preference-toggle" htmlFor={id}>
      <span className="theme-preference-label">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        className={`theme-preference-switch${checked ? " is-on" : ""}`}
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span className="theme-preference-switch-thumb" aria-hidden="true" />
      </button>
    </label>
  );
}

function LcarsEffectsToggles() {
  const { navPulseEnabled, progressLightEnabled, setNavPulseEnabled, setProgressLightEnabled } =
    useLcarsEffects();

  return (
    <>
      <PreferenceToggle
        id="user-menu-lcars-nav-pulse"
        label="Nav pulse"
        checked={navPulseEnabled}
        onChange={setNavPulseEnabled}
      />
      <PreferenceToggle
        id="user-menu-lcars-progress-light"
        label="Progress lights"
        checked={progressLightEnabled}
        onChange={setProgressLightEnabled}
      />
    </>
  );
}

/**
 * Logged-in user control with preferences (theme) and Sign out.
 */
function UserMenuButton({ displayName = "", onSignOut, className = "", compact = false }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const { canAccessApp } = useAuth();
  const isLcars = resolvedTheme === "lcars";
  const hasTroublehub = canAccessApp("troublehub");
  const name = String(displayName || "").trim() || "User";
  const initial = name.charAt(0).toUpperCase() || "?";
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!hasTroublehub) {
      setUnreadCount(0);
      setNotifications([]);
      return undefined;
    }
    let active = true;
    const refresh = () => {
      getTroublehubStatus()
        .then((payload) => {
          if (active) setUnreadCount(Number(payload.unread_notifications) || 0);
        })
        .catch(() => {
          if (active) setUnreadCount(0);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [hasTroublehub]);

  useEffect(() => {
    if (!open || !hasTroublehub) return undefined;
    let active = true;
    listTroublehubNotifications()
      .then((payload) => {
        if (!active) return;
        setNotifications(payload.notifications || []);
        setUnreadCount(Number(payload.unread_count) || 0);
      })
      .catch(() => {
        if (active) setNotifications([]);
      });
    return () => {
      active = false;
    };
  }, [open, hasTroublehub]);

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
        <span className="user-menu-name">
          {name}
          {unreadCount > 0 ? (
            <span className="user-menu-badge" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-section" onClick={(event) => event.stopPropagation()}>
            <ThemePreferenceSelect id="user-menu-theme-preference" />
            <HistoryLimitSelect id="user-menu-history-limit" />
            {isLcars ? <LcarsEffectsToggles /> : null}
          </div>

          {hasTroublehub ? (
            <>
              <div className="user-menu-divider" role="separator" />
              <div className="user-menu-section">
                <p className="user-menu-section-label">TroubleHub</p>
                <Link
                  role="menuitem"
                  className="user-menu-item"
                  to="/app/troublehub/match"
                  onClick={() => setOpen(false)}
                >
                  Match Mischief — start questions
                </Link>
                {notifications.filter((item) => !item.is_read).length > 0 ? (
                  <div className="user-menu-notifications">
                    {notifications
                      .filter((item) => !item.is_read)
                      .slice(0, 5)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="user-menu-item user-menu-notification"
                          onClick={async () => {
                            try {
                              await markTroublehubNotificationRead(item.id);
                              setNotifications((prev) =>
                                prev.map((row) =>
                                  row.id === item.id ? { ...row, is_read: true } : row
                                )
                              );
                              setUnreadCount((count) => Math.max(0, count - 1));
                            } catch {
                              // ignore
                            }
                            setOpen(false);
                            if (item.link_path) {
                              window.location.assign(item.link_path);
                            }
                          }}
                        >
                          <strong>{item.title}</strong>
                          {item.message ? <span className="stat-meta">{item.message}</span> : null}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="user-menu-item"
                      onClick={async () => {
                        try {
                          await markAllTroublehubNotificationsRead();
                          setUnreadCount(0);
                          setNotifications((prev) =>
                            prev.map((row) => ({ ...row, is_read: true }))
                          );
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

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
