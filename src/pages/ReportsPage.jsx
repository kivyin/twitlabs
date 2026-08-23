import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApplications } from "../api/dictionaryApi";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { hasReportCenter } from "../dashboard/reportRegistry";

function ReportsPage() {
  const { canAccessApp } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getApplications()
      .then((items) => {
        if (!active) return;
        setApplications(items);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const reportableApps = useMemo(
    () =>
      applications.filter(
        (application) =>
          Number(application.is_enabled) !== 0 &&
          application.name !== "troublehub" &&
          hasReportCenter(application.name) &&
          canAccessApp(application.name)
      ),
    [applications, canAccessApp]
  );

  const effectiveSelectedApp = reportableApps.some(
    (application) => application.name === selectedApp
  )
    ? selectedApp
    : reportableApps[0]?.name || "";
  const selected = reportableApps.find(
    (application) => application.name === effectiveSelectedApp
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Reports" }]}
        title="Reports"
        subtitle="Explore and build reports across the applications you can access."
        favorite={false}
      />

      {error && <p className="error">{error}</p>}

      <div className="reports-hub">
        {reportableApps.length > 0 ? (
          <>
            <section className="panel reports-hub-picker">
              <label htmlFor="reports-application">Application</label>
              <select
                id="reports-application"
                value={effectiveSelectedApp}
                onChange={(event) => setSelectedApp(event.target.value)}
              >
                {reportableApps.map((application) => (
                  <option key={application.id} value={application.name}>
                    {application.title}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="subtext">
                  {selected.description || `Open reporting tools for ${selected.title}.`}
                </p>
              )}
              <div className="reports-hub-actions">
                <Link className="button-primary" to={`/app/${effectiveSelectedApp}/reports`}>
                  Open report center
                </Link>
                <Link to={`/app/${effectiveSelectedApp}/reports/new`}>Build a report</Link>
              </div>
            </section>

            <section className="reports-hub-grid" aria-label="Reportable applications">
              {reportableApps.map((application) => (
                <article
                  key={application.id}
                  className={`panel reports-hub-card${
                    application.name === effectiveSelectedApp ? " selected" : ""
                  }`}
                >
                  <h2>{application.title}</h2>
                  <p>{application.description || "Application reports and saved data views."}</p>
                  <div className="reports-hub-card-actions">
                    <Link to={`/app/${application.name}/reports`}>Report Center</Link>
                    <Link to={`/app/${application.name}/reports/new`}>New report</Link>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <section className="panel empty-state">
            <p className="subtext">
              You do not currently have access to an enabled application that supports reports.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

export default ReportsPage;
