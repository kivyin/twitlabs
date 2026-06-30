export function normalizeValue(value, type = "") {
  if (value === "") {
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

export function buildForeignKeyOptionLabel(row, idColumn) {
  const preferredKeys = ["name", "title", "description", "email", "month", "type"];
  const bestKey = preferredKeys.find(
    (key) => key in row && key !== idColumn && row[key] !== null && row[key] !== ""
  );

  if (bestKey) {
    return `${row[idColumn]} - ${row[bestKey]}`;
  }

  return String(row[idColumn]);
}
