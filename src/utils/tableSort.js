export function compareValues(a, b) {
  if (a === b) {
    return 0;
  }

  const empty = (value) => value === null || value === undefined || value === "";
  if (empty(a) && empty(b)) {
    return 0;
  }
  if (empty(a)) {
    return 1;
  }
  if (empty(b)) {
    return -1;
  }

  const stringA = String(a).trim();
  const stringB = String(b).trim();

  if (
    /^-?\d+(\.\d+)?$/.test(stringA) &&
    /^-?\d+(\.\d+)?$/.test(stringB)
  ) {
    return Number(stringA) - Number(stringB);
  }

  return stringA.localeCompare(stringB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortRows(rows, sort) {
  if (!sort?.column || !sort.direction) {
    return rows;
  }

  const direction = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort(
    (rowA, rowB) => direction * compareValues(rowA[sort.column], rowB[sort.column])
  );
}

export function nextSortDirection(currentColumn, currentDirection, column) {
  if (currentColumn !== column) {
    return "asc";
  }
  if (currentDirection === "asc") {
    return "desc";
  }
  if (currentDirection === "desc") {
    return null;
  }
  return "asc";
}
