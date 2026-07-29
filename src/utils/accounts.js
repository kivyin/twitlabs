import { isLiabilityAccountType, isLoanAccountType } from "./money";

export const SITE_ACCOUNT_TYPE_NAME = "Site account";
export const SITE_TRACKER_APP = "site-tracker";

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

/** Extra money columns hidden when browsing Site Tracker accounts. */
export const SITE_TRACKER_LIST_HIDDEN_FIELDS = new Set([
  "opening_balance",
  "balance",
  "credit_limit",
  "apr",
  "minimum_payment",
  "is_joint",
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

/** Which account types an app may list / create: "site", "budget", or null (no filter). */
export function getAccountAppScope(appName = "") {
  if (appName === SITE_TRACKER_APP) {
    return "site";
  }
  if (appName === "budget") {
    return "budget";
  }
  return null;
}

export function accountTypeAllowedForScope(typeName = "", scope) {
  if (!scope) {
    return true;
  }
  const isSite = isSiteAccountType(typeName);
  return scope === "site" ? isSite : !isSite;
}

/**
 * SQL fragment + params that restrict accounts by Site vs budget types.
 * Empty sql when scope is null.
 */
export function buildAccountTypeScopeClause(scope, columnSql = "account_type_id") {
  if (scope === "site") {
    return {
      sql: `${columnSql} IN (SELECT id FROM account_types WHERE name = ?)`,
      params: [SITE_ACCOUNT_TYPE_NAME],
    };
  }
  if (scope === "budget") {
    return {
      sql: `${columnSql} NOT IN (SELECT id FROM account_types WHERE name = ?)`,
      params: [SITE_ACCOUNT_TYPE_NAME],
    };
  }
  return { sql: "", params: [] };
}

export function mergeWhereClauses(baseWhere = "", baseParams = [], extraSql = "", extraParams = []) {
  const parts = [baseWhere, extraSql].map((part) => String(part || "").trim()).filter(Boolean);
  return {
    where: parts.length === 0 ? "" : parts.map((part) => `(${part})`).join(" AND "),
    whereParams: [...(baseParams ?? []), ...(extraParams ?? [])],
  };
}

export function filterAccountTypeOptions(options = [], scope) {
  if (!scope) {
    return options;
  }
  return options.filter((option) => accountTypeAllowedForScope(option.label ?? "", scope));
}

/** Loans and site logins are not spending accounts — hide category pie charts for them. */
export function shouldShowSpendingByCategoryChart(accountTypeName = "") {
  return !isLoanAccountType(accountTypeName) && !isSiteAccountType(accountTypeName);
}

export function filterAccountListColumns(columnNames, appName = "budget") {
  return columnNames.filter((name) => {
    if (ACCOUNT_LIST_HIDDEN_FIELDS.has(name)) {
      return false;
    }
    if (getAccountAppScope(appName) === "site" && SITE_TRACKER_LIST_HIDDEN_FIELDS.has(name)) {
      return false;
    }
    return true;
  });
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
  if (columnName === "is_joint" && isSiteAccountType(accountTypeName)) {
    return false;
  }

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

  if (!isAccountFormFieldVisible("is_joint", accountTypeName)) {
    defaults.is_joint = 0;
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
