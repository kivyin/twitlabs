import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportAllDatabase, importAllDatabase } from "../../api/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { invalidateForeignKeyLabelCache } from "../../utils/foreignKeyLabelCache";

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AdminBackupPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInputRef = useRef(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [backupFile, setBackupFile] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const canConfirm = confirmText.trim().toUpperCase() === "IMPORT" && Boolean(backupPreview);

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setStatus("");
    try {
      const payload = await exportAllDatabase();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(payload, `hub-backup-${stamp}.json`);
      setStatus(
        `Exported ${payload.table_count ?? payload.tables?.length ?? 0} tables (${
          payload.row_count ?? 0
        } rows).`
      );
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setBackupFile(file);
    setBackupPreview(null);
    setError("");
    setStatus("");
    setResult(null);
    setConfirmText("");

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.format !== "hub-full-backup") {
        throw new Error('This file is not a hub-full-backup export.');
      }
      if (Number(parsed?.version) !== 1) {
        throw new Error("Unsupported backup version.");
      }
      if (!Array.isArray(parsed?.tables)) {
        throw new Error("Backup is missing the tables array.");
      }
      setBackupPreview(parsed);
    } catch (parseError) {
      setBackupFile(null);
      setBackupPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError(parseError.message || "Could not read backup file.");
    }
  };

  const handleImport = async () => {
    if (!backupPreview) {
      return;
    }

    setImporting(true);
    setError("");
    setStatus("");
    setResult(null);

    try {
      const payload = await importAllDatabase({
        confirm: "IMPORT",
        backup: backupPreview,
      });
      invalidateForeignKeyLabelCache();
      setShowConfirm(false);
      setConfirmText("");
      setResult(payload);

      if (payload.require_relogin) {
        setStatus("Import complete. Sign in again — your previous user was not in this backup.");
        await logout("Database restored. Please sign in again.");
        navigate("/login", { replace: true });
        return;
      }

      setStatus(
        `Import complete. Restored ${payload.inserted_rows ?? 0} rows across ${
          Object.keys(payload.inserted || {}).length
        } tables.`
      );
      setBackupFile(null);
      setBackupPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (importError) {
      setError(importError.message);
      setShowConfirm(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>Backup</h2>
      </div>

      <p className="subtext">
        Export every table to a JSON file, or replace this database from a previous export. Use this
        to move data between machines or keep an offline backup.
      </p>

      <section className="panel inset-panel zero-boot-panel">
        <h3>Export all</h3>
        <p className="subtext">
          Downloads a <code>hub-full-backup</code> JSON file with all rows from every application
          table (including users and hashed passwords). Attachment and account image files on disk
          are not included — copy the <code>data/attachments</code> and{" "}
          <code>data/account-images</code> folders separately if you need those files.
        </p>
        <div className="form-actions">
          <button type="button" disabled={exporting || importing} onClick={handleExport}>
            {exporting ? "Exporting…" : "Export all"}
          </button>
        </div>
      </section>

      <section className="panel inset-panel zero-boot-panel">
        <h3>Import all</h3>
        <p className="subtext">
          Replaces <strong>all</strong> current database records with the selected backup. Schema
          must match this app version. Type <strong>IMPORT</strong> to enable the action.
        </p>

        <label>
          Backup file
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            disabled={importing || exporting}
          />
        </label>

        {backupPreview && (
          <p className="stat-meta">
            {backupFile?.name} — {backupPreview.tables.length} tables,{" "}
            {backupPreview.row_count ??
              backupPreview.tables.reduce((sum, table) => sum + (table.rows?.length || 0), 0)}{" "}
            rows
            {backupPreview.exported_at ? ` · exported ${backupPreview.exported_at}` : ""}
            {backupPreview.app_version ? ` · app ${backupPreview.app_version}` : ""}
          </p>
        )}

        <label>
          Type <strong>IMPORT</strong> to enable restore
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="IMPORT"
            autoComplete="off"
            disabled={importing || !backupPreview}
          />
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="danger-button"
            disabled={!canConfirm || importing || exporting}
            onClick={() => setShowConfirm(true)}
          >
            {importing ? "Importing…" : "Import all"}
          </button>
          {result && !result.require_relogin && (
            <button type="button" onClick={() => navigate("/", { replace: true })}>
              Go to workspace home
            </button>
          )}
        </div>
      </section>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      {result && !result.require_relogin && (
        <section className="panel inset-panel">
          <h3>Import summary</h3>
          <p className="subtext">
            Cleared {result.cleared_tables?.length ?? 0} tables and inserted{" "}
            {result.inserted_rows ?? 0} rows.
            {result.restored_user?.username
              ? ` Signed in as "${result.restored_user.username}".`
              : ""}
            {result.missing_from_backup?.length
              ? ` Tables present locally but not in the backup were left empty: ${result.missing_from_backup.join(
                  ", "
                )}.`
              : ""}
          </p>
        </section>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Import all data?"
          message="This permanently replaces every table in the database with the backup file. Attachment files on disk are not restored. This cannot be undone."
          confirmLabel={importing ? "Importing…" : "Confirm import"}
          onCancel={() => !importing && setShowConfirm(false)}
          onConfirm={handleImport}
        />
      )}
    </div>
  );
}

export default AdminBackupPage;
