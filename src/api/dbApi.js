import { apiRequest } from "./http";
import { invalidateForeignKeyLabelCache } from "../utils/foreignKeyLabelCache";

function request(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getTables() {
  const payload = await apiRequest("/api/db/tables");
  return payload.tables;
}

export function runQuery({ table, sql, params = [] }) {
  return request("/api/db/query", { table, sql, params });
}

export function runCrud(payload) {
  return request("/api/db/crud", payload);
}

export function selectRows({
  table,
  columns = ["*"],
  where = "",
  whereParams = [],
  limit,
  offset,
  orderBy,
  orderDirection,
  countTotal = false,
}) {
  return runCrud({
    action: "select",
    table,
    columns,
    where,
    whereParams,
    limit,
    offset,
    orderBy,
    orderDirection,
    countTotal,
  });
}

export async function insertRow({ table, data }) {
  const result = await runCrud({ action: "insert", table, data });
  invalidateForeignKeyLabelCache(table);
  return result;
}

export async function updateRows({ table, data, where, whereParams = [] }) {
  const result = await runCrud({ action: "update", table, data, where, whereParams });
  invalidateForeignKeyLabelCache(table);
  return result;
}

export async function deleteRows({ table, where, whereParams = [] }) {
  const result = await runCrud({ action: "delete", table, where, whereParams });
  invalidateForeignKeyLabelCache(table);
  return result;
}

export async function clearTable(table) {
  const result = await runCrud({ action: "clear", table });
  invalidateForeignKeyLabelCache(table);
  return result;
}

/** Bulk id→label maps for referenced tables (local SQLite API). */
export function fetchReferenceLabels(refs = []) {
  return request("/api/db/reference-labels", { refs });
}
