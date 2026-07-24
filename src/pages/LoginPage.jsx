import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/authApi";
import { AppBrandText, BrandMark } from "../components/AppBrand";
import { formatLcarsClock } from "../components/LcarsShellChrome";
import StarfleetDelta from "../components/StarfleetDelta";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function resolvePostLoginPath(from) {
  if (typeof from !== "string") return "/";
  const path = from.trim();
  // Only allow same-app relative paths (block open redirects).
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/login")) {
    return "/";
  }
  return path;
}

function FederationAuthClock() {
  const [clock, setClock] = useState(() => formatLcarsClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatLcarsClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="federation-auth-clock" aria-live="polite">
      <span>
        <small>Star Date</small>
        {clock.stardate}
      </span>
      <span>
        <small>Star Time</small>
        {clock.startime}
      </span>
      <span>
        <small>Earth Date</small>
        {clock.date}
      </span>
      <span>
        <small>Earth Time</small>
        {clock.time}
      </span>
    </div>
  );
}

function LoginPage() {
  const { user, loading: authLoading, login, authMessage, clearAuthMessage } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLcars = resolvedTheme === "lcars";

  const hidePassword = () => setPasswordVisible(false);
  const showPasswordWhileHeld = (event) => {
    // Hold-to-preview only; ignore keyboard activation so it doesn't stick visible.
    if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
      event.preventDefault();
      setPasswordVisible(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const redirectTo = resolvePostLoginPath(location.state?.from);

  if (!authLoading && user && !user.must_change_password) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    clearAuthMessage();
    setLoading(true);
    try {
      const { token, user: nextUser } = await apiLogin(username, password);
      login(token, nextUser);
      navigate(resolvePostLoginPath(location.state?.from), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (
    <div className="password-field-wrap">
      <input
        type={passwordVisible ? "text" : "password"}
        value={password}
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="button"
        className="password-reveal-button is-icon"
        aria-label="Hold to preview password"
        title="Hold to preview"
        onPointerDown={showPasswordWhileHeld}
        onPointerUp={hidePassword}
        onPointerCancel={hidePassword}
        onPointerLeave={hidePassword}
        onBlur={hidePassword}
        onContextMenu={(event) => event.preventDefault()}
      >
        {passwordVisible ? (
          <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Eye size={18} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  );

  if (isLcars) {
    return (
      <main className="auth-shell federation-auth-shell">
        <div className="auth-shell-controls">
          <ThemeToggle className="auth-theme-toggle" />
        </div>

        <div className="federation-auth-frame">
          <header className="federation-auth-top">
            <span className="federation-auth-elbow federation-auth-elbow--tl" aria-hidden="true" />
            <div className="federation-auth-banner">
              <p className="federation-auth-org">United Federation of Planets</p>
              <h1>Starfleet Command</h1>
              <p className="federation-auth-sub">Secure LCARS access terminal</p>
            </div>
            <span className="federation-auth-elbow federation-auth-elbow--tr" aria-hidden="true" />
          </header>

          <div className="federation-auth-body">
            <aside className="federation-auth-rail" aria-hidden="true">
              <span className="federation-rail-block federation-rail-block--orange" />
              <span className="federation-rail-block federation-rail-block--peach" />
              <span className="federation-rail-block federation-rail-block--blue is-flex" />
              <span className="federation-rail-block federation-rail-block--lavender" />
              <span className="federation-rail-block federation-rail-block--violet" />
            </aside>

            <section className="federation-auth-main">
              <div className="federation-auth-insignia">
                <StarfleetDelta className="federation-delta" size={240} />
              </div>

              <div className="auth-card federation-auth-card">
                <p className="federation-panel-label">Access authorization</p>
                <p className="federation-panel-hint">
                  Enter clearance ID and access code to continue to{" "}
                  <AppBrandText />.
                </p>

                {(error || authMessage) && (
                  <p className="error federation-auth-error">{error || authMessage}</p>
                )}

                <form className="form" onSubmit={handleSubmit}>
                  <label>
                    Clearance ID
                    <input
                      value={username}
                      autoComplete="username"
                      autoFocus
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </label>
                  <label>
                    Access code
                    {passwordField}
                  </label>

                  <button type="submit" disabled={loading}>
                    {loading ? "Verifying clearance..." : "Request access"}
                  </button>
                </form>
              </div>

              <FederationAuthClock />
            </section>
          </div>

          <footer className="federation-auth-foot" aria-hidden="true">
            <span className="federation-foot-bar federation-foot-bar--orange" />
            <span className="federation-foot-bar federation-foot-bar--gold is-flex" />
            <span className="federation-foot-bar federation-foot-bar--blue" />
            <span className="federation-foot-bar federation-foot-bar--lavender" />
            <span className="federation-foot-bar federation-foot-bar--red" />
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-shell-controls">
        <ThemeToggle className="auth-theme-toggle" />
      </div>
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          <span className="auth-brand-text">
            <AppBrandText />
          </span>
        </div>
        <h1 style={{ marginBottom: "0.25rem" }}>Welcome back</h1>
        <p className="subtext">Sign in to access your application workspaces.</p>

        {(error || authMessage) && (
          <p className="error" style={{ margin: "0 0 0.75rem" }}>
            {error || authMessage}
          </p>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={username}
              autoComplete="username"
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Password
            {passwordField}
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default LoginPage;
