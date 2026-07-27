import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { getChangelog } from "../content/changelog";
import { formatVersionLabel, getAppRepo, getAppVersion } from "../utils/appVersion";
import { useAppVersionStatus } from "../hooks/useAppVersionStatus";

function VersionsPage() {
  const releases = getChangelog();
  const current = getAppVersion();
  const currentLabel = formatVersionLabel(current);
  const repo = getAppRepo();
  const repoUrl = `https://github.com/${repo}`;
  const { status, latestLabel, releaseUrl } = useAppVersionStatus();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Versions" }]}
        title="Versions"
        subtitle="What changed in each release. This page is maintained in the app; update it when you ship."
        help={false}
      />

      <section className="panel versions-summary">
        <div className="versions-summary-row">
          <div>
            <span className="register-summary-label">Running</span>
            <strong>{currentLabel}</strong>
          </div>
          <div>
            <span className="register-summary-label">Update status</span>
            <strong>
              {status === "update-available"
                ? `Update available · ${latestLabel}`
                : status === "up-to-date"
                  ? "Up to date"
                  : status === "checking"
                    ? "Checking…"
                    : "Unknown"}
            </strong>
          </div>
          <div className="versions-summary-actions">
            <Link className="button" to="/">
              Home
            </Link>
            <a className="button" href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            {status === "update-available" && releaseUrl ? (
              <a className="button-primary" href={releaseUrl} target="_blank" rel="noreferrer">
                Latest release
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="versions-timeline" aria-label="Release history">
        {releases.map((release, index) => {
          const isCurrent = release.version === String(current).replace(/^v/i, "");
          const isLatest = index === 0;
          return (
            <article
              key={release.version}
              className={[
                "panel versions-release",
                isCurrent ? "is-current" : "",
                isLatest ? "is-latest" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id={`v${release.version}`}
            >
              <header className="versions-release-head">
                <div>
                  <p className="versions-release-kicker">
                    {isCurrent ? "Current" : isLatest ? "Latest notes" : "Earlier"}
                    {release.date ? ` · ${release.date}` : ""}
                  </p>
                  <h2>
                    {formatVersionLabel(release.version)}
                    {release.title ? ` — ${release.title}` : ""}
                  </h2>
                </div>
                <a
                  className="button"
                  href={`https://github.com/${repo}/releases/tag/${release.version}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub tag
                </a>
              </header>
              <ul className="versions-highlights">
                {release.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>
    </>
  );
}

export default VersionsPage;
