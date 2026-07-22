import { useCallback, useEffect, useRef, useState } from "react";
import { getAccountRegister, setTransactionCleared } from "../api/budgetApi";
import {
  buildWhereFromConditions,
  clearStoredFilterConditions,
  createEmptyFilterCondition,
  hasActiveFilters,
  loadStoredFilterConditions,
  saveFilterConditions,
} from "../utils/tableFilter";

export const ACCOUNT_REGISTER_COLUMNS = [
  "cleared",
  "transaction_date",
  "description",
  "category_name",
  "amount",
  "running_balance",
];

export const ACCOUNT_REGISTER_COLUMN_LABELS = {
  cleared: "Cleared",
  transaction_date: "Date",
  description: "Description",
  category_name: "Category",
  transaction_kind: "Type",
  amount: "Amount",
  running_balance: "Running balance",
  created_on: "Created",
};

export const ACCOUNT_REGISTER_COLUMN_TYPE_MAP = {
  transaction_date: "date",
  created_on: "datetime",
  description: "text",
  category_name: "text",
  transaction_kind: "text",
  amount: "number",
  running_balance: "number",
  cleared: "number",
};

const DEFAULT_SORT = { column: "transaction_date", direction: "desc" };

/**
 * Server-backed sort/filter/pagination for an account's transaction
 * register. Shared between the compact panel on the account edit form and
 * the full register page so both stay in sync with a single implementation.
 */
export function useAccountRegister({ accountId, pageSize = 20 }) {
  const filterStorageKey = accountId ? `account-register-filters:${accountId}` : null;

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [draftConditions, setDraftConditions] = useState(() =>
    loadStoredFilterConditions(filterStorageKey)
  );
  const [appliedConditions, setAppliedConditions] = useState(() => {
    const stored = loadStoredFilterConditions(filterStorageKey);
    return hasActiveFilters(stored) ? stored : [];
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const lastAccountIdRef = useRef(accountId);

  // Reset all account-scoped state when the account changes. This only
  // fires on an actual prop change (guarded by the ref), so it behaves like
  // a key-based remount rather than running on every render.
  useEffect(() => {
    if (lastAccountIdRef.current === accountId) {
      return;
    }
    lastAccountIdRef.current = accountId;
    const stored = loadStoredFilterConditions(filterStorageKey);
    setAccount(null);
    setTransactions([]);
    setTotalCount(0);
    setPage(1);
    setSort(DEFAULT_SORT);
    setInitialLoading(true);
    setDraftConditions(stored);
    setAppliedConditions(hasActiveFilters(stored) ? stored : []);
  }, [accountId, filterStorageKey]);

  const loadRegister = useCallback(async () => {
    if (!accountId) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      const { where, whereParams } = buildWhereFromConditions(
        appliedConditions,
        ACCOUNT_REGISTER_COLUMN_TYPE_MAP
      );

      const result = await getAccountRegister(accountId, {
        page,
        limit: pageSize,
        orderBy: sort.column,
        orderDirection: sort.direction,
        where,
        whereParams,
      });
      setAccount(result.account);
      setTransactions(result.transactions ?? []);
      setTotalCount(result.pagination?.total ?? result.transactions?.length ?? 0);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [accountId, page, pageSize, sort, appliedConditions]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  const handleSortChange = (nextSort) => {
    setPage(1);
    setSort(nextSort.column ? nextSort : DEFAULT_SORT);
  };

  const handleApplyFilter = () => {
    try {
      buildWhereFromConditions(draftConditions, ACCOUNT_REGISTER_COLUMN_TYPE_MAP);
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

  const activeFilterCount = appliedConditions.filter((condition) => {
    if (!condition.column || !condition.operator) return false;
    if (condition.operator === "is_null" || condition.operator === "is_not_null") return true;
    return condition.value !== "" && condition.value !== null && condition.value !== undefined;
  }).length;

  const toggleCleared = async (transaction) => {
    const nextCleared = Number(transaction.cleared) !== 1;
    setSavingId(transaction.id);
    setError("");

    try {
      await setTransactionCleared(transaction.id, nextCleared);
      await loadRegister();
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setSavingId(null);
    }
  };

  return {
    account,
    transactions,
    page,
    setPage,
    totalCount,
    sort,
    onSortChange: handleSortChange,
    draftConditions,
    setDraftConditions,
    columnTypeMap: ACCOUNT_REGISTER_COLUMN_TYPE_MAP,
    onApplyFilter: handleApplyFilter,
    onClearFilter: handleClearFilter,
    activeFilterCount,
    initialLoading,
    refreshing,
    savingId,
    error,
    setError,
    toggleCleared,
    reload: loadRegister,
  };
}
