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
import { useForeignKeyLabelMaps } from "../hooks/useForeignKeyLabelMaps";

function formatRemaining(ms) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function AppIdePage({ embedded = false }) {
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
        const availableTables = await getCollectionDefinitions();
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
  }, []);

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
      if (isElevated && (result.changes > 0 || result.statement_type === "INSERT" || result.statement_type === "UPDATE" || result.statement_type === "DELETE")) {
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

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? undefined : "panel"}>
      {!embedded && <h1>App IDE</h1>}
      <h2 style={embedded ? { marginTop: 0 } : undefined}>IDE</h2>
      <p className="subtext">
        Run direct table queries and insert JSON data. Custom SQL is read-only unless you escalate
        access for emergency updates.
      </p>

      <div className={`ide-elevation-banner${isElevated ? " is-elevated" : ""}`}>
        <div>
          <strong>{isElevated ? "Elevated access active" : "Read-only SQL"}</strong>
          <p className="subtext">
            {isElevated
              ? `Emergency write SQL enabled — INSERT / UPDATE / DELETE allowed · ${formatRemaining(remainingMs)} remaining`
              : "Re-enter your password to unlock INSERT / UPDATE / DELETE for 15 minutes."}
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

      <div className="row">
        <label>
          Table
          <select
            value={selectedTable}
            onChange={(event) => {
              const nextTable = event.target.value;
              setSelectedTable(nextTable);
              setSql(`SELECT * FROM ${nextTable} LIMIT ${limit}`);
            }}
          >
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.label}
              </option>
            ))}
          </select>
        </label>
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

      <h2>Insert Row</h2>
      <form onSubmit={handleInsert}>
        <textarea
          rows={8}
          value={insertJson}
          onChange={(event) => setInsertJson(event.target.value)}
        />
        <button type="submit">Insert Into {selectedTable || "Table"}</button>
      </form>

      <h2>Custom SQL {isElevated ? "(elevated)" : "(read-only)"}</h2>
      <form onSubmit={handleRunSql}>
        <textarea rows={6} value={sql} onChange={(event) => setSql(event.target.value)} />
        <button type="submit">{isElevated ? "Run elevated SQL" : "Run SQL"}</button>
      </form>
      {sqlResult && <pre>{JSON.stringify(sqlResult, null, 2)}</pre>}

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
