import { Link, useLocation } from "react-router-dom";

function AccessDeniedPage() {
  const location = useLocation();
  const state = location.state || {};
  const attempted =
    state.from ||
    (typeof state.path === "string" ? state.path : "") ||
    "";
  const reason =
    state.message ||
    "You do not have permission to view this page or access that data.";

  return (
    <section className="panel error-page access-denied-page" aria-labelledby="access-denied-title">
      <p className="error-page-status">403</p>
      <h1 id="access-denied-title">Access denied</h1>
      <p className="error-page-message">{reason}</p>
      {attempted ? (
        <p className="subtext access-denied-path">
          Requested: <code>{attempted}</code>
        </p>
      ) : null}
      <div className="error-page-actions">
        <Link to="/" className="button-primary">
          Go to home
        </Link>
        <button type="button" className="button" onClick={() => window.history.back()}>
          Go back
        </button>
      </div>
    </section>
  );
}

export default AccessDeniedPage;
