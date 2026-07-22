import { useEffect, useMemo, useState } from "react";
import { deleteRows, insertRow, selectRows, updateRows } from "../../api/dbApi";
import { getApplications } from "../../api/dictionaryApi";
import { getNavigation, reseedNavigation } from "../../api/navigationApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/DataTable";
import { NAV_ICON_OPTIONS } from "../../utils/navIcons";

const EMPTY_FORM = {
  id: null,
  label: "",
  path: "",
  icon: "",
  is_main: false,
  parent_id: "",
  application: "",
  nav_section: "apps",
  sort_order: 0,
};

function AdminNavigationPage() {
  const [items, setItems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [navItems, apps] = await Promise.all([
        selectRows({ table: "system_navigation", limit: 500 }),
        getApplications(),
      ]);
      setItems(navItems.rows ?? []);
      setApplications(apps);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const mainOptions = useMemo(
    () => items.filter((item) => Number(item.is_main) === 1 && item.id !== form.id),
    [form.id, items]
  );

  const parentLabelById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item.label])),
    [items]
  );

  const tableRows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        is_main_label: Number(item.is_main) === 1 ? "Yes" : "No",
        parent_label: item.parent_id ? parentLabelById[item.parent_id] ?? item.parent_id : "",
      })),
    [items, parentLabelById]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setValidationErrors({});
  };

  const startEdit = (item) => {
    setValidationErrors({});
    setForm({
      id: item.id,
      label: item.label ?? "",
      path: item.path ?? "",
      icon: item.icon ?? "",
      is_main: Number(item.is_main) === 1,
      parent_id: item.parent_id ? String(item.parent_id) : "",
      application: item.application ?? "",
      nav_section: item.nav_section ?? "apps",
      sort_order: Number(item.sort_order) || 0,
    });
  };

  const validateForm = (values) => {
    const errors = {};
    if (!values.label.trim()) errors.label = "Label is required.";
    if (!values.path.trim()) errors.path = "Path is required.";
    if (!values.is_main && !values.parent_id) {
      errors.parent_id = "Choose a parent main link or mark this item as Main.";
    }
    if (values.is_main && values.parent_id) {
      errors.parent_id = "Main links cannot have a parent.";
    }
    if (values.nav_section === "apps" && !values.application) {
      errors.application = "Application is required for app navigation links.";
    }
    return errors;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const errors = validateForm(form);
      setValidationErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error("Please fix validation errors.");
      }

      const payload = {
        label: form.label.trim(),
        path: form.path.trim(),
        icon: form.icon || null,
        is_main: form.is_main ? 1 : 0,
        parent_id: form.is_main ? null : Number(form.parent_id),
        application: form.nav_section === "apps" ? form.application : null,
        nav_section: form.nav_section,
        sort_order: Number(form.sort_order) || 0,
      };

      if (form.id) {
        await updateRows({
          table: "system_navigation",
          data: payload,
          where: "id = ?",
          whereParams: [form.id],
        });
        setStatus("Navigation link updated.");
      } else {
        await insertRow({ table: "system_navigation", data: payload });
        setStatus("Navigation link created.");
      }

      await loadData();
      resetForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    setStatus("");
    try {
      await deleteRows({
        table: "system_navigation",
        where: "id = ?",
        whereParams: [id],
      });
      setStatus("Navigation link deleted.");
      await loadData();
      if (form.id === id) resetForm();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleReseed = async () => {
    setReseeding(true);
    setError("");
    setStatus("");
    try {
      await reseedNavigation();
      await loadData();
      setStatus("Navigation reseeded from applications and tables.");
    } catch (reseedError) {
      setError(reseedError.message);
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>Navigation</h2>
        <div className="row">
          <button type="button" onClick={resetForm}>
            New Link
          </button>
          <button type="button" onClick={handleReseed} disabled={reseeding}>
            {reseeding ? "Reseeding..." : "Reseed Navigation"}
          </button>
        </div>
      </div>

      <p className="subtext">
        Main links appear as parents in the left navigation. Child links reference a main link in
        the Parent field and show indented underneath it.
      </p>

      <h3>{form.id ? "Edit Navigation Link" : "New Navigation Link"}</h3>
      <form className="form" onSubmit={handleSave}>
        <div className="row">
          <label>
            Label
            <input
              value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
            {validationErrors.label && (
              <span className="field-error">{validationErrors.label}</span>
            )}
          </label>
          <label>
            Path
            <input
              value={form.path}
              onChange={(event) => setForm({ ...form, path: event.target.value })}
              placeholder="/app/budget/accounts"
            />
            {validationErrors.path && (
              <span className="field-error">{validationErrors.path}</span>
            )}
          </label>
        </div>

        <div className="row">
          <label>
            Section
            <select
              value={form.nav_section}
              onChange={(event) => setForm({ ...form, nav_section: event.target.value })}
            >
              <option value="apps">Applications</option>
              <option value="admin">Administration</option>
            </select>
          </label>
          <label>
            Application
            <select
              value={form.application}
              onChange={(event) => setForm({ ...form, application: event.target.value })}
              disabled={form.nav_section !== "apps"}
            >
              <option value="">Select application</option>
              {applications.map((app) => (
                <option key={app.id} value={app.name}>
                  {app.title}
                </option>
              ))}
            </select>
            {validationErrors.application && (
              <span className="field-error">{validationErrors.application}</span>
            )}
          </label>
          <label>
            Icon
            <select
              value={form.icon}
              onChange={(event) => setForm({ ...form, icon: event.target.value })}
            >
              {NAV_ICON_OPTIONS.map((option) => (
                <option key={option.value || "default"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row">
          <label className="checkbox-field">
            <span className="checkbox-row">
              <input
                type="checkbox"
                checked={form.is_main}
                onChange={(event) =>
                  setForm({
                    ...form,
                    is_main: event.target.checked,
                    parent_id: event.target.checked ? "" : form.parent_id,
                  })
                }
              />
              <span>Main parent link</span>
            </span>
          </label>
          <label>
            Parent
            <select
              value={form.parent_id}
              onChange={(event) => setForm({ ...form, parent_id: event.target.value })}
              disabled={form.is_main}
            >
              <option value="">Select parent main link</option>
              {mainOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {validationErrors.parent_id && (
              <span className="field-error">{validationErrors.parent_id}</span>
            )}
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </label>
        </div>

        <div>
          <button type="submit" disabled={saving}>
            {form.id ? "Update Link" : "Create Link"}
          </button>
          {form.id && (
            <button type="button" style={{ marginLeft: "0.5rem" }} onClick={resetForm}>
              Cancel
            </button>
          )}
          {form.id && (
            <button
              type="button"
              className="danger-button"
              style={{ marginLeft: "0.5rem" }}
              onClick={() =>
                setDeleteTarget(
                  items.find((item) => item.id === form.id) ?? {
                    id: form.id,
                    label: form.label,
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

      <h3>All Navigation Links</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          storageKey="data-table:admin:system-navigation"
          columns={[
            "id",
            "label",
            "path",
            "nav_section",
            "application",
            "is_main_label",
            "parent_label",
            "sort_order",
          ]}
          defaultVisibleColumns={[
            "label",
            "path",
            "nav_section",
            "is_main_label",
            "parent_label",
            "sort_order",
          ]}
          rows={tableRows}
          columnLabels={{
            nav_section: "section",
            is_main_label: "main",
            parent_label: "parent",
            sort_order: "sort",
          }}
          onRowClick={(row) => startEdit(row)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete navigation link?"
          message={`This will remove "${deleteTarget.label}" from the left navigation.`}
          confirmLabel="Delete link"
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

export default AdminNavigationPage;
