import { Link } from "react-router-dom";

function ErrorPage({
  title = "Something went wrong",
  message,
  error,
  status,
  onRetry,
  showHomeLink = true,
}) {
  const displayMessage =
    message ||
    error?.message ||
    "An unexpected error occurred while loading this page.";

  const isDev = import.meta.env.DEV;
  const details = error?.stack || (typeof error === "string" ? error : null);

  return (
    <section className="panel error-page">
      {status && <p className="error-page-status">{status}</p>}
      <h1>{title}</h1>
      <p className="error-page-message">{displayMessage}</p>

      <div className="error-page-actions">
        {onRetry && (
          <button type="button" className="button-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {showHomeLink && (
          <Link to="/" className={onRetry ? undefined : "button-primary"}>
            Go to home
          </Link>
        )}
      </div>

      {isDev && details && (
        <details className="error-page-details">
          <summary>Technical details</summary>
          <pre>{details}</pre>
        </details>
      )}
    </section>
  );
}

export default ErrorPage;
