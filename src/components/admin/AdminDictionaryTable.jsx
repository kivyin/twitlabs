import DataTable from "../DataTable";

function AdminDictionaryTable({ entries, onEdit }) {
  const rows = entries.map((entry) => ({
    ...entry,
    application_display: entry.application_name ?? entry.application ?? "",
    table_display: entry.table ?? "",
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
        "ref_table",
        "ref_label_field",
        "sort_order",
      ]}
      defaultVisibleColumns={[
        "id",
        "application_display",
        "table_display",
        "name",
        "label",
        "type",
        "ref_table",
        "ref_label_field",
        "sort_order",
      ]}
      columnLabels={{
        application_display: "application",
        table_display: "table",
        ref_label_field: "ref label",
      }}
      rows={rows}
      onRowClick={(entry) => onEdit(entry)}
    />
  );
}

export default AdminDictionaryTable;
