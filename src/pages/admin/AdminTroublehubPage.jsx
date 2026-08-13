import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deelevateTroublehubAdmin,
  elevateTroublehubAdmin,
  getTroublehubStatus,
  listTroublehubAccessUsers,
  setTroublehubUserAccess,
} from "../../api/troublehubApi";
import { useAuth } from "../../context/AuthContext";

/**
 * Separate vault UI: system admins must re-enter their password each login
 * to become TroubleHub Admin for this session, then grant player access.
 */
function AdminTroublehubPage() {
  const { canAccessApp, setTroublehubAdminElevated } = useAuth();
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const next = await getTroublehubStatus();
      setStatus(next);
      setTroublehubAdminElevated(Boolean(next.troublehub_admin_elevated));
      if (next.troublehub_admin_elevated) {
        const access = await listTroublehubAccessUsers();
        setUsers(access.users || []);
      } else {
        setUsers([]);
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load TroubleHub vault status.");
    }
  }, [setTroublehubAdminElevated]);

  useEffect(() => {
    load();
  }, [load]);

  const handleElevate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await elevateTroublehubAdmin(password);
      setPassword("");
      setMessage("Elevated for this login session. Elevation clears when you sign out or sign in again.");
      await load();
    } catch (elevateError) {
      setError(elevateError.message || "Elevation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeelevate = async () => {
    setBusy(true);
    setError("");
    try {
      await deelevateTroublehubAdmin();
      setMessage("TroubleHub Admin elevation cleared.");
      await load();
    } catch (deelevateError) {
      setError(deelevateError.message || "Could not clear elevation.");
    } finally {
      setBusy(false);
    }
  };

  const toggleAccess = async (userRow, granted) => {
    setBusy(true);
    setError("");
    try {
      await setTroublehubUserAccess(userRow.id, granted);
      await load();
    } catch (accessError) {
      setError(accessError.message || "Could not update access.");
    } finally {
      setBusy(false);
    }
  };

  const elevated = Boolean(status?.troublehub_admin_elevated);

  return (
    <div className="th-vault-admin">
      <div className="toolbar">
        <h2>TroubleHub Vault</h2>
      </div>

      <p className="subtext">
        TroubleHub is an explicit app. System Admin does <strong>not</strong> unlock it. Elevate with
        your password for this session only, then grant player access. Elevation resets on every login.
      </p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="status">{message}</p> : null}

      <section className="panel inset-panel">
        <h3>Session elevation</h3>
        {elevated ? (
          <>
            <p className="status">TroubleHub Admin is active for this session.</p>
            <div className="form-actions">
              <button type="button" className="button" disabled={busy} onClick={handleDeelevate}>
                Clear elevation
              </button>
              {canAccessApp("troublehub") ? (
                <Link className="button-primary" to="/app/troublehub">
                  Open TroubleHub
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <form className="form" onSubmit={handleElevate}>
            <label>
              Confirm your password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="button-primary" disabled={busy || !password}>
                Elevate to TroubleHub Admin
              </button>
            </div>
          </form>
        )}
      </section>

      {elevated ? (
        <section className="panel inset-panel" style={{ marginTop: "1rem" }}>
          <h3>Player access</h3>
          <p className="subtext">
            Grant <code>troublehub_user</code> so someone can open the vault and play Match Mischief.
            This is not available on the normal Users form.
          </p>
          {users.length === 0 ? (
            <p className="subtext">No users found.</p>
          ) : (
            <ul className="th-access-list">
              {users.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.display_name || entry.username}</strong>
                    <span className="stat-meta">@{entry.username}</span>
                  </div>
                  <button
                    type="button"
                    className={entry.has_access ? "danger-button" : "button-primary"}
                    disabled={busy}
                    onClick={() => toggleAccess(entry, !entry.has_access)}
                  >
                    {entry.has_access ? "Revoke" : "Grant access"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default AdminTroublehubPage;
