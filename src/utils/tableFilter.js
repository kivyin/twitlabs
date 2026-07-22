const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const FILTER_OPERATORS = {
  eq: { label: "equals", categories: ["text", "number", "date"] },
  ne: { label: "does not equal", categories: ["text", "number", "date"] },
  contains: { label: "contains", categories: ["text"] },
  not_contains: { label: "does not contain", categories: ["text"] },
  starts_with: { label: "starts with", categories: ["text"] },
  ends_with: { label: "ends with", categories: ["text"] },
  gt: { label: "greater than", categories: ["number", "date"] },
  gte: { label: "greater or equal", categories: ["number", "date"] },
  lt: { label: "less than", categories: ["number", "date"] },
  lte: { label: "less or equal", categories: ["number", "date"] },
  is_null: { label: "is empty", categories: ["text", "number", "date"], noValue: true },
  is_not_null: { label: "is not empty", categories: ["text", "number", "date"], noValue: true },
};

let nextConditionId = 1;

function createConditionId() {
  nextConditionId += 1;
  return `filter-${nextConditionId}`;
}

export function createEmptyFilterCondition() {
  return {
    id: createConditionId(),
    column: "",
    operator: "eq",
    value: "",
  };
}

export function quoteColumn(name) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
  return `"${name.replace(/"/g, "\"\"")}"`;
}

const DATE_COLUMN_PATTERN =
  /(?:^|_)(date|month|due|start|end|next_due|target)(?:$|_)|transaction_date|next_due_date|start_date|end_date|target_date|due_date/i;

const DATETIME_COLUMN_PATTERN = /(?:^|_)(on|at|time|timestamp)(?:$|_)|created_on|updated_on|created_at|updated_at/i;

export function getColumnCategory(sqliteType = "", columnName = "", dictionaryDataType = "") {
  const name = String(columnName ?? "").trim();
  const dictType = String(dictionaryDataType ?? "").trim().toLowerCase();

  if (dictType.includes("datetime") || dictType.includes("timestamp")) {
    return "datetime";
  }
  if (dictType.includes("date")) {
    return "date";
  }
  if (
    dictType === "integer" ||
    dictType === "int" ||
    dictType === "real" ||
    dictType === "float" ||
    dictType === "numeric" ||
    dictType === "number" ||
    dictType === "money" ||
    dictType === "currency" ||
    dictType === "boolean"
  ) {
    return "number";
  }
  if (dictType === "text" || dictType === "string") {
    return "text";
  }

  if (name && DATETIME_COLUMN_PATTERN.test(name)) {
    return "datetime";
  }
  if (name && DATE_COLUMN_PATTERN.test(name)) {
    return "date";
  }

  const normalized = String(sqliteType).toUpperCase();
  if (
    normalized.includes("INT") ||
    normalized.includes("REAL") ||
    normalized.includes("NUM") ||
    normalized.includes("DEC") ||
    normalized.includes("FLOAT") ||
    normalized.includes("DOUBLE")
  ) {
    return "number";
  }
  if (normalized.includes("DATE") || normalized.includes("TIME")) {
    return normalized.includes("TIME") && !normalized.includes("DATE") ? "datetime" : "date";
  }
  return "text";
}

export function buildColumnTypeMap(columns, fieldDefinitions = []) {
  const dictionaryTypes = Object.fromEntries(
    (fieldDefinitions ?? []).map((field) => [field.name, field.data_type ?? ""])
  );

  return Object.fromEntries(
    (columns ?? []).map((column) => [
      column.name,
      getColumnCategory(column.type, column.name, dictionaryTypes[column.name]),
    ])
  );
}

export function getFilterValueInputProps(category, operator) {
  if (["contains", "not_contains", "starts_with", "ends_with"].includes(operator)) {
    return {
      inputType: "text",
      labelHint: "enter text",
    };
  }

  switch (category) {
    case "number":
      return {
        inputType: "number",
        step: "any",
        labelHint: "enter number",
      };
    case "date":
      return {
        inputType: "date",
        labelHint: "yyyy-mm-dd",
      };
    case "datetime":
      return {
        inputType: "datetime-local",
        labelHint: "yyyy-mm-dd hh:mm",
      };
    default:
      return {
        inputType: "text",
        labelHint: "enter text",
      };
  }
}

