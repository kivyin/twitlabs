import { runQuery } from "./dbApi";

const SYSTEM_DICTIONARY_TABLE = "system_dictionary";
const APPLICATIONS_TABLE = "applications";

export async function getApplications() {
  const result = await runQuery({
    table: APPLICATIONS_TABLE,
    sql: `
      SELECT id, name, title, description
      FROM applications
      ORDER BY title, name
    `,
  });

  return result.rows ?? [];
}

export async function getCollectionDefinitions(application) {
  const hasApplicationFilter =
    typeof application === "string" && application.trim().length > 0;
  const result = await runQuery({
    table: SYSTEM_DICTIONARY_TABLE,
    sql: `
      SELECT
        d.name,
        MIN(d.label) AS label,
        d.type,
        MIN(d.application) AS application,
        MIN(d.application_id) AS application_id,
        MIN(a.title) AS application_title,
        MIN(a.description) AS application_description
      FROM system_dictionary d
      LEFT JOIN applications a ON a.id = d.application_id
      WHERE d.type = 'collection'
      ${hasApplicationFilter ? "AND a.name = ?" : ""}
      GROUP BY d.name, d.type, a.id, a.name, a.title, a.description
      ORDER BY MIN(d.label), d.name
    `,
    params: hasApplicationFilter ? [application.trim()] : [],
  });

  return result.rows ?? [];
}

export async function getCollectionDefinition(tableName, application) {
  const hasApplicationFilter =
    typeof application === "string" && application.trim().length > 0;
  const result = await runQuery({
    table: SYSTEM_DICTIONARY_TABLE,
    sql: `
      SELECT d.name, d.label, d.type
      FROM system_dictionary d
      LEFT JOIN applications a ON a.id = d.application_id
      WHERE d.type = 'collection' AND d.name = ?
      ${hasApplicationFilter ? "AND a.name = ?" : ""}
      ORDER BY d.id
      LIMIT 1
    `,
    params: hasApplicationFilter
      ? [tableName, application.trim()]
      : [tableName],
  });

  return result.rows?.[0] ?? null;
}

export async function getFieldDefinitions(tableName, application) {
  const hasApplicationFilter =
    typeof application === "string" && application.trim().length > 0;
  const result = await runQuery({
    table: SYSTEM_DICTIONARY_TABLE,
    sql: `
      SELECT d."table" AS table_name, d.name, d.label, d.data_type, d.ref_table, d.required, d.sort_order
      FROM system_dictionary d
      LEFT JOIN applications a ON a.id = d.application_id
      WHERE d.type = 'field' AND d."table" = ?
      ${hasApplicationFilter ? "AND a.name = ?" : ""}
      ORDER BY d.sort_order, d.id
    `,
    params: hasApplicationFilter
      ? [tableName, application.trim()]
      : [tableName],
  });

  return result.rows ?? [];
}

export async function reseedDictionary() {
  const response = await fetch("/api/admin/reseed-dictionary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to reseed dictionary.");
  }
  return payload;
}
