export const AUDIT_FIELDS = new Set([
  "created_by",
  "created_on",
  "updated_by",
  "updated_on",
]);

export function isAuditField(fieldName) {
  return AUDIT_FIELDS.has(fieldName);
}

export function filterAuditColumns(columnNames) {
  return columnNames.filter((name) => !isAuditField(name));
}

export function filterEditableColumns(columns) {
  return columns.filter((column) => !isAuditField(column.name));
}
