async function request(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function getTables() {
  const response = await fetch("/api/db/tables");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load tables.");
  }

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
}) {
  return runCrud({ action: "select", table, columns, where, whereParams, limit });
}

export function insertRow({ table, data }) {
  return runCrud({ action: "insert", table, data });
}

export function updateRows({ table, data, where, whereParams = [] }) {
  return runCrud({ action: "update", table, data, where, whereParams });
}

export function deleteRows({ table, where, whereParams = [] }) {
  return runCrud({ action: "delete", table, where, whereParams });
}
