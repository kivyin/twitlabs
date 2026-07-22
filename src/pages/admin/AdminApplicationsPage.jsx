import { useEffect, useState } from "react";
import { deleteRows, insertRow, updateRows } from "../../api/dbApi";
import { getApplications } from "../../api/dictionaryApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/DataTable";

const EMPTY_FORM = { id: null, name: "", title: "", description: "" };

function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setApplications(await getApplications());
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
    setValidationErrors({});
  };

  const startEdit = (app) => {
    setValidationErrors({});
    setForm({
      id: app.id,
      name: app.name ?? "",
      title: app.title ?? "",
      description: app.description ?? "",
    });
  };

  const validateForm = (f) => {
    const errors = {};
    if (!f.name.trim()) errors.name = "Name is required.";
    if (!f.title.trim()) errors.title = "Title is required.";
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

      const payload = {
        name: form.name.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
      };

      if (form.id) {
        await updateRows({
          table: "applications",
          data: payload,
          where: "id = ?",
          whereParams: [form.id],
        });
        setStatus("Application updated.");
      } else {
        await insertRow({ table: "applications", data: payload });
        setStatus("Application created.");
      }

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
      await deleteRows({ table: "applications", where: "id = ?", whereParams: [id] });
      setStatus("Application deleted.");
      await loadData();
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>Applications</h2>
        <button type="button" onClick={resetForm}>
          New Application
        </button>
      </div>

      <h3>{form.id ? "Edit Application" : "New Application"}</h3>
      <form className="form" onSubmit={handleSave}>
        <div className="row">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {validationErrors.name && (
              <span className="field-error">{validationErrors.name}</span>
            )}
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {validationErrors.title && (
              <span className="field-error">{validationErrors.title}</span>
            )}
          </label>
          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>
        <div>
          <button type="submit" disabled={saving}>
            {form.id ? "Update Application" : "Create Application"}
          </button>
          {form.id && (
            <button
              type="button"
              style={{ marginLeft: "0.5rem" }}
              onClick={resetForm}
            >
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
                  applications.find((a) => a.id === form.id) ?? {
                    id: form.id,
                    name: form.name,
                    title: form.title,
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

      <h3>All Applications</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          storageKey="data-table:admin:applications"
          columns={["id", "name", "title", "description"]}
          rows={applications}
          onRowClick={(app) => startEdit(app)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete application?"
          message={`This will delete the application "${deleteTarget.title}". Dictionary entries linked to this application will be orphaned.`}
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

export default AdminApplicationsPage;
