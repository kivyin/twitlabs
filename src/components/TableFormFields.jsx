function TableFormFields({
  columns,
  foreignKeys,
  fkOptions,
  formData,
  onChange,
  columnLabels = {},
}) {
  return columns.map((column) => (
    <label key={column.name}>
      {columnLabels[column.name] ?? column.name}
      {foreignKeys[column.name] ? (
        <select
          value={formData[column.name] ?? ""}
          onChange={(event) => onChange(column.name, event.target.value)}
        >
          <option value="">Select {columnLabels[column.name] ?? column.name}</option>
          {(fkOptions[column.name] ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={formData[column.name] ?? ""}
          onChange={(event) => onChange(column.name, event.target.value)}
        />
      )}
    </label>
  ));
}

export default TableFormFields;
