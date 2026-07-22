import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { deleteRows, clearTable, runQuery, selectRows } from "../api/dbApi";
import { exportTransactionsCsv, postDueRecurringTransactions, reorderAccounts } from "../api/budgetApi";
import { deleteTransaction } from "../api/transactionApi";
import ReceiptScanModal from "../components/ReceiptScanModal";
import TransactionImportModal from "../components/TransactionImportModal";
import { getCollectionDefinition, getFieldDefinitions } from "../api/dictionaryApi";
import AccountTile from "../components/AccountTile";
import BrowseLink from "../components/BrowseLink";
import SpendingByCategoryPieChart from "../components/SpendingByCategoryPieChart";
import ConfirmModal from "../components/common/ConfirmModal";
import DataTable from "../components/DataTable";
import TableFilterBuilder from "../components/TableFilterBuilder";
import TablePagination from "../components/TablePagination";
import PageHeader from "../components/PageHeader";
import { filterAccountListColumns } from "../utils/accounts";
import { filterAuditColumns } from "../utils/auditFields";
import { formatCurrency } from "../utils/format";
import { getSignedAmountClass, isMoneyField } from "../utils/money";
import { getRecordLabel } from "../utils/tableForm";
import {
  buildColumnTypeMap,
  buildWhereFromConditions,
  clearStoredFilterConditions,
  createEmptyFilterCondition,
  hasActiveFilters,
  loadStoredFilterConditions,
  saveFilterConditions,
} from "../utils/tableFilter";
import { useForeignKeyLabelMaps } from "../hooks/useForeignKeyLabelMaps";
import { ACCOUNTS_PAGE_SIZE, resolveDefaultSortColumn, TABLE_PAGE_SIZE } from "../utils/tableList";
function TableListPage() {
  const { appName = "budget", table } = useParams();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [pkColumn, setPkColumn] = useState("id");
  const [tableLabel, setTableLabel] = useState(table);
  const [columnLabels, setColumnLabels] = useState({});
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [pragmaForeignKeys, setPragmaForeignKeys] = useState([]);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [draftConditions, setDraftConditions] = useState([createEmptyFilterCondition()]);
  const [appliedConditions, setAppliedConditions] = useState([]);
  const [filtersReady, setFiltersReady] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [postingDue, setPostingDue] = useState(false);
  const [listStatus, setListStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState({ column: null, direction: null });
  const [viewMode, setViewMode] = useState("list");
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [reordering, setReordering] = useState(false);
  const { formatReference } = useForeignKeyLabelMaps({
    table,
    fieldDefinitions,
    pragmaForeignKeys,
    columns,
    enabled: metaReady,
  });
  const filterStorageKey = `table-filters:${appName}:${table}`;
  const pageSize = table === "accounts" ? ACCOUNTS_PAGE_SIZE : TABLE_PAGE_SIZE;

  const columnTypeMap = useMemo(
    () => buildColumnTypeMap(columns, fieldDefinitions),
    [columns, fieldDefinitions]
  );

  const filterableColumns = useMemo(() => {
    if (columns.length > 0) {
      return columns.map((column) => column.name);
    }
    if (rows.length > 0) {
      return Object.keys(rows[0]);
    }
    return [];
  }, [columns, rows]);

  const columnNames = useMemo(() => columns.map((column) => column.name), [columns]);
  const defaultSort = useMemo(
    () => resolveDefaultSortColumn(columnNames),
    [columnNames]
  );
  const sortColumn = sort.column ?? defaultSort.column;
  const sortDirection = sort.direction ?? defaultSort.direction;
  const activeSort = useMemo(
    () => ({ column: sortColumn, direction: sortDirection }),
    [sortColumn, sortDirection]
  );
  const canReorderAccounts =
    table === "accounts" &&
    sortColumn === "sort_order" &&
    sortDirection === "asc" &&
    !reordering;

  useEffect(() => {
    let cancelled = false;

    setInitialLoading(true);
    setMetaReady(false);
    setRows([]);
    setTotalCount(0);
    setError("");
    if (table === "accounts") {
      try {
        setViewMode(localStorage.getItem(`account-view-mode:${appName}`) === "tiles" ? "tiles" : "list");
      } catch {
        setViewMode("list");
      }
    } else {
      setViewMode("list");
    }

    async function loadMeta() {
      try {
        const [tableDefinition, fieldDefinitionsResult, info, fkInfo] = await Promise.all([
          getCollectionDefinition(table, appName),
          getFieldDefinitions(table, appName),
          runQuery({
            table,
            sql: `PRAGMA table_info(${table})`,
          }),
          runQuery({
            table,
            sql: `PRAGMA foreign_key_list(${table})`,
          }),
        ]);

        if (cancelled) {
          return;
        }

        const tableColumns = info.rows ?? [];
        setTableLabel(tableDefinition?.label ?? table);
        setColumnLabels(
          Object.fromEntries(fieldDefinitionsResult.map((field) => [field.name, field.label]))
        );
        setFieldDefinitions(fieldDefinitionsResult);
        setPragmaForeignKeys(fkInfo.rows ?? []);
        setColumns(tableColumns);

        const primaryColumn =
          tableColumns.find((column) => Number(column.pk) === 1)?.name ??
          tableColumns[0]?.name ??
          "id";
        setPkColumn(primaryColumn);
        setMetaReady(true);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    loadMeta();

    return () => {
      cancelled = true;
    };
  }, [appName, table]);

  const fetchRows = useCallback(async () => {
    if (!metaReady || columns.length === 0) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      const typeMap = buildColumnTypeMap(columns, fieldDefinitions);
      const { where, whereParams } = buildWhereFromConditions(appliedConditions, typeMap);
      const resolvedSort = resolveDefaultSortColumn(columns.map((column) => column.name));
      const orderBy = sortColumn ?? resolvedSort.column;
      const orderDirection = sortDirection ?? resolvedSort.direction;

      const result = await selectRows({
        table,
        where,
        whereParams,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy,
        orderDirection,
        countTotal: true,
      });
      setRows(result.rows);
      setTotalCount(result.total ?? result.rows.length);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
    }
  }, [
    metaReady,
    columns,
    fieldDefinitions,
    appliedConditions,
    table,
    page,
    pageSize,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setFiltersReady(false);
    const stored = loadStoredFilterConditions(filterStorageKey);
    setDraftConditions(stored);
    setAppliedConditions(hasActiveFilters(stored) ? stored : []);
    setPage(1);
    setSort({ column: null, direction: null });
    setFiltersReady(true);
  }, [filterStorageKey]);

  useEffect(() => {
    if (!sort.column || columnNames.length === 0) {
      return;
    }
    if (!columnNames.includes(sort.column)) {
      setSort({ column: null, direction: null });
    }
  }, [columnNames, sort.column]);

  useEffect(() => {
    if (!filtersReady || !metaReady) {
      return;
    }
    fetchRows();
  }, [filtersReady, metaReady, fetchRows]);

  const allColumns = useMemo(() => {
    let names = [];
    if (columns.length > 0) {
      names = columns.map((column) => column.name);
    } else if (rows.length > 0) {
      names = Object.keys(rows[0]);
    }

    if (table === "accounts") {
      return filterAccountListColumns(names);
    }

    if (table === "transactions") {
      return names.filter((name) => name !== "linked_transaction_id");
    }

    return names;
  }, [columns, rows, table]);

  const defaultVisibleColumns = useMemo(() => {
    const audited = filterAuditColumns(allColumns);

    if (table !== "accounts") {
      return audited;
    }

    const preferred = [
      "name",
      "account_type_id",
      "owner_user_id",
      "is_joint",
      "opening_balance",
      "balance",
      "credit_limit",
      "apr",
      "minimum_payment",
    ];
    const ordered = preferred.filter((name) => audited.includes(name));
    const rest = audited.filter((name) => !preferred.includes(name));
    return [...ordered, ...rest];
  }, [allColumns, table]);

  const formatCell = useMemo(() => {
    return (column, value) => {
      const referenceLabel = formatReference(column, value);
      if (referenceLabel !== null) {
        return referenceLabel;
      }

      if (table === "categories" && column === "tax_deductible") {
        return Number(value) === 1 ? "Yes" : "No";
      }

      if (table === "accounts" && column === "is_joint") {
        return Number(value) === 1 ? "Yes" : "No";
      }

      if (isMoneyField(table, column) && value !== null && value !== "") {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          return (
            <span className={getSignedAmountClass(numeric)}>
              {formatCurrency(numeric)}
            </span>
          );
        }
      }

      if (table !== "transactions") {
        return null;
      }

      if (column === "transaction_kind" && value === "transfer") {
        return <span className="kind-badge">Transfer</span>;
      }
      if (column === "transaction_kind" && value === "split") {
        return <span className="kind-badge">Split</span>;
      }
      if (column === "transaction_kind" && value === "standard") {
        return "Standard";
      }
      return null;
    };
  }, [formatReference, table]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const rowId = deleteTarget[pkColumn];
      if (table === "transactions") {
        await deleteTransaction(rowId);
      } else {
        await deleteRows({
          table,
          where: `${pkColumn} = ?`,
          whereParams: [rowId],
        });
      }

      setDeleteTarget(null);
      await fetchRows();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    setError("");
    setListStatus("");

    try {
      const result = await clearTable(table);
      setShowClearConfirm(false);
      setListStatus(
        `Deleted ${result.cleared ?? result.archived ?? 0} ${tableLabel.toLowerCase()} record(s).`
      );
      setPage(1);
      await fetchRows();
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setClearing(false);
    }
  };

  const deleteMessage = deleteTarget
    ? table === "transactions"
      ? `This will remove the transaction "${getRecordLabel(deleteTarget, pkColumn, table)}". Linked payment entries will also be archived. You can restore them from Administration > Deleted Records.`
      : table === "accounts"
        ? `This will remove "${getRecordLabel(deleteTarget, pkColumn, table)}" and its related transactions, recurring items, and account image. You can restore archived rows from Administration > Deleted Records.`
        : `This will remove "${getRecordLabel(deleteTarget, pkColumn, table)}" from ${tableLabel}. You can restore it from Administration > Deleted Records.`
    : "";

  const clearAllMessage = `This will permanently clear ALL ${totalCount} record(s) from ${tableLabel}.${
    table === "accounts"
      ? " Related transactions, recurring bills, and account images will also be removed."
      : table === "transactions"
        ? " Attachments and split lines will also be removed."
        : ""
  } Archived copies may be available under Administration > Deleted Records. This cannot be undone from this page.`;

  const handleApplyFilter = () => {
    try {
      buildWhereFromConditions(draftConditions, columnTypeMap);
      saveFilterConditions(filterStorageKey, draftConditions);
      setAppliedConditions([...draftConditions]);
      setPage(1);
      setError("");
    } catch (filterError) {
      setError(filterError.message);
    }
  };

  const handleClearFilter = () => {
    const empty = [createEmptyFilterCondition()];
    setDraftConditions(empty);
    setAppliedConditions([]);
    clearStoredFilterConditions(filterStorageKey);
    setPage(1);
    setError("");
  };

  const handleSortChange = (nextSort) => {
    setPage(1);
    if (!nextSort.column) {
      setSort(
        defaultSort.column
          ? defaultSort
          : table === "accounts"
            ? { column: "sort_order", direction: "asc" }
            : { column: "id", direction: "desc" }
      );
      return;
    }
    setSort(nextSort);
  };

  const persistAccountOrder = async (nextRows) => {
    const previousRows = rows;
    setRows(nextRows);
    setReordering(true);
    setError("");
    try {
      await reorderAccounts(nextRows.map((row) => row[pkColumn]));
      setListStatus("Account order saved.");
    } catch (reorderError) {
      setRows(previousRows);
      setError(reorderError.message || "Unable to save account order.");
    } finally {
      setReordering(false);
      setDragIndex(null);
      setDropIndex(null);
    }
  };

  const handleAccountReorder = (fromIndex, toIndex) => {
    if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
    const nextRows = [...rows];
    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(toIndex, 0, moved);
    persistAccountOrder(nextRows);
  };

  const activeFilterCount = appliedConditions.filter((condition) => {
    if (!condition.column || !condition.operator) return false;
    if (condition.operator === "is_null" || condition.operator === "is_not_null") return true;
    return condition.value !== "" && condition.value !== null && condition.value !== undefined;
  }).length;

  const hasAppliedFilters = activeFilterCount > 0;
  const showEmptyCreate =
    metaReady && !initialLoading && !refreshing && !error && totalCount === 0 && !hasAppliedFilters;
  const showEmptyFilter =
    metaReady && !initialLoading && !refreshing && !error && totalCount === 0 && hasAppliedFilters;
  const showTable = metaReady && !error && totalCount > 0;

  const handleExportTransactions = async () => {
    setExporting(true);
    setListStatus("");
    setError("");

    try {
      const csv = await exportTransactionsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "transactions.csv";
      link.click();
      URL.revokeObjectURL(url);
      setListStatus("Transactions exported.");
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePostDueRecurring = async () => {
    setPostingDue(true);
    setListStatus("");
    setError("");

    try {
      const result = await postDueRecurringTransactions();
      setListStatus(
        result.posted_count > 0
          ? `Posted ${result.posted_count} recurring bill${result.posted_count === 1 ? "" : "s"}.`
          : "No due recurring bills to post."
      );
      await fetchRows();
    } catch (postError) {
      setError(postError.message);
    } finally {
      setPostingDue(false);
    }
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(`account-view-mode:${appName}`, mode);
    } catch {
      // Ignore storage failures (e.g. private browsing).
    }
  };

  const tableActions = (
    <>
      {table === "accounts" && (
        <div className="account-view-toggle" role="group" aria-label="Accounts view">
          <button
            type="button"
            className={`account-view-toggle-button${viewMode === "list" ? " active" : ""}`}
            aria-pressed={viewMode === "list"}
            onClick={() => handleSetViewMode("list")}
          >
            <ListIcon size={15} aria-hidden="true" />
            List
          </button>
          <button
            type="button"
            className={`account-view-toggle-button${viewMode === "tiles" ? " active" : ""}`}
            aria-pressed={viewMode === "tiles"}
            onClick={() => handleSetViewMode("tiles")}
          >
            <LayoutGrid size={15} aria-hidden="true" />
            Tiles
          </button>
        </div>
      )}
      {table === "accounts" && !canReorderAccounts && (
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSort({ column: "sort_order", direction: "asc" });
          }}
        >
          Custom order
        </button>
      )}
      {table === "transactions" && (
        <>
          <BrowseLink className="button" to={`/app/${appName}/transfers/new`}>
            New transfer
          </BrowseLink>
          <button type="button" onClick={() => setShowReceiptScanModal(true)}>
            Scan receipt
          </button>
          <button type="button" onClick={() => setShowImportModal(true)}>
            Import CSV
          </button>
          <button type="button" onClick={handleExportTransactions} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </>
      )}
      {table === "recurring_transactions" && (
        <button type="button" onClick={handlePostDueRecurring} disabled={postingDue}>
          {postingDue ? "Posting..." : "Post due bills"}
        </button>
      )}
      {totalCount > 0 && (
        <button
          type="button"
          className="danger-button"
          onClick={() => setShowClearConfirm(true)}
          disabled={clearing || initialLoading}
        >
          Delete all
        </button>
      )}
      <BrowseLink className="button-primary" to={`/app/${appName}/${table}/new`}>
        + New{" "}
        {table === "transactions"
          ? "transaction"
          : table === "recurring_transactions"
            ? "recurring bill"
            : table === "goals"
              ? "goal"
              : "record"}
      </BrowseLink>
    </>
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: tableLabel },
        ]}
        title={`${tableLabel} records`}
        subtitle={
          table === "transactions"
            ? "Transfer payments show on both accounts and are linked together."
            : table === "accounts"
              ? canReorderAccounts
                ? "Drag the grip handle to reorder accounts. Sorting by a column pauses custom order."
                : "Browse accounts in list or tiles. Choose Custom order to drag and rearrange."
              : "Browse, edit, create, and delete records for this table."
        }
      />

      {table === "transactions" && (
        <section className="panel transactions-spending-panel">
          <SpendingByCategoryPieChart title="Spending by category" defaultMonths={1} />
        </section>
      )}

      <section className="panel">
        {listStatus && <p className="status">{listStatus}</p>}
        {filterableColumns.length > 0 && (
          <TableFilterBuilder
            columns={filterableColumns}
            columnLabels={columnLabels}
            columnTypeMap={columnTypeMap}
            conditions={draftConditions}
            onChange={setDraftConditions}
            onApply={handleApplyFilter}
            onClear={handleClearFilter}
            applying={refreshing}
            activeCount={activeFilterCount}
          />
        )}

        <div className="toolbar list-record-toolbar">
          <div>
            <h2>{tableLabel}</h2>
            <p className="subtext">
              {initialLoading
                ? "Loading..."
                : `${totalCount} record${totalCount === 1 ? "" : "s"}`}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <div className="toolbar-actions">{tableActions}</div>
        </div>

        {initialLoading && <p className="subtext">Loading records...</p>}
        {error && <p className="error">{error}</p>}
        {showEmptyCreate && (
          <div className="empty-state">
            <p className="subtext">No records found yet.</p>
            <BrowseLink className="button-primary" to={`/app/${appName}/${table}/new`}>
              Create the first record
            </BrowseLink>
          </div>
        )}
        {showEmptyFilter && (
          <div className="empty-state">
            <p className="subtext">No records match the current filter.</p>
            <button type="button" onClick={handleClearFilter}>
              Clear filter
            </button>
          </div>
        )}

        {showTable && table === "accounts" && viewMode === "tiles" && (
          <>
            <div className={`account-tile-grid${refreshing || reordering ? " account-tile-grid-refreshing" : ""}`}>
              {rows.map((row, index) => (
                <AccountTile
                  key={row[pkColumn]}
                  account={{
                    ...row,
                    owner_label: formatReference("owner_user_id", row.owner_user_id),
                  }}
                  accountId={row[pkColumn]}
                  appName={appName}
                  typeLabel={formatReference("account_type_id", row.account_type_id)}
                  onDelete={setDeleteTarget}
                  reorderable={canReorderAccounts}
                  isDragging={dragIndex === index}
                  isDropTarget={dropIndex === index}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={() => {
                    if (dropIndex !== index) setDropIndex(index);
                  }}
                  onDrop={() => handleAccountReorder(dragIndex, index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                />
              ))}
            </div>
            {totalCount > pageSize ? (
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                disabled={refreshing}
              />
            ) : null}
          </>
        )}

        {showTable && !(table === "accounts" && viewMode === "tiles") && (
          <DataTable
            key={`${appName}:${table}`}
            storageKey={`data-table:${appName}:${table}`}
            columns={allColumns}
            defaultVisibleColumns={defaultVisibleColumns}
            rows={rows}
            serverSide
            sort={activeSort}
            onSortChange={handleSortChange}
            paginated={totalCount > pageSize}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            refreshing={refreshing || reordering}
            columnLabels={columnLabels}
            formatCell={formatCell}
            reorderable={canReorderAccounts}
            onReorder={handleAccountReorder}
            getRowLink={(row, index) => {
              const rowId = row[pkColumn] ?? index;
              if (table === "transactions" && row.transaction_kind === "transfer") {
                return `/app/${appName}/transfers/${encodeURIComponent(String(rowId))}/edit`;
              }
              return `/app/${appName}/${table}/${encodeURIComponent(String(rowId))}/edit`;
            }}
          />
        )}
      </section>

      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${tableLabel.toLowerCase().replace(/s$/, "")}?`}
          message={deleteMessage}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          title={`Delete all ${tableLabel.toLowerCase()}?`}
          message={clearAllMessage}
          confirmLabel={clearing ? "Deleting..." : "Delete all records"}
          onCancel={() => !clearing && setShowClearConfirm(false)}
          onConfirm={handleClearAll}
        />
      )}

      {showImportModal && (
        <TransactionImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImported={async () => {
            await fetchRows();
          }}
        />
      )}

      {showReceiptScanModal ? (
        <ReceiptScanModal
          onClose={() => setShowReceiptScanModal(false)}
          appName={appName}
        />
      ) : null}    </>
  );
}

export default TableListPage;
