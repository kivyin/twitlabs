function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows, columns) {
  if (!rows.length) {
    return "";
  }

  const resolvedColumns =
    columns ??
    Object.keys(rows[0]).map((key) => ({
      key,
      label: key,
    }));

  const header = resolvedColumns.map((column) => csvEscape(column.label)).join(",");
  const body = rows
    .map((row) => resolvedColumns.map((column) => csvEscape(row[column.key])).join(","))
    .join("\n");

  return `${header}\n${body}\n`;
}

export function downloadCsv(rows, filename, columns) {
  const csv = rowsToCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
