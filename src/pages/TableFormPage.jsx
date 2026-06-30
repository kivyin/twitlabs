import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { insertRow, runQuery, selectRows, updateRows } from "../api/dbApi";
import { getCollectionDefinition, getFieldDefinitions } from "../api/dictionaryApi";
import TableFormFields from "../components/TableFormFields";
import { buildForeignKeyOptionLabel, normalizeValue } from "../utils/tableForm";

function TableFormPage() {
  const { appName = "budget", table, recordId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(recordId);
  const [columns, setColumns] = useState([]);
  const [pkColumn, setPkColumn] = useState("id");
  const [tableLabel, setTableLabel] = useState(table);
  const [columnLabels, setColumnLabels] = useState({});
  const [foreignKeys, setForeignKeys] = useState({});
  const [fkOptions, setFkOptions] = useState({});
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
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

        const fkInfo = await runQuery({
          table,
          sql: `PRAGMA foreign_key_list(${table})`,
        });
        const fkRows = fkInfo.rows ?? [];
        const fkMap = Object.fromEntries(
          fkRows.map((fk) => [fk.from, { refTable: fk.table, refColumn: fk.to || "id" }])
        );
        setForeignKeys(fkMap);

        const loadedFkOptions = await Promise.all(
          Object.entries(fkMap).map(async ([columnName, meta]) => {
            const referencedRows = await selectRows({ table: meta.refTable, limit: 500 });
            const options = (referencedRows.rows ?? [])
              .filter(
                (row) =>
                  row[meta.refColumn] !== undefined &&
                  row[meta.refColumn] !== null &&
                  row[meta.refColumn] !== ""
              )
              .map((row) => ({
                value: String(row[meta.refColumn]),
                label: buildForeignKeyOptionLabel(row, meta.refColumn),
              }));

            return [columnName, options];
          })
        );
        setFkOptions(Object.fromEntries(loadedFkOptions));

        if (isEdit) {
          const result = await selectRows({
            table,
            where: `${primaryColumn} = ?`,
            whereParams: [recordId],
            limit: 1,
          });
          const row = result.rows[0];
          if (!row) {
            throw new Error("Record not found.");
          }
          setFormData(
            Object.fromEntries(
              tableColumns.map((column) => [
                column.name,
                row[column.name] === null ? "" : String(row[column.name]),
              ])
            )
          );
        } else {
          setFormData(
            Object.fromEntries(tableColumns.map((column) => [column.name, ""]))
          );
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appName, isEdit, recordId, table]);

  const editableColumns = useMemo(() => {
    return columns.filter((column) => {
      const isPrimaryKey = Number(column.pk) === 1;
      const isIdColumn = column.name.toLowerCase() === "id";
      const isPkColumn = column.name === pkColumn;
      return !isPrimaryKey && !isIdColumn && !isPkColumn;
    });
  }, [columns, pkColumn]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      const data = {};
      for (const column of editableColumns) {
        data[column.name] = normalizeValue(formData[column.name] ?? "", column.type);
      }

      if (isEdit) {
        await updateRows({
          table,
          data,
          where: `${pkColumn} = ?`,
          whereParams: [recordId],
        });
        setStatus("Record updated.");
      } else {
        await insertRow({ table, data });
        setStatus("Record created.");
      }

      setTimeout(() => navigate(`/app/${appName}/${table}`), 250);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="panel">
      <h1>{isEdit ? `Edit ${tableLabel}` : `New ${tableLabel} record`}</h1>
      {loading && <p>Loading form...</p>}
      {!loading && (
        <form className="form" onSubmit={handleSubmit}>
          <TableFormFields
            columns={editableColumns}
            foreignKeys={foreignKeys}
            fkOptions={fkOptions}
            formData={formData}
            columnLabels={columnLabels}
            onChange={handleChange}
          />
          <div className="row">
            <button type="submit">{isEdit ? "Update" : "Create"}</button>
            <button type="button" onClick={() => navigate(`/app/${appName}/${table}`)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export default TableFormPage;
