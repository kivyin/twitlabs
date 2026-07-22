import { useEffect, useMemo, useState } from "react";
import { getSystemLogs } from "../../api/systemLogsApi";
import DataTable from "../../components/DataTable";
import { formatUserReferenceValue } from "../../utils/userReferences";
import { useUserLabelMap } from "../../hooks/useUserLabelMap";

function formatDataPreview(data) {
  if (!data) return "";
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(data);
  }
}

function AdminLogsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const userLabelMap = useUserLabelMap();

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await getSystemLogs(300));
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
        user_label:
          formatUserReferenceValue("user_id", record.user_id, userLabelMap) ||
          record.username ||
          "",
        message_preview: String(record.message || "").slice(0, 120),
      })),
    [records, userLabelMap]
  );

  return (
    <div>
      <div className="toolbar">
        <h2>Error Logs</h2>
        <button type="button" onClick={loadRecords} disabled={loading}>
          Refresh
        </button>
      </div>

      <p className="subtext">
        Application and API errors are stored in the <code>system_logs</code> table and mirrored to{" "}
        <code>data/logs/</code> for durability when the database is unavailable.
      </p>

      {loading && <p className="subtext">Loading logs...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <DataTable
          storageKey="admin-system-logs"
          columns={[
            "created_on",
            "level",
            "source",
            "user_label",
            "status_code",
            "function_name",
            "url",
            "message_preview",
          ]}
          defaultVisibleColumns={[
            "created_on",
            "level",
            "source",
            "user_label",
            "function_name",
            "message_preview",
          ]}
          rows={tableRows}
          columnLabels={{
            created_on: "When",
            level: "Level",
            source: "Source",
            user_label: "User",
            status_code: "Status",
            function_name: "Function",
            url: "URL",
            message_preview: "Message",
          }}
          emptyMessage="No error logs yet."
          onRowClick={(row) => setSelected(row)}
        />
      )}

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="log-detail-title">Log detail #{selected.id}</h2>
            <dl className="log-detail-list">
              <div>
                <dt>When</dt>
                <dd>{selected.created_on}</dd>
              </div>
              <div>
                <dt>User</dt>
                <dd>
                  {selected.user_label || selected.username || "—"}
                  {selected.user_id != null ? ` (#${selected.user_id})` : ""}
                </dd>
              </div>
              <div>
                <dt>Source / Level</dt>
                <dd>
                  {selected.source} / {selected.level}
                </dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd>{selected.url || "—"}</dd>
              </div>
              <div>
                <dt>Method / Status</dt>
                <dd>
                  {selected.method || "—"} / {selected.status_code ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Function</dt>
                <dd>{selected.function_name || "—"}</dd>
              </div>
              <div>
                <dt>IP / User agent</dt>
                <dd>
                  {selected.ip_address || "—"}
                  <br />
                  <span className="subtext">{selected.user_agent || "—"}</span>
                </dd>
              </div>
              <div>
                <dt>Message</dt>
                <dd>
                  <pre className="log-detail-pre">{selected.message}</pre>
                </dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd>
                  <pre className="log-detail-pre">{selected.stack || "—"}</pre>
                </dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>
                  <pre className="log-detail-pre">{formatDataPreview(selected.data) || "—"}</pre>
                </dd>
              </div>
            </dl>
            <div className="form-actions">
              <button type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLogsPage;
