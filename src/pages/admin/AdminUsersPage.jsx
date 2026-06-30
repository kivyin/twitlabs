import { useEffect, useState } from "react";
import { getApplications } from "../../api/dictionaryApi";
import ConfirmModal from "../../components/common/ConfirmModal";

const EMPTY_FORM = {
  id: null,
  username: "",
  display_name: "",
  password: "",
  confirm_password: "",
};

const EMPTY_ROLES = { isSystemAdmin: false, apps: {} };

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function rolesToForm(roles) {
  const isSystemAdmin = roles.some((r) => r.application === "system" && r.role === "admin");
  const apps = {};
  for (const r of roles) {
    if (r.application !== "system") apps[r.application] = true;
  }
  return { isSystemAdmin, apps };
}

function formToRoles(roleForm) {
  const roles = [];
  if (roleForm.isSystemAdmin) {
    roles.push({ application: "system", role: "admin" });
  }
  for (const [app, granted] of Object.entries(roleForm.apps)) {
    if (granted) roles.push({ application: app, role: "member" });
  }
  return roles;
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersPayload, appsData] = await Promise.all([
        api("GET", "/api/auth/users"),
        getApplications(),
      ]);
      setUsers(usersPayload.users ?? []);
      setApplications(appsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setRoleForm(EMPTY_ROLES);
    setValidationErrors({});
  };

  const startEdit = async (user) => {
    setValidationErrors({});
    setForm({
      id: user.id,
      username: user.username ?? "",
      display_name: user.display_name ?? "",
      password: "",
      confirm_password: "",
    });
    setRoleForm(rolesToForm(user.roles ?? []));
  };

  const validateForm = (f) => {
    const errors = {};
    if (!f.username.trim()) errors.username = "Username is required.";
    if (!f.id && !f.password) errors.password = "Password is required for new users.";
    if (f.password && f.password.length < 4) errors.password = "Password must be at least 4 characters.";
    if (f.password && f.password !== f.confirm_password) errors.confirm_password = "Passwords do not match.";
    return errors;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setSaving(true);
    try {
      const errors = validateForm(form);
      setValidationErrors(errors);
      if (Object.keys(errors).length > 0) throw new Error("Please fix validation errors.");

      const userPayload = {
        username: form.username.trim(),
        display_name: form.display_name.trim() || null,
        ...(form.password ? { password: form.password } : {}),
      };

      let userId = form.id;
      if (form.id) {
        await api("PUT", `/api/auth/users/${form.id}`, userPayload);
      } else {
        const result = await api("POST", "/api/auth/users", userPayload);
        userId = result.id;
      }

      await api("PUT", `/api/auth/users/${userId}/roles`, { roles: formToRoles(roleForm) });

      setStatus(form.id ? "User updated." : "User created.");
      await loadData();
      resetForm();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    setStatus("");
    try {
      await api("DELETE", `/api/auth/users/${id}`);
      setStatus("User deleted.");
      await loadData();
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleAppRole = (appName, checked) => {
    setRoleForm((prev) => ({
      ...prev,
      apps: { ...prev.apps, [appName]: checked },
    }));
  };

  const isEditing = Boolean(form.id);

  return (
    <div>
      <div className="row" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <button type="button" onClick={resetForm}>New User</button>
      </div>

      <h3>{isEditing ? "Edit User" : "New User"}</h3>
      <form className="form" onSubmit={handleSave}>
        {/* ── Profile ── */}
        <div className="row">
          <label>
            Username
            <input
              value={form.username}
              autoComplete="off"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            {validationErrors.username && (
              <span className="field-error">{validationErrors.username}</span>
            )}
          </label>
          <label>
            Display Name
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </label>
        </div>

        <div className="row">
          <label>
            {isEditing ? "New Password" : "Password"}
            <input
              type="password"
              value={form.password}
              autoComplete="new-password"
              placeholder={isEditing ? "Leave blank to keep current" : ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </label>
          <label>
            Confirm Password
            <input
              type="password"
              value={form.confirm_password}
              autoComplete="new-password"
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            />
            {validationErrors.confirm_password && (
              <span className="field-error">{validationErrors.confirm_password}</span>
            )}
          </label>
        </div>

        {/* ── Permissions ── */}
        <fieldset
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            margin: 0,
          }}
        >
          <legend style={{ fontWeight: 700, fontSize: "0.9rem", padding: "0 0.35rem" }}>
            Permissions
          </legend>

          <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={roleForm.isSystemAdmin}
              onChange={(e) => setRoleForm({ ...roleForm, isSystemAdmin: e.target.checked })}
            />
            <span style={{ fontWeight: 600 }}>System Admin</span>
            <span style={{ color: "var(--muted-text)", fontSize: "0.85rem" }}>
              — full access to all apps and the admin panel
            </span>
          </label>

          {applications.length > 0 && (
            <div style={{ marginTop: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "var(--muted-text)", fontWeight: 600 }}>
                Application Access
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                {applications.map((app) => (
                  <label
                    key={app.name}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: roleForm.isSystemAdmin ? "default" : "pointer",
                      opacity: roleForm.isSystemAdmin ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={roleForm.isSystemAdmin || Boolean(roleForm.apps[app.name])}
                      disabled={roleForm.isSystemAdmin}
                      onChange={(e) => toggleAppRole(app.name, e.target.checked)}
                    />
                    {app.title}
                  </label>
                ))}
              </div>
              {roleForm.isSystemAdmin && (
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "var(--muted-text)" }}>
                  System Admin grants access to all applications automatically.
                </p>
              )}
            </div>
          )}
        </fieldset>

        <div>
          <button type="submit" disabled={saving}>
            {isEditing ? "Update User" : "Create User"}
          </button>
          {isEditing && (
            <button type="button" style={{ marginLeft: "0.5rem" }} onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      <h3>All Users</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>username</th>
                <th>display name</th>
                <th>roles</th>
                <th>action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const sysAdmin = user.roles?.some(
                  (r) => r.application === "system" && r.role === "admin"
                );
                const appRoles = user.roles
                  ?.filter((r) => r.application !== "system")
                  .map((r) => r.application)
                  .join(", ");
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.display_name ?? ""}</td>
                    <td>
                      {sysAdmin ? (
                        <strong>System Admin</strong>
                      ) : (
                        appRoles || <span style={{ color: "var(--muted-text)" }}>none</span>
                      )}
                    </td>
                    <td>
                      <button type="button" onClick={() => startEdit(user)}>Edit</button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete user?"
          message={`This will permanently delete the user "${deleteTarget.username}".`}
          confirmLabel="Confirm Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const id = deleteTarget.id;
            setDeleteTarget(null);
            await handleDelete(id);
          }}
        />
      )}
    </div>
  );
}

export default AdminUsersPage;
