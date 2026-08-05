import { useEffect, useState } from "react";
import { getApplications } from "../../api/dictionaryApi";
import { apiRequest } from "../../api/http";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/DataTable";
import {
  formatRolesSummary,
  formToRoles,
  getAppRoleLabel,
  getAppRoleOptions,
  getAppUserRole,
  rolesToForm,
} from "../../utils/roles";

const EMPTY_FORM = {
  id: null,
  username: "",
  display_name: "",
  password: "",
  confirm_password: "",
};

const EMPTY_ROLES = { isSystemAdmin: false, apps: {} };

async function api(method, path, body) {
  return apiRequest(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
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
    if (f.password && f.password.length < 8) errors.password = "Password must be at least 8 characters.";
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

  const setAppRole = (appName, roleValue) => {
    setRoleForm((prev) => ({
      ...prev,
      apps: { ...prev.apps, [appName]: roleValue || false },
    }));
  };

  const isEditing = Boolean(form.id);

  return (
    <div>
      <div className="toolbar">
        <h2>Users</h2>
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
                Application roles
              </p>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", color: "var(--muted-text)" }}>
                Grant one role per app. Users without a role cannot see or open that app. Calendar
                offers User (edit) and View (read-only display).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {applications.map((app) => {
                  const options = getAppRoleOptions(app.name);
                  const defaultRole = getAppUserRole(app.name);
                  const currentValue = roleForm.isSystemAdmin
                    ? defaultRole || true
                    : roleForm.apps[app.name] || "";
                  const multi = options.length > 1;

                  if (multi) {
                    return (
                      <div
                        key={app.name}
                        style={{
                          opacity: roleForm.isSystemAdmin ? 0.5 : 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                        }}
                      >
                        <strong>{app.title}</strong>
                        <select
                          value={typeof currentValue === "string" ? currentValue : ""}
                          disabled={roleForm.isSystemAdmin}
                          onChange={(e) => setAppRole(app.name, e.target.value)}
                          style={{ maxWidth: "22rem" }}
                        >
                          <option value="">No access</option>
                          {options.map((option) => (
                            <option key={option.role} value={option.role}>
                              {option.label} ({option.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  const roleName = options[0]?.role || defaultRole;
                  const roleLabel = roleName ? getAppRoleLabel(roleName) : app.title;
                  return (
                    <label
                      key={app.name}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        cursor: roleForm.isSystemAdmin ? "default" : "pointer",
                        opacity: roleForm.isSystemAdmin ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={roleForm.isSystemAdmin || Boolean(roleForm.apps[app.name])}
                        disabled={roleForm.isSystemAdmin}
                        onChange={(e) =>
                          setAppRole(app.name, e.target.checked ? roleName : false)
                        }
                        style={{ marginTop: "0.2rem" }}
                      />
                      <span>
                        <strong>{roleLabel}</strong>
                        <span style={{ color: "var(--muted-text)", fontSize: "0.85rem" }}>
                          {" "}
                          — {app.title}
                          {roleName ? ` (${roleName})` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
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
          {isEditing && (
            <button
              type="button"
              className="danger-button"
              style={{ marginLeft: "0.5rem" }}
              onClick={() =>
                setDeleteTarget(
                  users.find((u) => u.id === form.id) ?? {
                    id: form.id,
                    username: form.username,
                  }
                )
              }
            >
              Delete
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
        <DataTable
          storageKey="data-table:admin:users"
          columns={["id", "username", "display_name", "roles_summary"]}
          rows={users.map((user) => ({
            ...user,
            roles_summary: formatRolesSummary(user.roles ?? []),
          }))}
          columnLabels={{
            display_name: "display name",
            roles_summary: "roles",
          }}
          formatCell={(column, value) => {
            if (column === "roles_summary" && value === "none") {
              return <span style={{ color: "var(--muted-text)" }}>none</span>;
            }
            if (column === "roles_summary" && value === "System Admin") {
              return <strong>System Admin</strong>;
            }
            return null;
          }}
          onRowClick={(user) => startEdit(user)}
        />
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
