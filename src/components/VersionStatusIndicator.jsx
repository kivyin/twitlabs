import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppVersionStatus } from "../hooks/useAppVersionStatus";

/**
 * Header version control: status trigger + dropdown (Repo, Notes, Check for updates).
 */
function VersionStatusIndicator({ className = "" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { status, currentLabel, latestLabel, releaseUrl, repoUrl, refresh } =
    useAppVersionStatus();

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

  const title =
    status === "update-available"
      ? `Update available: ${latestLabel} (running ${currentLabel})`
      : status === "up-to-date"
        ? `${currentLabel} is up to date`
        : status === "checking"
          ? "Checking for updates…"
          : status === "error"
            ? `Could not check for updates (running ${currentLabel})`
            : `Version ${currentLabel}`;

  const triggerLabel =
    status === "update-available"
      ? `${currentLabel} ↑`
      : status === "checking"
        ? "…"
        : currentLabel;

  const rootClass = [
    "version-menu",
    `version-menu--${status}`,
    open ? "is-open" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        type="button"
        className={`version-menu-trigger${open ? " active" : ""}`}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="menu"
        title={title}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="version-status-dot" aria-hidden="true" />
        <span className="version-menu-label">{triggerLabel}</span>
        <span className="version-menu-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="version-menu-popover" role="menu">
          <a
            className="user-menu-item version-menu-item"
            role="menuitem"
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Repo
          </a>
          <Link
            className="user-menu-item version-menu-item"
            role="menuitem"
            to="/versions"
            onClick={() => setOpen(false)}
          >
            Notes
          </Link>
          {status === "update-available" && releaseUrl ? (
            <a
              className="user-menu-item version-menu-item"
              role="menuitem"
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              Release {latestLabel}
            </a>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="user-menu-item version-menu-item"
            disabled={status === "checking"}
            onClick={async () => {
              await refresh({ force: true });
            }}
          >
            {status === "checking" ? "Checking…" : "Check for updates"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default VersionStatusIndicator;
