import {
  buildRefLabelMap,
  buildRefMetaByColumn,
  buildRefTableByColumnFromMeta,
  formatReferenceValue,
  resolveReferenceLabel,
} from "./foreignKeyLabels";
import { buildForeignKeyOptionLabel } from "./tableForm";

export const USER_REFERENCE_FIELDS = new Set([
  "created_by",
  "updated_by",
  "user_id",
  "owner_user_id",
]);

export function isUserReferenceField(fieldName) {
  return USER_REFERENCE_FIELDS.has(fieldName);
}

export function isUsersRefField(fieldName, refTable) {
  return isUserReferenceField(fieldName) || refTable === "users";
}

export function buildUserLabelMap(userRows) {
  return buildRefLabelMap(userRows, "users", "id");
}

export function buildUserOptions(userRows) {
  return (userRows ?? []).map((row) => ({
    value: String(row.id),
    label: buildForeignKeyOptionLabel(row, "id", "users"),
  }));
}

export function resolveUserReference(value, userLabelMap) {
  return resolveReferenceLabel(value, userLabelMap);
}

export function formatUserReferenceValue(column, value, userLabelMap, refTableByColumn = {}) {
  const refTable = refTableByColumn[column];
  if (!isUsersRefField(column, refTable)) {
    return null;
  }

  return formatReferenceValue(column, value, { users: userLabelMap }, { [column]: "users" });
}

export function buildRefTableByColumn(fieldDefinitions, options = {}) {
  const meta = buildRefMetaByColumn({
    fieldDefinitions,
    table: options.table,
    pragmaForeignKeys: options.pragmaForeignKeys,
    columns: options.columns,
  });
  return buildRefTableByColumnFromMeta(meta);
}
