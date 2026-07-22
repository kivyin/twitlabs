import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollectionDefinitions } from "../api/dictionaryApi";
import Dashboard from "../dashboard/Dashboard";
import { hasDashboard } from "../dashboard/reportRegistry";
import PageHeader from "../components/PageHeader";

const INTERNAL_TABLES = new Set([
  "system_dictionary",
  "schema_migrations",
  "applications",
  "users",
  "user_roles",
  "system_deletes",
  "system_logs",
  "system_navigation",
  "dashboard_reports",
  "dashboards",
  "dashboard_layout_items",
  "user_favorites",
  "user_preferences",
  "transaction_splits",
  "transaction_attachments",
  "net_worth_snapshots",
  "task_subtasks",
  "task_tag_links",
  "pomodoro_sessions",
]);

function TableIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M12 3v18" />
    </svg>
  );
}

function CardArrow() {
  return (
    <svg
      className="card-arrow"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function BudgetHomePage() {
  const { appName = "budget" } = useParams();
  const [tables, setTables] = useState([]);
  const [appTitle, setAppTitle] = useState("Application");
  const [error, setError] = useState("");
  const showDashboard = hasDashboard(appName);

  useEffect(() => {
    async function loadTables() {
      try {
        const list = await getCollectionDefinitions(appName);
        setTables(list);
        setAppTitle(list[0]?.application_title || appName);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadTables();
  }, [appName]);

  const visibleTables = tables.filter((table) => !INTERNAL_TABLES.has(table.name));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: appTitle }]}
        title={appTitle}
        subtitle={
          showDashboard
            ? "Your dashboard and data tables in one place."
            : "Select a table to view and manage its records."
        }
      />
      {error && <p className="error">{error}</p>}

      {showDashboard && <Dashboard application={appName} />}

      {visibleTables.length === 0 && !error ? (
        <section className="panel empty-state">
          <p className="subtext">No tables are available for this application yet.</p>
        </section>
      ) : (
        visibleTables.length > 0 && (
          <section className={showDashboard ? "dashboard-tables-section" : undefined}>
            {showDashboard && (
              <div className="dashboard-section-head">
                <h2>Data tables</h2>
                <p className="subtext">Browse and manage underlying records.</p>
              </div>
            )}
            <div className="grid">
              {visibleTables.map((table) => (
                <Link
                  key={table.name}
                  className="card"
                  to={`/app/${appName}/${table.name}`}
                  title={table.name}
                >
                  <CardArrow />
                  <span className="card-icon" aria-hidden="true">
                    <TableIcon />
                  </span>
                  <h2>{table.label}</h2>
                  <p>Open {table.label} records</p>
                </Link>
              ))}
            </div>
          </section>
        )
      )}
    </>
  );
}

export default BudgetHomePage;
