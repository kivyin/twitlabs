import { apiRequest, authHeaders, triggerUnauthorized } from "./http";
import { invalidateForeignKeyLabelCache } from "../utils/foreignKeyLabelCache";

export function getBudgetVsActual(month) {
  const params = new URLSearchParams({ month });
  return apiRequest(`/api/budget/budget-vs-actual?${params.toString()}`);
}

export function getAccountRegister(
  accountId,
  { page = 1, limit = 20, orderBy = null, orderDirection = null, where = "", whereParams = [] } = {}
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (orderBy) params.set("orderBy", orderBy);
  if (orderDirection) params.set("orderDirection", orderDirection);
  if (where) {
    params.set("where", where);
    params.set("whereParams", JSON.stringify(whereParams));
  }
  return apiRequest(`/api/budget/accounts/${accountId}/register?${params.toString()}`);
}

export function uploadAccountImage(accountId, { fileBase64, mimeType }) {
  return apiRequest(`/api/budget/accounts/${accountId}/image`, {
    method: "POST",
    body: JSON.stringify({ file_base64: fileBase64, mime_type: mimeType }),
  });
}

export function deleteAccountImage(accountId) {
  return apiRequest(`/api/budget/accounts/${accountId}/image`, {
    method: "DELETE",
  });
}

export async function fetchAccountImageUrl(accountId) {
  const response = await fetch(`/api/budget/accounts/${accountId}/image`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    triggerUnauthorized();
    return "";
  }
  if (!response.ok) {
    return "";
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function setTransactionCleared(transactionId, cleared) {
  return apiRequest(`/api/budget/transactions/${transactionId}/cleared`, {
    method: "PUT",
    body: JSON.stringify({ cleared }),
  });
}

export function syncAccountBalance(accountId) {
  return apiRequest(`/api/budget/accounts/${accountId}/sync-balance`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getAccountJointUsers(accountId) {
  return apiRequest(`/api/budget/accounts/${accountId}/joint-users`);
}

export function setAccountJointUsers(accountId, userIds) {
  return apiRequest(`/api/budget/accounts/${accountId}/joint-users`, {
    method: "PUT",
    body: JSON.stringify({ user_ids: userIds }),
  });
}

export function getUpcomingBills(days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  return apiRequest(`/api/budget/upcoming-bills?${params.toString()}`);
}

export function postDueRecurringTransactions(asOfDate = null) {
  return apiRequest("/api/budget/recurring/post-due", {
    method: "POST",
    body: JSON.stringify({ as_of_date: asOfDate }),
  });
}

export function postRecurringTransaction(recurringId, postDate = null) {
  return apiRequest(`/api/budget/recurring/${recurringId}/post`, {
    method: "POST",
    body: JSON.stringify({ post_date: postDate }),
  });
}

export function matchPayeeRules(description, accountId = null) {
  const params = new URLSearchParams({ description });
  if (accountId) {
    params.set("account_id", String(accountId));
  }
  return apiRequest(`/api/budget/rules/match?${params.toString()}`);
}

export async function exportTransactionsCsv({ from, to, accountId } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (accountId) params.set("account_id", String(accountId));

  const response = await fetch(`/api/budget/export/transactions?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    triggerUnauthorized();
    throw new Error("Session expired. Please sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Export failed.");
  }
  return response.text();
}

export async function importTransactionsCsv(csv, skipDuplicates = true) {
  const result = await apiRequest("/api/budget/import/transactions", {
    method: "POST",
    body: JSON.stringify({ csv, skip_duplicates: skipDuplicates }),
  });
  invalidateForeignKeyLabelCache("payees");
  return result;
}

export function scanReceipt({ imageBase64, mimeType } = {}) {
  return apiRequest("/api/budget/receipts/scan", {
    method: "POST",
    body: JSON.stringify({
      image_base64: imageBase64,
      mime_type: mimeType,
    }),
  });
}

export function getGoals() {
  return apiRequest("/api/budget/goals");
}

export function syncGoalFromAccount(goalId) {
  return apiRequest(`/api/budget/goals/${goalId}/sync`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getNetWorth() {
  return apiRequest("/api/budget/net-worth");
}

export function getNetWorthHistory() {
  return apiRequest("/api/budget/net-worth/history");
}

export function captureNetWorthSnapshot(month = null) {
  return apiRequest("/api/budget/net-worth/snapshot", {
    method: "POST",
    body: JSON.stringify({ month }),
  });
}

export function getCashFlowForecast(days = 90) {
  const params = new URLSearchParams({ days: String(days) });
  return apiRequest(`/api/budget/cash-flow-forecast?${params.toString()}`);
}

export function calculateDebtPayoff({ strategy = "avalanche", extraPayment = 0 } = {}) {
  return apiRequest("/api/budget/debt-payoff", {
    method: "POST",
    body: JSON.stringify({ strategy, extra_payment: extraPayment }),
  });
}

export function getSpendingTrends(months = 12) {
  const params = new URLSearchParams({ months: String(months) });
  return apiRequest(`/api/budget/reports/spending-trends?${params.toString()}`);
}

export function getIncomeVsExpenseTrends(months = 12) {
  const params = new URLSearchParams({ months: String(months) });
  return apiRequest(`/api/budget/reports/income-vs-expense?${params.toString()}`);
}

export function getYearOverYearReport(month = new Date().getMonth() + 1) {
  const params = new URLSearchParams({ month: String(month) });
  return apiRequest(`/api/budget/reports/year-over-year?${params.toString()}`);
}

export function getTaxCategorySummary(year = null) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  return apiRequest(`/api/budget/reports/tax-summary?${params.toString()}`);
}

export function getCashFlowSankey({ month, accountId } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (accountId !== undefined && accountId !== null && accountId !== "") {
    params.set("account_id", String(accountId));
  }
  return apiRequest(`/api/budget/reports/cash-flow-sankey?${params.toString()}`);
}

export function reorderAccounts(ids) {
  return apiRequest("/api/budget/accounts/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}
