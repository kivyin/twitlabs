import { useEffect, useMemo, useState } from "react";
import { deleteRows, insertRow, runQuery, updateRows } from "../../api/dbApi";
import { getApplications, getCollectionDefinitions } from "../../api/dictionaryApi";
import AdminDictionaryForm from "../../components/admin/AdminDictionaryForm";
import AdminDictionaryTable from "../../components/admin/AdminDictionaryTable";
import ConfirmModal from "../../components/common/ConfirmModal";

const EMPTY_FORM = {
  id: null,
  table: "",
  application: "",
  application_id: null,
  name: "",
  label: "",
  type: "field",
  data_type: "",
  ref_table: "",
  required: 0,
  sort_order: 0,
};

function AdminFieldsPage() {
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dictionaryResult, collectionsData, applicationsData] = await Promise.all([
        runQuery({
          table: "system_dictionary",
          sql: `
            SELECT d.*, a.name AS application_name, a.title AS application_title
            FROM system_dictionary d
            LEFT JOIN applications a ON a.id = d.application_id
            WHERE d.type = 'field'
            ORDER BY d."table", d.sort_order, d.name
          `,
        }),
        getCollectionDefinitions(),
        getApplications(),
      ]);
      setEntries(dictionaryResult.rows ?? []);
      setCollections(collectionsData.filter((c) => c.name !== "system_dictionary"));
      setApplications(applicationsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const tableCompare = String(a.table ?? "").localeCompare(String(b.table ?? ""));
        if (tableCompare !== 0) return tableCompare;
        const sortCompare = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
        if (sortCompare !== 0) return sortCompare;
        return String(a.name).localeCompare(String(b.name));
      }),
    [entries]
  );

  const resetForm = () => {
    setValidationErrors({});
    setForm({
      ...EMPTY_FORM,
      table: collections[0]?.name ?? "",
      application: collections[0]?.application ?? "",
      application_id: collections[0]?.application_id ?? null,
    });
  };

  const startEdit = (entry) => {
    setValidationErrors({});
    setForm({
      id: entry.id,
      table: entry.table ?? "",
      application: entry.application ?? entry.application_name ?? "",
      application_id: entry.application_id ?? null,
      name: entry.name ?? "",
      label: entry.label ?? "",
      type: "field",
      data_type: entry.data_type ?? "",
      ref_table: entry.ref_table ?? "",
      required: Number(entry.required ?? 0),
      sort_order: Number(entry.sort_order ?? 0),
    });
  };

  const validateForm = (f) => {
    const errors = {};
    if (!String(f.name ?? "").trim()) errors.name = "Name is required.";
    if (!String(f.label ?? "").trim()) errors.label = "Label is required.";
    if (!String(f.table ?? "").trim()) errors.table = "Table is required.";
    if (
      String(f.sort_order ?? "").trim() !== "" &&
      Number.isNaN(Number(f.sort_order))
    ) {
      errors.sort_order = "Sort order must be a valid number.";
    }
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

      const matchedCollection = collections.find((c) => c.name === form.table);
      const payload = {
        table: form.table.trim(),
        application: matchedCollection?.application ?? form.application.trim(),
        application_id: matchedCollection?.application_id ?? (Number(form.application_id) || null),
        name: form.name.trim(),
        label: form.label.trim(),
        type: "field",
        data_type: form.data_type.trim() || null,
        ref_table: form.ref_table.trim() || null,
        required: Number(form.required) ? 1 : 0,
        sort_order: Number(form.sort_order) || 0,
      };

      if (form.id) {
        await updateRows({
          table: "system_dictionary",
          data: payload,
          where: "id = ?",
          whereParams: [form.id],
        });
        setStatus("Field definition updated.");
      } else {
        await insertRow({ table: "system_dictionary", data: payload });
        setStatus("Field definition created.");
      }

      await loadData();
      resetForm();
      setValidationErrors({});
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
      await deleteRows({ table: "system_dictionary", where: "id = ?", whereParams: [id] });
      setStatus("Field definition deleted.");
      await loadData();
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Fields</h2>
        <button type="button" onClick={resetForm}>
          New Field
        </button>
      </div>

      <h3>{form.id ? "Edit Field" : "New Field"}</h3>
      <AdminDictionaryForm
        form={form}
        collections={collections}
        applications={applications}
        validationErrors={validationErrors}
        saving={saving}
        hideType
        onFormChange={setForm}
        onSubmit={handleSave}
      />
      {form.id && (
        <button type="button" style={{ marginTop: "0.5rem" }} onClick={resetForm}>
          Cancel
        </button>
      )}

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      <h3>Field Definitions</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <AdminDictionaryTable
          entries={filteredEntries}
          onEdit={startEdit}
          onDeleteRequest={setDeleteTarget}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete field definition?"
          message={`This will delete the field "${deleteTarget.name}" from table "${deleteTarget.table}".`}
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

export default AdminFieldsPage;
