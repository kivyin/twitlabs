import { useState } from "react";
import { changePassword } from "../api/authApi";
import { AppBrandText, BrandMark } from "../components/AppBrand";
import { useAuth } from "../context/AuthContext";

function ChangePasswordPage() {
  const { clearMustChangePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword === "admin") {
      setError("Choose a password other than the default.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      clearMustChangePassword();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          <span className="auth-brand-text">
            <AppBrandText />
          </span>
        </div>
        <h1 style={{ marginBottom: "0.25rem" }}>Change password</h1>
        <p className="subtext">
          For security, replace the default admin password before using the app.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          {error && (
            <p className="error" style={{ margin: 0 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save new password"}
          </button>
          <button type="button" onClick={() => logout()} disabled={saving}>
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

export default ChangePasswordPage;
