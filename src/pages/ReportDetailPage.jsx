import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDashboardReports } from "../api/dashboardApi";
import CustomSqlReport from "../dashboard/reports/CustomSqlReport";
import PageHeader from "../components/PageHeader";
import { getBuiltinReport, parseReportRouteKey } from "../dashboard/reportRegistry";

function ReportDetailPage() {
  const { appName = "budget", reportKey } = useParams();
  const parsed = parseReportRouteKey(reportKey);
  const [customReport, setCustomReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(parsed.source === "custom");

  const builtinReport = parsed.source === "builtin" ? getBuiltinReport(appName, parsed.id) : null;

  useEffect(() => {
    if (parsed.source !== "custom") {
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    getDashboardReports(appName)
      .then((reports) => {
        if (!active) return;
        const report = reports.find((entry) => entry.id === parsed.id) ?? null;
        if (!report) {
          setError("Custom report not found.");
        }
        setCustomReport(report);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appName, parsed.id, parsed.source]);

  const title = builtinReport?.title ?? customReport?.name ?? "Report";
  const description = builtinReport?.description ?? customReport?.description ?? "";

  let content = null;
  if (parsed.source === "builtin") {
    if (!builtinReport) {
      content = <p className="error">Report not found.</p>;
    } else {
      const ReportComponent = builtinReport.component;
      content = <ReportComponent appName={appName} fullPage />;
    }
  } else if (loading) {
    content = <p className="subtext">Loading report...</p>;
  } else if (error) {
    content = <p className="error">{error}</p>;
  } else if (customReport) {
    content = <CustomSqlReport report={customReport} fullPage />;
  } else {
    content = <p className="error">Report not found.</p>;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Report Center", to: `/app/${appName}/reports` },
          { label: title },
        ]}
        title={title}
        subtitle={description}
        actions={
          <Link to={`/app/${appName}/reports`} className="button-primary">
            All reports
          </Link>
        }
      />

      <section className="panel report-detail-panel">{content}</section>
    </>
  );
}

export default ReportDetailPage;
