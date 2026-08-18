import { useEffect, useMemo, useRef, useState } from "react";
import {
  deescalateIdeAccess,
  escalateIdeAccess,
  runElevatedIdeSql,
} from "../api/adminApi";
import { getMe } from "../api/authApi";
import { insertRow, runQuery, selectRows } from "../api/dbApi";
import { getCollectionDefinitions, getFieldDefinitions } from "../api/dictionaryApi";
import DataTable from "../components/DataTable";
import { Button, Modal } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useForeignKeyLabelMaps } from "../hooks/useForeignKeyLabelMaps";
import { canSeeAppSchema } from "../utils/roles";

function formatRemaining(ms) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const WRITE_SQL_TYPES = new Set(["INSERT", "UPDATE", "DELETE"]);

function collectRowColumns(rows) {
  const columns = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

function classifySqlResult(result) {
  if (!result || typeof result !== "object") {
    return { kind: "json" };
  }
  const type = String(result.statement_type || "").toUpperCase();
  const rows = Array.isArray(result.rows) ? result.rows : null;

  if (WRITE_SQL_TYPES.has(type)) {
    return {
      kind: "statement",
      type,
      changes: Number(result.changes) || 0,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  if (rows) {
    return {
      kind: "rows",
      rows,
      columns: collectRowColumns(rows),
    };
  }

  return { kind: "json" };
}

function formatStatementOutput({ type, changes, lastInsertRowid }) {
  const lines = [`${type} completed.`, `${changes} change(s).`];
  if (type === "INSERT" && lastInsertRowid != null && Number(lastInsertRowid) > 0) {
    lines.push(`last insert id: ${lastInsertRowid}`);
  }
  return lines.join("\n");
}

function formatSqlCell(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AppIdePage({ embedded = false }) {
  const { canAccessApp } = useAuth();
  const [pageTab, setPageTab] = useState("query");
  const [queryMode, setQueryMode] = useState("simple");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columnLabels, setColumnLabels] = useState({});
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [pragmaForeignKeys, setPragmaForeignKeys] = useState([]);
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(25);
  const [insertJson, setInsertJson] = useState("{}");
  const [sql, setSql] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlResultView, setSqlResultView] = useState("table");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [elevatedUntil, setElevatedUntil] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalatePassword, setEscalatePassword] = useState("");
  const [escalating, setEscalating] = useState(false);
  const passwordInputRef = useRef(null);

  const isElevated = Boolean(elevatedUntil && elevatedUntil > nowMs);
  const remainingMs = isElevated ? elevatedUntil - nowMs : 0;

  const rowColumns = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);
  const { formatReference } = useForeignKeyLabelMaps({
    table: selectedTable,
    fieldDefinitions,
    pragmaForeignKeys,
    columns: rowColumns,
    enabled: Boolean(selectedTable),
  });

  const columns = rowColumns;
  const sqlResultInfo = useMemo(() => classifySqlResult(sqlResult), [sqlResult]);

  const selectedTableLabel =
    tables.find((table) => table.name === selectedTable)?.label || selectedTable || "Table";

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (!active) return;
      const until = user?.ide_elevated_until;
      setElevatedUntil(typeof until === "number" && until > Date.now() ? until : null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!elevatedUntil) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (elevatedUntil <= current) {
        setElevatedUntil(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [elevatedUntil]);

  const loadRows = async (tableName = selectedTable) => {
    if (!tableName) {
      return;
    }

    setError("");
    setStatus("Loading rows...");

    try {
      const [definitions, fkInfo] = await Promise.all([
        getFieldDefinitions(tableName),
        runQuery({
          table: tableName,
          sql: `PRAGMA foreign_key_list(${tableName})`,
        }),
      ]);
      setFieldDefinitions(definitions);
      setPragmaForeignKeys(fkInfo.rows ?? []);
      setColumnLabels(Object.fromEntries(definitions.map((field) => [field.name, field.label])));

      const result = await selectRows({
        table: tableName,
        limit: Number(limit),
      });
      setRows(result.rows);
      setStatus(`Loaded ${result.rows.length} row(s) from "${tableName}".`);
    } catch (loadError) {
      setStatus("");
      setError(loadError.message);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const availableTables = (await getCollectionDefinitions()).filter((table) =>
          canSeeAppSchema(table.application, canAccessApp)
        );
        setTables(availableTables);

        if (availableTables.length > 0) {
          const firstTable = availableTables[0].name;
          setSelectedTable(firstTable);
          setSql(`SELECT * FROM ${firstTable} LIMIT 25`);
          const [definitions, fkInfo, result] = await Promise.all([
            getFieldDefinitions(firstTable),
            runQuery({
              table: firstTable,
              sql: `PRAGMA foreign_key_list(${firstTable})`,
            }),
            selectRows({ table: firstTable, limit: 25 }),
          ]);
          setFieldDefinitions(definitions);
          setPragmaForeignKeys(fkInfo.rows ?? []);
          setColumnLabels(
            Object.fromEntries(definitions.map((field) => [field.name, field.label]))
          );
          setRows(result.rows);
          setStatus(`Loaded ${result.rows.length} row(s) from "${firstTable}".`);
        }
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadInitialData();
  }, [canAccessApp]);

  const handleTableChange = (nextTable) => {
    setSelectedTable(nextTable);
    setSql(`SELECT * FROM ${nextTable} LIMIT ${limit}`);
  };

  const handleInsert = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      const data = JSON.parse(insertJson);
      if (typeof data !== "object" || Array.isArray(data) || data === null) {
        throw new Error("Insert JSON must be an object.");
      }

      const result = await insertRow({ table: selectedTable, data });
      setStatus(
        `Inserted into "${selectedTable}" (id: ${result.lastID}, changes: ${result.changes}).`
      );
      await loadRows();
    } catch (insertError) {
      setError(insertError.message);
    }
  };

  const handleRunSql = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setSqlResult(null);

    try {
      const result = isElevated
        ? await runElevatedIdeSql({ sql })
        : await runQuery({ table: selectedTable, sql });
      setSqlResult(result);
      if (
        isElevated &&
        (result.changes > 0 ||
          result.statement_type === "INSERT" ||
          result.statement_type === "UPDATE" ||
          result.statement_type === "DELETE")
      ) {
        setStatus(
          `Elevated SQL executed (${result.statement_type || "statement"} · ${result.changes ?? 0} change(s)).`
        );
      } else {
        setStatus(isElevated ? "Elevated SQL executed." : "SQL query executed.");
      }
    } catch (queryError) {
      setError(queryError.message);
    }
  };

  const handleEscalate = async (event) => {
    event.preventDefault();
    setEscalating(true);
    setError("");
    setStatus("");

    try {
      const result = await escalateIdeAccess(escalatePassword);
      setElevatedUntil(result.elevated_until);
      setNowMs(Date.now());
      setShowEscalateModal(false);
      setEscalatePassword("");
      setStatus("IDE access elevated for 15 minutes. INSERT / UPDATE / DELETE are allowed.");
    } catch (escalateError) {
      setError(escalateError.message);
    } finally {
      setEscalating(false);
    }
  };

  const handleDeescalate = async () => {
    setError("");
    setStatus("");
    try {
      await deescalateIdeAccess();
      setElevatedUntil(null);
      setStatus("Elevated IDE access ended. SQL is read-only again.");
    } catch (deescalateError) {
      setError(deescalateError.message);
    }
  };

  const switchPageTab = (tab) => {
    setPageTab(tab);
    setError("");
    setStatus("");
  };

  const tableSelect = (
    <label>
      Table
      <select value={selectedTable} onChange={(event) => handleTableChange(event.target.value)}>
        {tables.map((table) => (
          <option key={table.name} value={table.name}>
            {table.label}
          </option>
        ))}
      </select>
    </label>
  );

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? undefined : "panel"}>
      {!embedded && <h1>App IDE</h1>}
      <h2 style={embedded ? { marginTop: 0 } : undefined}>IDE</h2>
      <p className="subtext">
        Query tables, run SQL, or insert a row from JSON. Advanced SQL is read-only unless you
        escalate access for emergency writes.
      </p>

      <div className="ide-tabs" role="tablist" aria-label="IDE sections">
        <button
          type="button"
          role="tab"
          className={`ide-tab${pageTab === "query" ? " active" : ""}`}
          aria-selected={pageTab === "query"}
          onClick={() => switchPageTab("query")}
        >
          Query
        </button>
        <button
          type="button"
          role="tab"
          className={`ide-tab${pageTab === "upload" ? " active" : ""}`}
          aria-selected={pageTab === "upload"}
          onClick={() => switchPageTab("upload")}
        >
          Upload
        </button>
      </div>

      {pageTab === "query" ? (
        <div className="ide-tab-panel">
          <div className="ide-mode-toggle" role="tablist" aria-label="Query mode">
            <button
              type="button"
              role="tab"
              className={`ide-mode-toggle-button${queryMode === "simple" ? " active" : ""}`}
              aria-selected={queryMode === "simple"}
              onClick={() => setQueryMode("simple")}
            >
              Simple
            </button>
            <button
              type="button"
              role="tab"
              className={`ide-mode-toggle-button${queryMode === "advanced" ? " active" : ""}`}
              aria-selected={queryMode === "advanced"}
              onClick={() => setQueryMode("advanced")}
            >
              Advanced
            </button>
          </div>

          {queryMode === "simple" ? (
            <>
              <p className="subtext">Pick a table and load rows.</p>
              <div className="row">
                {tableSelect}
                <label>
                  Limit
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </label>
                <button type="button" onClick={() => loadRows()}>
                  Load Rows
                </button>
              </div>

              {rows.length > 0 ? (
                <DataTable
                  key={selectedTable}
                  storageKey={`data-table:ide:${selectedTable}`}
                  columns={columns}
                  rows={rows}
                  columnLabels={columnLabels}
                  formatCell={(column, value) => formatReference(column, value)}
                />
              ) : (
                <p>No rows loaded yet.</p>
              )}
            </>
          ) : (
            <>
              <div className={`ide-elevation-banner${isElevated ? " is-elevated" : ""}`}>
                <div>
                  <strong>{isElevated ? "Elevated access active" : "Read-only SQL"}</strong>
                  <p className="subtext">
                    {isElevated
                      ? `INSERT / UPDATE / DELETE allowed · ${formatRemaining(remainingMs)} remaining`
                      : "Escalate to run INSERT, UPDATE, or DELETE for 15 minutes."}
                  </p>
                </div>
                <div className="ide-elevation-actions">
                  {isElevated ? (
                    <button type="button" className="danger-button" onClick={handleDeescalate}>
                      End elevated access
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => {
                        setEscalatePassword("");
                        setShowEscalateModal(true);
                      }}
                    >
                      Escalate access
                    </button>
                  )}
                </div>
              </div>

              <form className="ide-sql-form" onSubmit={handleRunSql}>
                <label>
                  SQL
                  <textarea
                    rows={10}
                    value={sql}
                    onChange={(event) => setSql(event.target.value)}
                    spellCheck={false}
                    placeholder="SELECT * FROM users LIMIT 25"
                  />
                </label>
                <button type="submit">{isElevated ? "Run elevated SQL" : "Run SQL"}</button>
              </form>

              {sqlResult ? (
                <div className="ide-sql-result">
                  {sqlResultInfo.kind === "statement" ? (
                    <pre className="ide-sql-statement-output">
                      {formatStatementOutput(sqlResultInfo)}
                    </pre>
                  ) : (
                    <>
                      <div className="ide-sql-result-toolbar" role="tablist" aria-label="SQL result view">
                        <button
                          type="button"
                          role="tab"
                          className={`ide-sql-result-tab${sqlResultView === "table" ? " active" : ""}`}
                          aria-selected={sqlResultView === "table"}
                          onClick={() => setSqlResultView("table")}
                        >
                          Table
                        </button>
                        <button
                          type="button"
                          role="tab"
                          className={`ide-sql-result-tab${sqlResultView === "json" ? " active" : ""}`}
                          aria-selected={sqlResultView === "json"}
                          onClick={() => setSqlResultView("json")}
                        >
                          JSON
                        </button>
                      </div>
                      {sqlResultView === "table" && sqlResultInfo.kind === "rows" ? (
                        sqlResultInfo.rows.length > 0 ? (
                          <DataTable
                            storageKey="data-table:ide:sql-result"
                            columns={sqlResultInfo.columns}
                            rows={sqlResultInfo.rows}
                            formatCell={(_column, value) => formatSqlCell(value)}
                            emptyMessage="Query returned 0 rows."
                          />
                        ) : (
                          <p className="subtext">Query returned 0 rows.</p>
                        )
                      ) : (
                        <pre className="ide-sql-json-output">
                          {JSON.stringify(sqlResult, null, 2)}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="ide-tab-panel">
          <p className="subtext">Insert one row into a table by pasting a JSON object.</p>
          <form className="ide-upload-form" onSubmit={handleInsert}>
            <div className="row">{tableSelect}</div>
            <label>
              JSON
              <textarea
                rows={10}
                value={insertJson}
                onChange={(event) => setInsertJson(event.target.value)}
                spellCheck={false}
                placeholder='{ "username": "ada", "display_name": "Ada" }'
              />
            </label>
            <button type="submit">Insert into {selectedTableLabel}</button>
          </form>
        </div>
      )}

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      <Modal
        open={showEscalateModal}
        onClose={() => {
          if (!escalating) {
            setShowEscalateModal(false);
            setEscalatePassword("");
          }
        }}
        title="Escalate IDE access"
        description="Confirm your password to allow INSERT, UPDATE, and DELETE for 15 minutes. Use only for emergency record fixes."
        size="sm"
        closeOnBackdrop={!escalating}
        initialFocusRef={passwordInputRef}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEscalateModal(false);
                setEscalatePassword("");
              }}
              disabled={escalating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="ide-escalate-form"
              variant="danger"
              disabled={escalating || !escalatePassword}
            >
              {escalating ? "Escalating..." : "Escalate for 15 minutes"}
            </Button>
          </>
        }
      >
        <form id="ide-escalate-form" onSubmit={handleEscalate}>
          <label>
            Password
            <input
              ref={passwordInputRef}
              type="password"
              autoComplete="current-password"
              value={escalatePassword}
              onChange={(event) => setEscalatePassword(event.target.value)}
              required
            />
          </label>
        </form>
      </Modal>
    </Wrapper>
  );
}

export default AppIdePage;
