import { useState } from "react";
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDataTable } from "../hooks/useDataTable";
import ColumnPickerModal from "./ColumnPickerModal";
import TablePagination from "./TablePagination";

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="data-table-sort-icon muted" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="data-table-sort-icon active" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      {direction === "asc" ? (
        <path d="M12 5l6 8H6l6-8z" fill="currentColor" />
      ) : (
        <path d="M12 19l-6-8h12l-6 8z" fill="currentColor" />
      )}
    </svg>
  );
}

function isInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      'a, button, input, select, textarea, label, [role="button"], [data-row-click-ignore="true"]'
    )
  );
}

function DataTable({
  rows,
  columns,
  defaultVisibleColumns,
  columnLabels = {},
  storageKey,
  getRowLink,
  linkState,
  onRowClick,
  formatCell,
  getRowClassName,
  emptyMessage = "No records to display.",
  serverSide = false,
  sort: controlledSort,
  onSortChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  paginated = false,
  refreshing = false,
  reorderable = false,
  onReorder,
}) {
  const navigate = useNavigate();
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  const {
    availableColumns,
    visibleColumns,
    sortedRows,
    sort,
    toggleSort,
    setVisibleColumns,
    resetColumns,
  } = useDataTable({
    rows,
    columns,
    defaultVisibleColumns,
    storageKey,
    serverSide,
    sort: controlledSort,
    onSortChange,
  });

  const displayCount = serverSide ? totalCount ?? rows.length : sortedRows.length;
  const rowsAreClickable = Boolean(getRowLink || onRowClick);
  const headerColSpan = visibleColumns.length + (reorderable ? 1 : 0);

  const toolbar = (
    <>
      <div className="data-table-meta">
        {displayCount} row{displayCount === 1 ? "" : "s"}
        {reorderable ? <span> · drag handle to reorder</span> : null}
        {!reorderable && sort?.column && (
          <span>
            {" "}
            · sorted by {columnLabels[sort.column] ?? sort.column} ({sort.direction})
          </span>
        )}
      </div>
      <div className="data-table-toolbar-actions">
        <button
          type="button"
          className="data-table-columns-button"
          onClick={() => setColumnsOpen(true)}
        >
          Columns
        </button>
      </div>
    </>
  );

  const handleRowActivate = (row, index) => {
    if (onRowClick) {
      onRowClick(row, index);
      return;
    }
    if (getRowLink) {
      navigate(getRowLink(row, index), linkState ? { state: linkState } : undefined);
    }
  };

  const finishReorder = (toIndex) => {
    if (!reorderable || onReorder == null || dragIndex == null || toIndex == null) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    if (dragIndex !== toIndex) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  if (!serverSide && rows.length === 0) {
    return <p className="subtext">{emptyMessage}</p>;
  }

  if (serverSide && displayCount === 0) {
    return null;
  }

  return (
    <div className={`data-table${refreshing ? " data-table-refreshing" : ""}`}>
      <div className="data-table-toolbar data-table-toolbar-mobile">{toolbar}</div>

      <ColumnPickerModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        availableColumns={availableColumns}
        selectedColumns={visibleColumns}
        columnLabels={columnLabels}
        onApply={setVisibleColumns}
        onReset={resetColumns}
      />

      <div className={`table-wrap${paginated ? " table-wrap-natural" : ""}`}>
        <table className="data-table-stackable">
          <thead>
            <tr className="data-table-toolbar-row">
              <th colSpan={Math.max(headerColSpan, 1)}>
                <div className="data-table-toolbar data-table-toolbar-embedded">{toolbar}</div>
              </th>
            </tr>
            <tr className="data-table-columns-row">
              {reorderable ? (
                <th className="data-table-reorder-col" aria-label="Reorder">
                  <span className="visually-hidden">Reorder</span>
                </th>
              ) : null}
              {visibleColumns.map((column) => {
                const isSorted = sort?.column === column;
                const direction = isSorted ? sort.direction : null;

                return (
                  <th key={column}>
                    <button
                      type="button"
                      className="data-table-sort-button"
                      onClick={() => toggleSort(column)}
                      aria-label={`Sort by ${columnLabels[column] ?? column}`}
                    >
                      <span>{columnLabels[column] ?? column}</span>
                      <SortIcon direction={direction} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const customClass = getRowClassName?.(row) || "";
              const rowClassName = [
                customClass,
                rowsAreClickable ? "data-table-row-clickable" : "",
                dragIndex === index ? "is-dragging" : "",
                dropIndex === index ? "is-drop-target" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <tr
                  key={row.id ?? index}
                  className={rowClassName || undefined}
                  tabIndex={rowsAreClickable ? 0 : undefined}
                  role={rowsAreClickable ? "link" : undefined}
                  onDragOver={
                    reorderable
                      ? (event) => {
                          event.preventDefault();
                          if (dropIndex !== index) setDropIndex(index);
                        }
                      : undefined
                  }
                  onDrop={
                    reorderable
                      ? (event) => {
                          event.preventDefault();
                          finishReorder(index);
                        }
                      : undefined
                  }
                  onClick={
                    rowsAreClickable
                      ? (event) => {
                          if (isInteractiveTarget(event.target)) return;
                          handleRowActivate(row, index);
                        }
                      : undefined
                  }
                  onKeyDown={
                    rowsAreClickable
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          if (isInteractiveTarget(event.target)) return;
                          event.preventDefault();
                          handleRowActivate(row, index);
                        }
                      : undefined
                  }
                >
                  {reorderable ? (
                    <td className="data-table-reorder-col" data-label="Reorder" data-row-click-ignore="true">
                      <button
                        type="button"
                        className="data-table-drag-handle"
                        draggable
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          setDragIndex(index);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDropIndex(null);
                        }}
                      >
                        <GripVertical size={16} aria-hidden="true" />
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.map((column) => {
                    const rawValue = row[column];
                    const formatted = formatCell ? formatCell(column, rawValue, row) : null;
                    const value = formatted ?? (rawValue === null ? "null" : String(rawValue));
                    const key = `${row.id ?? index}-${column}`;
                    const label = columnLabels[column] ?? column;
                    const cellContent =
                      typeof value === "string" ? (
                        <span className="data-table-cell-text" title={value}>
                          {value}
                        </span>
                      ) : (
                        value
                      );

                    return (
                      <td key={key} data-label={label}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginated && onPageChange && pageSize && (
        <TablePagination
          page={page ?? 1}
          pageSize={pageSize}
          totalCount={totalCount ?? 0}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

export default DataTable;
