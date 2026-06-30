import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteRows, insertRow, runQuery, updateRows } from "../../api/dbApi";
import { getApplications, reseedDictionary } from "../../api/dictionaryApi";
import AdminDictionaryForm from "../../components/admin/AdminDictionaryForm";
import AdminDictionaryTable from "../../components/admin/AdminDictionaryTable";
import DictionaryHealthPanel from "../../components/admin/DictionaryHealthPanel";
import ConfirmModal from "../../components/common/ConfirmModal";

const EMPTY_FORM = {
  id: null,
  table: "",
  application: "",
  application_id: null,
  name: "",
  label: "",
  type: "collection",
  data_type: "",
  ref_table: "",
  required: 0,
  sort_order: 0,
};

function AdminTablesPage() {
  const navigate = useNavigate();
  const [allEntries, setAllEntries] = useState([]);
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
      const [dictionaryResult, applicationsData] = await Promise.all([
        runQuery({
          table: "system_dictionary",
          sql: `
            SELECT d.*, a.name AS application_name, a.title AS application_title
            FROM system_dictionary d
            LEFT JOIN applications a ON a.id = d.application_id
            ORDER BY d.id DESC
            LIMIT 5000
          `,
        }),
        getApplications(),
      ]);
      setAllEntries(dictionaryResult.rows ?? []);
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

  const collections = useMemo(
    () =>
      allEntries
        .filter((e) => e.type === "collection")
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [allEntries]
  );

  const health = useMemo(() => {
    const duplicateMap = new Map();
    for (const entry of allEntries) {
      const key = `${entry.type}|${entry.table ?? ""}|${entry.name}`;
      duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
    }
    const duplicates = allEntries.filter((entry) => {
      const key = `${entry.type}|${entry.table ?? ""}|${entry.name}`;
      return (duplicateMap.get(key) ?? 0) > 1;
    });
    const missingLabels = allEntries.filter((entry) => !String(entry.label ?? "").trim());
    const collectionNames = new Set(allEntries.filter((e) => e.type === "collection").map((e) => e.name));
    const fieldsMissingTable = allEntries.filter(
      (e) => e.type === "field" && !String(e.table ?? "").trim()
    );
    const fieldsWithUnknownTable = allEntries.filter(
      (e) => e.type === "field" && String(e.table ?? "").trim() && !collectionNames.has(e.table)
    );
    const unknownRefTables = allEntries.filter(
      (e) => e.type === "field" && String(e.ref_table ?? "").trim() && !collectionNames.has(e.ref_table)
    );
    return { duplicates, missingLabels, fieldsMissingTable, fieldsWithUnknownTable, unknownRefTables };
  }, [allEntries]);

  const resetForm = () => {
    setValidationErrors({});
    setForm({
      ...EMPTY_FORM,
      application: applications[0]?.name ?? "",
      application_id: applications[0]?.id ?? null,
    });
  };

  const startEdit = (entry) => {
    setValidationErrors({});
    setForm({
      id: entry.id,
      table: "",
      application: entry.application ?? entry.application_name ?? "",
      application_id: entry.application_id ?? null,
      name: entry.name ?? "",
      label: entry.label ?? "",
      type: "collection",
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
    if (!f.application_id) errors.application = "Application is required.";
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
        table: null,
        application: form.application.trim(),
        application_id: Number(form.application_id) || null,
        name: form.name.trim(),
        label: form.label.trim(),
        type: "collection",
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
        setStatus("Table definition updated.");
      } else {
        await insertRow({ table: "system_dictionary", data: payload });
        setStatus("Table definition created.");
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
      setStatus("Table definition deleted.");
      await loadData();
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleReseed = async () => {
    setError("");
    setStatus("");
    try {
      const result = await reseedDictionary();
      setStatus(
        `Reseed complete. Added tables: ${result.inserted.collection}, fields: ${result.inserted.field}.`
      );
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Tables</h2>
        <button type="button" onClick={resetForm}>
          New Table
        </button>
        <button type="button" onClick={handleReseed}>
          Reseed from DB Schema
        </button>
      </div>

      <h3>{form.id ? "Edit Table" : "New Table"}</h3>
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

      <h3>Table Definitions</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <AdminDictionaryTable
          entries={collections}
          onEdit={startEdit}
          onDeleteRequest={setDeleteTarget}
        />
      )}

      <DictionaryHealthPanel
        health={health}
        onJumpToEntry={(entry) => {
          if (entry.type === "collection") {
            startEdit(entry);
            window.scrollTo(0, 0);
          } else {
            navigate("/admin/fields");
          }
        }}
      />

      {deleteTarget && (
        <ConfirmModal
          title="Delete table definition?"
          message={`This will delete the table definition "${deleteTarget.name}".`}
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

export default AdminTablesPage;
