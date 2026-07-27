import { isLiabilityAccountType, isLoanAccountType } from "./money";

export const SITE_ACCOUNT_TYPE_NAME = "Site account";

/** Not shown on the account create/edit form (managed by dedicated UI instead). */
export const ACCOUNT_FORM_HIDDEN_FIELDS = new Set([
  "user_id",
  "balance",
  "image_path",
  "image_mime_type",
  "sort_order",
]);

/** APR / min payment for credit cards and loans. */
export const LIABILITY_ONLY_FIELDS = new Set(["apr", "minimum_payment"]);

/** Revolving limit — credit cards and lines of credit (loans use opening_balance as starting owed). */
export const CREDIT_CARD_ONLY_FIELDS = new Set(["credit_limit"]);

/** Starting cash (banks) or starting amount owed (cards/loans). */
export const OPENING_BALANCE_FIELD = "opening_balance";

/** Hidden from the accounts list grid (sensitive, verbose, or managed elsewhere). */
export const ACCOUNT_LIST_HIDDEN_FIELDS = new Set([
  "site_password",
  "notes",
  "image_path",
  "image_mime_type",
  "sort_order",
]);

const ACCOUNT_FORM_FIELD_ORDER = [
  "name",
  "account_type_id",
  "owner_user_id",
  "is_joint",
  "opening_balance",
  "credit_limit",
  "apr",
  "minimum_payment",
  "account_number",
  "login_url",
  "site_username",
  "site_password",
  "notes",
];

export function isSiteAccountType(typeName = "") {
  return typeName === SITE_ACCOUNT_TYPE_NAME;
}

/** Loans and site logins are not spending accounts — hide category pie charts for them. */
export function shouldShowSpendingByCategoryChart(accountTypeName = "") {
  return !isLoanAccountType(accountTypeName) && !isSiteAccountType(accountTypeName);
}

export function filterAccountListColumns(columnNames) {
  return columnNames.filter((name) => !ACCOUNT_LIST_HIDDEN_FIELDS.has(name));
}

export function filterAccountFormColumns(columns) {
  return columns.filter((column) => !ACCOUNT_FORM_HIDDEN_FIELDS.has(column.name));
}

export function sortAccountFormColumns(columns) {
  const order = new Map(ACCOUNT_FORM_FIELD_ORDER.map((name, index) => [name, index]));

  return [...columns].sort((left, right) => {
    const leftIndex = order.has(left.name) ? order.get(left.name) : 999;
    const rightIndex = order.has(right.name) ? order.get(right.name) : 999;
    return leftIndex - rightIndex || left.name.localeCompare(right.name);
  });
}

/** Whether a form field should appear for the selected account type. */
export function isAccountFormFieldVisible(columnName, accountTypeName = "") {
  if (columnName === OPENING_BALANCE_FIELD) {
    // Banks: starting cash. Cards/loans: starting amount owed (before app transactions).
    return !isSiteAccountType(accountTypeName);
  }

  if (CREDIT_CARD_ONLY_FIELDS.has(columnName)) {
    return isLiabilityAccountType(accountTypeName) && !isLoanAccountType(accountTypeName);
  }

  if (LIABILITY_ONLY_FIELDS.has(columnName)) {
    return isLiabilityAccountType(accountTypeName);
  }

  return true;
}

export function filterVisibleAccountFormColumns(columns, accountTypeName = "") {
  return columns.filter((column) => isAccountFormFieldVisible(column.name, accountTypeName));
}

export function getAccountOpeningBalanceLabel(accountTypeName = "") {
  if (isLoanAccountType(accountTypeName)) {
    return "Starting amount owed";
  }
  if (isLiabilityAccountType(accountTypeName)) {
    return "Starting amount owed";
  }
  return "Opening balance";
}

/**
 * Values to write for type-specific fields that are hidden for the selected type,
 * so switching types does not leave stale credit limits / balances behind.
 */
export function getHiddenAccountFieldDefaults(accountTypeName = "", existingValues = {}) {
  const defaults = {};

  if (!isAccountFormFieldVisible(OPENING_BALANCE_FIELD, accountTypeName)) {
    defaults[OPENING_BALANCE_FIELD] = 0;
  }

  for (const fieldName of LIABILITY_ONLY_FIELDS) {
    if (!isAccountFormFieldVisible(fieldName, accountTypeName)) {
      defaults[fieldName] = null;
    }
  }

  for (const fieldName of CREDIT_CARD_ONLY_FIELDS) {
    if (!isAccountFormFieldVisible(fieldName, accountTypeName)) {
      defaults[fieldName] = null;
    }
  }

  return defaults;
}
