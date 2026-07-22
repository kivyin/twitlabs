import {
  ACCOUNT_REGISTER_COLUMN_LABELS,
  ACCOUNT_REGISTER_COLUMNS,
} from "../hooks/useAccountRegister";
import { formatCurrency, formatShortDate } from "../utils/format";
import { getSignedAmountClass } from "../utils/money";
import DataTable from "./DataTable";
import TableFilterBuilder from "./TableFilterBuilder";

/**
 * Filterable, sortable transactions table for an account register. Shared by
 * the compact panel on the account edit form and the full register page so
 * both offer the same sort/filter capabilities from one implementation.
 */
function AccountRegisterTable({ appName, register, pageSize, emptyMessage }) {
  const {
    transactions,
    page,
    setPage,
    totalCount,
    sort,
    onSortChange,
    draftConditions,
    setDraftConditions,
    columnTypeMap,
    onApplyFilter,
    onClearFilter,
    activeFilterCount,
    initialLoading,
    refreshing,
    savingId,
    error,
    toggleCleared,
  } = register;

  const hasFilters = activeFilterCount > 0;

  const formatCell = (column, value, row) => {
    if (column === "cleared") {
      return (
        <input
          type="checkbox"
          checked={Number(row.cleared) === 1}
          disabled={savingId === row.id}
          onChange={() => toggleCleared(row)}
          aria-label={`Mark transaction ${row.id} cleared`}
        />
      );
    }
    if (column === "transaction_date") {
      return formatShortDate(value);
    }
    if (column === "description" || column === "category_name") {
      return value || "—";
    }
    if (column === "amount" || column === "running_balance") {
      return <span className={getSignedAmountClass(value)}>{formatCurrency(value)}</span>;
    }
    return null;
  };

  return (
    <div className="account-register-table">
      <TableFilterBuilder
        columns={ACCOUNT_REGISTER_COLUMNS}
        columnLabels={ACCOUNT_REGISTER_COLUMN_LABELS}
        columnTypeMap={columnTypeMap}
        conditions={draftConditions}
        onChange={setDraftConditions}
        onApply={onApplyFilter}
        onClear={onClearFilter}
        applying={refreshing}
        activeCount={activeFilterCount}
      />

      {initialLoading && <p className="subtext">Loading transactions...</p>}
      {error && <p className="error">{error}</p>}

      {!initialLoading && !error && totalCount === 0 && (
        <div className="empty-state">
          <p className="subtext">
            {hasFilters ? "No transactions match the current filter." : emptyMessage}
          </p>
          {hasFilters && (
            <button type="button" onClick={onClearFilter}>
              Clear filter
            </button>
          )}
        </div>
      )}

      {!initialLoading && !error && totalCount > 0 && (
        <DataTable
          storageKey="data-table:account-register"
          columns={ACCOUNT_REGISTER_COLUMNS}
          defaultVisibleColumns={ACCOUNT_REGISTER_COLUMNS}
          columnLabels={ACCOUNT_REGISTER_COLUMN_LABELS}
          rows={transactions}
          serverSide
          sort={sort}
          onSortChange={onSortChange}
          paginated
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          refreshing={refreshing}
          formatCell={formatCell}
          getRowClassName={(row) => (Number(row.cleared) === 1 ? "cleared-row" : "")}
          getRowLink={(row) =>
            row.transaction_kind === "transfer"
              ? `/app/${appName}/transfers/${row.id}/edit`
              : `/app/${appName}/transactions/${row.id}/edit`
          }
        />
      )}
    </div>
  );
}

export default AccountRegisterTable;
