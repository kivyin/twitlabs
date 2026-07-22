export const TABLE_PAGE_SIZE = 20;
/** Accounts stay on one page so drag-reorder can persist a full custom order. */
export const ACCOUNTS_PAGE_SIZE = 500;

const DEFAULT_SORT_CANDIDATES = [
  "sort_order",
  "transaction_date",
  "created_on",
  "created_at",
  "updated_on",
  "updated_at",
  "id",
];

/** Prefer custom account order when present; otherwise newest-first defaults. */
export function resolveDefaultSortColumn(columnNames = []) {
  const available = new Set(columnNames);
  for (const column of DEFAULT_SORT_CANDIDATES) {
    if (available.has(column)) {
      return {
        column,
        direction: column === "sort_order" ? "asc" : "desc",
      };
    }
  }
  return { column: null, direction: null };
}

export function getPageCount(totalCount, pageSize = TABLE_PAGE_SIZE) {
  const total = Number(totalCount) || 0;
  if (total <= 0) {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

export function getPageRange(page, pageSize, totalCount) {
  const total = Number(totalCount) || 0;
  if (total <= 0) {
    return { start: 0, end: 0 };
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return { start, end };
}
