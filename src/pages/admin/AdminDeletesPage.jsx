import { useEffect, useMemo, useState } from "react";
import { getSystemDeletes, restoreSystemDelete } from "../../api/systemDeletesApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/DataTable";
import { getRecordLabel } from "../../utils/tableForm";
import { formatUserReferenceValue } from "../../utils/userReferences";
import { useUserLabelMap } from "../../hooks/useUserLabelMap";

function parseRecordData(recordData) {
  try {
    return JSON.parse(recordData);
  } catch {
    return null;
  }
}

function getArchiveSummary(record) {
  const data = parseRecordData(record.record_data);
  if (!data) {
    return `Record #${record.record_id ?? "?"}`;
  }

  return getRecordLabel(data, "id", record.source_table);
}

function AdminDeletesPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const userLabelMap = useUserLabelMap();

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await getSystemDeletes());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const tableRows = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        summary: getArchiveSummary(record),
      })),
    [records]
  );

  const handleRestore = async () => {
    if (!restoreTarget) {
      return;
    }

    setRestoring(true);
    setError("");
    setStatus("");

    try {
      const result = await restoreSystemDelete(restoreTarget.id);
      setRestoreTarget(null);
      setStatus(
        `Restored ${result.table} record ${result.record_id ?? ""}`.trim() + "."
      );
      await loadRecords();
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>Deleted Records</h2>
        <button type="button" onClick={loadRecords} disabled={loading}>
          Refresh
        </button>
      </div>

      <p className="subtext">
        Records removed from application tables are archived here and can be restored by
        administrators.
      </p>

      {loading && <p className="subtext">Loading deleted records...</p>}
      {error && <p className="error">{error}</p>}
      {status && <p className="status">{status}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="subtext">No deleted records are archived yet.</p>
      )}

      {!loading && records.length > 0 && (
        <DataTable
          storageKey="data-table:admin:system-deletes"
          columns={["source_table", "record_id", "summary", "created_on", "created_by"]}
          defaultVisibleColumns={[
            "source_table",
            "record_id",
            "summary",
            "created_on",
            "created_by",
          ]}
          rows={tableRows}
          columnLabels={{
            source_table: "Table",
            record_id: "Record ID",
            summary: "Summary",
            created_on: "Deleted On",
            created_by: "Deleted By",
          }}
          formatCell={(column, value) => {
            if (column === "created_by") {
              return formatUserReferenceValue(column, value, userLabelMap, {
                created_by: "users",
              });
            }
            return null;
          }}
          onRowClick={(row) => setRestoreTarget(row)}
        />
      )}

      {restoreTarget && (
        <ConfirmModal
          title="Restore deleted record?"
          message={`This will restore "${restoreTarget.summary}" back to the ${restoreTarget.source_table} table.`}
          confirmLabel={restoring ? "Restoring..." : "Restore record"}
          onCancel={() => !restoring && setRestoreTarget(null)}
          onConfirm={handleRestore}
        />
      )}
    </div>
  );
}

export default AdminDeletesPage;
