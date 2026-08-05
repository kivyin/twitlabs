import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getApplications } from "../api/dictionaryApi";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { userHasCalendarViewOnly } from "../utils/roles";

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
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

function AppNavigatorPage() {
  const { isAdmin, canAccessApp, user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplications() {
      try {
        const result = await getApplications();
        setApplications(result);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadApplications();
  }, []);

  if (userHasCalendarViewOnly(user?.roles ?? [], isAdmin)) {
    return <Navigate to="/app/calendar" replace />;
  }

  const visibleApps = applications.filter((app) => canAccessApp(app.name));

  return (
    <>
      <PageHeader
        title="Your workspaces"
        subtitle="Choose an application to get started."
      />
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {visibleApps.map((application) => (
          <Link key={application.id} className="card" to={`/app/${application.name}`}>
            <CardArrow />
            <span className="card-icon" aria-hidden="true">
              <GridIcon />
            </span>
            <h2>{application.title}</h2>
            <p>{application.description || `Open ${application.title}`}</p>
          </Link>
        ))}
        {isAdmin && (
          <Link className="card" to="/admin">
            <CardArrow />
            <span className="card-icon" aria-hidden="true">
              <SettingsIcon />
            </span>
            <h2>Admin</h2>
            <p>Manage applications, tables, fields, and users.</p>
          </Link>
        )}
      </div>
      {visibleApps.length === 0 && !error && (
        <p className="subtext">You have no application access. Contact an administrator.</p>
      )}
    </>
  );
}

export default AppNavigatorPage;
