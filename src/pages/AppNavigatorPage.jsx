import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplications } from "../api/dictionaryApi";
import { useAuth } from "../context/AuthContext";

function AppNavigatorPage() {
  const { isAdmin, canAccessApp } = useAuth();
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

  const visibleApps = applications.filter((app) => canAccessApp(app.name));

  return (
    <section className="panel">
      <h1>TwitApps Home</h1>
      <p className="subtext">Choose an application workspace.</p>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {visibleApps.map((application) => (
          <Link key={application.id} className="card" to={`/app/${application.name}`}>
            <h2>{application.title}</h2>
            <p>{application.description || `Open ${application.title}`}</p>
          </Link>
        ))}
        {isAdmin && (
          <Link className="card" to="/admin">
            <h2>Admin</h2>
            <p>Manage applications, tables, fields, and users.</p>
          </Link>
        )}
      </div>
      {visibleApps.length === 0 && !error && (
        <p className="subtext">You have no application access. Contact an administrator.</p>
      )}
    </section>
  );
}

export default AppNavigatorPage;
