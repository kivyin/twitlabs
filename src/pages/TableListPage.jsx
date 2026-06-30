import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { runQuery, selectRows } from "../api/dbApi";
import { getCollectionDefinition, getFieldDefinitions } from "../api/dictionaryApi";
import RecordTable from "../components/RecordTable";

const MAX_LIST_ROWS = 100;

function TableListPage() {
  const { appName = "budget", table } = useParams();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [pkColumn, setPkColumn] = useState("id");
  const [tableLabel, setTableLabel] = useState(table);
  const [columnLabels, setColumnLabels] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const [tableDefinition, fieldDefinitions] = await Promise.all([
          getCollectionDefinition(table, appName),
          getFieldDefinitions(table, appName),
        ]);
        setTableLabel(tableDefinition?.label ?? table);
        setColumnLabels(
          Object.fromEntries(fieldDefinitions.map((field) => [field.name, field.label]))
        );

        const info = await runQuery({
          table,
          sql: `PRAGMA table_info(${table})`,
        });
        const tableColumns = info.rows ?? [];
        setColumns(tableColumns);

        const primaryColumn =
          tableColumns.find((column) => Number(column.pk) === 1)?.name ??
          tableColumns[0]?.name ??
          "id";
        setPkColumn(primaryColumn);

        const result = await selectRows({
          table,
          limit: MAX_LIST_ROWS,
        });
        setRows(result.rows);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appName, table]);

  const visibleColumns = useMemo(() => {
    if (columns.length > 0) {
      return columns.map((column) => column.name);
    }
    if (rows.length > 0) {
      return Object.keys(rows[0]);
    }
    return [];
  }, [columns, rows]);

  return (
    <section className="panel">
      <div className="section-title">
        <h1>{tableLabel} records</h1>
        <Link className="link-button" to={`/app/${appName}/${table}/new`}>
          New
        </Link>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No records found.</p>}

      {!loading && !error && rows.length > 0 && (
        <RecordTable
          columns={visibleColumns}
          rows={rows}
          linkColumn={visibleColumns[0]}
          columnLabels={columnLabels}
          getRowLink={(row, index) => {
            const rowId = row[pkColumn] ?? index;
            return `/app/${appName}/${table}/${encodeURIComponent(String(rowId))}/edit`;
          }}
        />
      )}
    </section>
  );
}

export default TableListPage;