export function getOperatorsForColumn(columnName, columnTypeMap) {
  const rawCategory = columnTypeMap[columnName] ?? "text";
  const category = rawCategory === "datetime" ? "date" : rawCategory;
  return Object.entries(FILTER_OPERATORS)
    .filter(([, operator]) => operator.categories.includes(category))
    .map(([value, operator]) => ({ value, label: operator.label }));
}

function coerceValue(value, category, operator) {
  if (["contains", "not_contains", "starts_with", "ends_with"].includes(operator)) {
    return String(value);
  }

  if (category === "number") {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      throw new Error(`"${value}" is not a valid number.`);
    }
    return numeric;
  }

  if (category === "datetime" && typeof value === "string" && value.includes("T")) {
    return value.replace("T", " ").length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
  }

  return String(value);
}

function formatLikeValue(operator, rawValue) {
  const value = String(rawValue);
  if (operator === "contains" || operator === "not_contains") {
    return `%${value}%`;
  }
  if (operator === "starts_with") {
    return `${value}%`;
  }
  if (operator === "ends_with") {
    return `%${value}`;
  }
  return value;
}

export function buildWhereFromConditions(conditions, columnTypeMap) {
  const clauses = [];
  const params = [];

  for (const condition of conditions ?? []) {
    const { column, operator, value } = condition;
    if (!column || !operator) {
      continue;
    }

    const operatorDef = FILTER_OPERATORS[operator];
    if (!operatorDef) {
      throw new Error(`Unsupported operator: ${operator}`);
    }

    const columnSql = quoteColumn(column);
    const category = columnTypeMap[column] ?? "text";

    if (operatorDef.noValue) {
      if (operator === "is_null") {
        clauses.push(`(${columnSql} IS NULL OR ${columnSql} = '')`);
      } else {
        clauses.push(`(${columnSql} IS NOT NULL AND ${columnSql} != '')`);
      }
      continue;
    }

    if (value === "" || value === null || value === undefined) {
      continue;
    }

    if (operator === "contains" || operator === "not_contains" || operator === "starts_with" || operator === "ends_with") {
      const sqlOperator = operator === "not_contains" ? "NOT LIKE" : "LIKE";
      clauses.push(`${columnSql} ${sqlOperator} ?`);
      params.push(formatLikeValue(operator, value));
      continue;
    }

    const sqlOperator =
      operator === "eq"
        ? "="
        : operator === "ne"
          ? "!="
          : operator === "gt"
            ? ">"
            : operator === "gte"
              ? ">="
              : operator === "lt"
                ? "<"
                : operator === "lte"
                  ? "<="
                  : null;

    if (!sqlOperator) {
      throw new Error(`Unsupported operator: ${operator}`);
    }

    clauses.push(`${columnSql} ${sqlOperator} ?`);
    params.push(coerceValue(value, category, operator));
  }

  return {
    where: clauses.join(" AND "),
    whereParams: params,
  };
}

export function hasActiveFilters(conditions) {
  return (conditions ?? []).some((condition) => {
    if (!condition.column || !condition.operator) {
      return false;
    }
    const operatorDef = FILTER_OPERATORS[condition.operator];
    if (operatorDef?.noValue) {
      return true;
    }
    return condition.value !== "" && condition.value !== null && condition.value !== undefined;
  });
}

export function loadStoredFilterConditions(storageKey) {
  if (!storageKey) {
    return [createEmptyFilterCondition()];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [createEmptyFilterCondition()];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createEmptyFilterCondition()];
    }
    return parsed.map((condition) => ({
      id: condition.id ?? createConditionId(),
      column: condition.column ?? "",
      operator: condition.operator ?? "eq",
      value: condition.value ?? "",
    }));
  } catch {
    return [createEmptyFilterCondition()];
  }
}

export function saveFilterConditions(storageKey, conditions) {
  if (!storageKey) {
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(conditions));
}

export function clearStoredFilterConditions(storageKey) {
  if (!storageKey) {
    return;
  }
  localStorage.removeItem(storageKey);
}
