export function normalizeValue(value, type = "", { fieldName = "" } = {}) {
  if (value === "" || value === null || value === undefined) {
    // Boolean-style integer flags must never be saved as null.
    if (fieldName === "tax_deductible" || fieldName === "is_active" || fieldName === "cleared") {
      return 0;
    }
    return null;
  }

  const normalizedType = type.toUpperCase();
  if (
    normalizedType.includes("INT") ||
    normalizedType.includes("REAL") ||
    normalizedType.includes("NUM") ||
    normalizedType.includes("DEC")
  ) {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      throw new Error(`"${value}" is not a valid number.`);
    }
    return numberValue;
  }

  return value;
}

export const REF_TABLE_LABEL_KEYS = {
  users: ["display_name", "username"],
  account_types: ["name"],
  category_types: ["name"],
  categories: ["name"],
  accounts: ["name"],
  payees: ["name"],
  applications: ["title", "name"],
  task_projects: ["name"],
  task_tags: ["name"],
  notebooks: ["name"],
  note_subjects: ["name"],
  note_topics: ["name"],
  tasks: ["title", "name"],
  notes: ["title", "name"],
};

export const DEFAULT_LABEL_KEYS = [
  "name",
  "title",
  "username",
  "display_name",
  "description",
  "email",
  "month",
  "type",
];

export function getPreferredLabelKeys(refTable, labelField) {
  const keys = [];
  if (labelField) {
    keys.push(labelField);
  }
  for (const key of REF_TABLE_LABEL_KEYS[refTable] ?? DEFAULT_LABEL_KEYS) {
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

export function getRecordLabel(row, pkColumn = "id", table, labelField) {
  if (!row) {
    return "this record";
  }

  const preferredKeys = getPreferredLabelKeys(table, labelField);
  const bestKey = preferredKeys.find(
    (key) => key in row && key !== pkColumn && row[key] !== null && row[key] !== ""
  );

  if (bestKey) {
    return String(row[bestKey]);
  }

  if (row[pkColumn] !== undefined && row[pkColumn] !== null && row[pkColumn] !== "") {
    return String(row[pkColumn]);
  }

  return "this record";
}

export function buildForeignKeyOptionLabel(row, idColumn, refTable, labelField) {
  const preferredKeys = getPreferredLabelKeys(refTable, labelField);
  const bestKey = preferredKeys.find(
    (key) => key in row && key !== idColumn && row[key] !== null && row[key] !== ""
  );

  if (bestKey) {
    return String(row[bestKey]);
  }

  return String(row[idColumn]);
}

export function buildOptionsFromLabelMap(labelMap = {}) {
  return Object.entries(labelMap)
    .map(([value, label]) => ({ value, label: String(label) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}
