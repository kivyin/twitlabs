import { useAppVersionStatus } from "../hooks/useAppVersionStatus";

function VersionStatusIndicator({ compact = false }) {
  const { status, currentLabel, latestLabel, releaseUrl, repoUrl } = useAppVersionStatus();

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

  const label =
    status === "update-available"
      ? compact
        ? latestLabel
        : `${currentLabel} · Update ${latestLabel}`
      : status === "up-to-date"
        ? compact
          ? currentLabel
          : `${currentLabel} · Up to date`
        : status === "checking"
          ? compact
            ? "…"
            : "Checking version…"
          : currentLabel;

  const className = [
    "version-status",
    `version-status--${status}`,
    compact ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} title={title} aria-label={title} role="status">
      <span className="version-status-dot" aria-hidden="true" />
      <span className="version-status-label">{label}</span>
      <a
        className="version-status-repo"
        href={repoUrl}
        target="_blank"
        rel="noreferrer"
        title="Open GitHub repository"
        aria-label="Open GitHub repository"
      >
        {compact ? "GH" : "Repo"}
      </a>
      {status === "update-available" && releaseUrl ? (
        <a
          className="version-status-release"
          href={releaseUrl}
          target="_blank"
          rel="noreferrer"
          title={`Open release ${latestLabel}`}
          aria-label={`Open release ${latestLabel}`}
        >
          {compact ? "↑" : "Release"}
        </a>
      ) : null}
    </div>
  );
}

export default VersionStatusIndicator;
