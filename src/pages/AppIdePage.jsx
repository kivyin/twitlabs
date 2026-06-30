import { useEffect, useMemo, useState } from "react";
import { insertRow, runQuery, selectRows } from "../api/dbApi";
import { getCollectionDefinitions, getFieldDefinitions } from "../api/dictionaryApi";
import RecordTable from "../components/RecordTable";

function AppIdePage({ embedded = false }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columnLabels, setColumnLabels] = useState({});
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(25);
  const [insertJson, setInsertJson] = useState("{}");
  const [sql, setSql] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const columns = useMemo(() => {
    if (rows.length === 0) {
      return [];
    }
    return Object.keys(rows[0]);
  }, [rows]);

  const loadRows = async (tableName = selectedTable) => {
    if (!tableName) {
      return;
    }

    setError("");
    setStatus("Loading rows...");

    try {
      const fieldDefinitions = await getFieldDefinitions(tableName);
      setColumnLabels(
        Object.fromEntries(fieldDefinitions.map((field) => [field.name, field.label]))
      );

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
          const fieldDefinitions = await getFieldDefinitions(firstTable);
          setColumnLabels(
            Object.fromEntries(fieldDefinitions.map((field) => [field.name, field.label]))
          );
          const result = await selectRows({ table: firstTable, limit: 25 });
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
      const result = await runQuery({ table: selectedTable, sql });
      setSqlResult(result);
      setStatus("SQL query executed.");
    } catch (queryError) {
      setError(queryError.message);
    }
  };

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? undefined : "panel"}>
      {!embedded && <h1>App IDE</h1>}
      <h2 style={embedded ? { marginTop: 0 } : undefined}>IDE</h2>
      <p className="subtext">Run direct table queries and insert JSON data.</p>

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
        <RecordTable
          columns={columns}
          rows={rows}
          linkColumn={null}
          columnLabels={columnLabels}
          getRowLink={() => "#"}
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

      <h2>Custom SQL</h2>
      <form onSubmit={handleRunSql}>
        <textarea rows={6} value={sql} onChange={(event) => setSql(event.target.value)} />
        <button type="submit">Run SQL</button>
      </form>
      {sqlResult && <pre>{JSON.stringify(sqlResult, null, 2)}</pre>}

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
    </Wrapper>
  );
}

export default AppIdePage;
