import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/authApi";
import { AppBrandText, BrandMark } from "../components/AppBrand";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

function resolvePostLoginPath(from) {
  if (typeof from !== "string") return "/";
  const path = from.trim();
  // Only allow same-app relative paths (block open redirects).
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/login")) {
    return "/";
  }
  return path;
}

function LoginPage() {
  const { user, loading: authLoading, login, authMessage, clearAuthMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
