import { Link } from "react-router-dom";
import DataTable from "../DataTable";

function browsePathForCollection(entry) {
  const appName = entry.application_name ?? entry.application ?? "";
  const tableName = entry.name;
  if (!appName || !tableName || entry.type !== "collection") return null;
  return `/app/${appName}/${tableName}`;
}

function AdminDictionaryTable({ entries, onEdit }) {
  const rows = entries.map((entry) => ({
    ...entry,
    application_display: entry.application_name ?? entry.application ?? "",
    table_display: entry.table ?? "",
    records_path: browsePathForCollection(entry),
  }));

  return (
    <DataTable
      storageKey="data-table:admin:dictionary"
      columns={[
        "id",
        "application_display",
        "table_display",
        "name",
        "label",
        "type",
        "records_path",
        "ref_table",
        "ref_label_field",
        "sort_order",
      ]}
      defaultVisibleColumns={[
        "id",
        "application_display",
        "name",
        "label",
        "type",
        "records_path",
        "sort_order",
      ]}
      columnLabels={{
        application_display: "application",
        table_display: "table",
        records_path: "records",
        ref_label_field: "ref label",
      }}
      formatCell={(column, value, row) => {
        if (column !== "records_path") return null;
        if (!value) return "—";
        return (
          <Link
            to={value}
            className="linkish-button"
            onClick={(event) => event.stopPropagation()}
            title={`Open ${row.label || row.name} records`}
          >
            Open
          </Link>
        );
      }}
      rows={rows}
      onRowClick={(entry) => onEdit(entry)}
    />
  );
}

export default AdminDictionaryTable;
