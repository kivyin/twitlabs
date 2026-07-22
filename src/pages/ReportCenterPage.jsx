import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteDashboardReport, getDashboardReports } from "../api/dashboardApi";
import ConfirmModal from "../components/common/ConfirmModal";
import PageHeader from "../components/PageHeader";
import ReportBuilderModal from "../dashboard/ReportBuilderModal";
import {
  buildCustomReportPath,
  getReportsByCategory,
  hasReportCenter,
} from "../dashboard/reportRegistry";

function ReportCenterPage() {
  const { appName = "budget" } = useParams();
  const [customReports, setCustomReports] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteReport = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await deleteDashboardReport(deleteTarget.id);
      setCustomReports((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let active = true;

    getDashboardReports(appName)
      .then((reports) => {
        if (active) setCustomReports(reports);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [appName]);

  if (!hasReportCenter(appName)) {
    return (
      <section className="panel empty-state">
        <p className="subtext">Reports are not available for this application.</p>
      </section>
    );
  }

  const groupedReports = getReportsByCategory(appName);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Report Center" },
        ]}
        title="Report Center"
        subtitle="Browse built-in financial reports, tax summaries, and your custom SQL reports."
        actions={
          <>
            <button type="button" onClick={() => setBuilderOpen(true)}>
              Build custom report
            </button>
            <Link className="button-primary" to={`/app/${appName}`}>
              Back to dashboard
            </Link>
          </>
        }
      />

      {error && <p className="error">{error}</p>}

      <div className="report-center-page">
        {groupedReports.map((group) => (
          <section key={group.id} className="report-center-section panel">
            <div className="report-center-section-head">
              <h2>{group.label}</h2>
            </div>
            <div className="report-center-grid">
              {group.reports.map((report) => (
                <Link
                  key={report.id}
                  className="report-center-card"
                  to={`/app/${appName}/reports/${report.id}`}
                >
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                  <span className="report-center-card-link">Open report</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="report-center-section panel">
          <div className="report-center-section-head">
            <h2>Custom SQL</h2>
            <button type="button" className="linkish-button" onClick={() => setBuilderOpen(true)}>
              Build new report
            </button>
          </div>
          {customReports.length === 0 ? (
            <p className="subtext">No custom SQL reports saved yet.</p>
          ) : (
            <div className="report-center-grid">
              {customReports.map((report) => (
                <div key={report.id} className="report-center-card report-center-card-custom">
                  <Link
                    className="report-center-card-body"
                    to={`/app/${appName}/reports/${buildCustomReportPath(report.id)}`}
                  >
                    <h3>{report.name}</h3>
                    <p>{report.description || `${report.widget_kind} report`}</p>
                    <span className="report-center-card-link">Open report</span>
                  </Link>
                  <div className="report-center-card-actions">
                    <button
                      type="button"
                      className="linkish-button"
                      onClick={() => setEditingReport(report)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="linkish-button danger"
                      onClick={() => setDeleteTarget(report)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {builderOpen && (
        <ReportBuilderModal
          application={appName}
          onClose={() => setBuilderOpen(false)}
          onCreated={(report) => {
            setCustomReports((current) => [...current, report]);
            setBuilderOpen(false);
          }}
        />
      )}

      {editingReport && (
        <ReportBuilderModal
          application={appName}
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSaved={(report) => {
            setCustomReports((current) =>
              current.map((entry) => (entry.id === report.id ? { ...entry, ...report } : entry))
            );
            setEditingReport(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete custom report?"
          message={`Delete custom report "${deleteTarget.name}"?`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          busy={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteReport}
        />
      )}
    </>
  );
}

export default ReportCenterPage;
