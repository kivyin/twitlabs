import { getPageCount, getPageRange } from "../utils/tableList";

function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}) {
  const totalPages = getPageCount(totalCount, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const { start, end } = getPageRange(safePage, pageSize, totalCount);
  const hasMultiplePages = totalPages > 1;

  return (
    <div className="table-pagination">
      <span className="table-pagination-meta">
        {totalCount === 0
          ? "No records"
          : `Showing ${start}-${end} of ${totalCount}`}
      </span>
      {hasMultiplePages && (
        <div className="table-pagination-actions">
          <button
            type="button"
            className="button-small"
            disabled={disabled || safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Previous
          </button>
          <span className="table-pagination-page">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="button-small"
            disabled={disabled || safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default TablePagination;
