export const CREDIT_CARD_TYPE_NAME = "Credit Card";
export const LOAN_TYPE_NAME = "Loan";
export const LINE_OF_CREDIT_TYPE_NAME = "Line of Credit";

export const LIABILITY_ACCOUNT_TYPES = new Set([
  CREDIT_CARD_TYPE_NAME,
  LOAN_TYPE_NAME,
  LINE_OF_CREDIT_TYPE_NAME,
]);

export const BUDGET_MONEY_FIELDS = {
  accounts: ["balance", "opening_balance", "credit_limit", "minimum_payment"],
  transactions: ["amount"],
  budgets: ["amount"],
};

export function isMoneyField(table, fieldName) {
  return BUDGET_MONEY_FIELDS[table]?.includes(fieldName) ?? false;
}

export function isLineOfCreditAccountType(typeName = "") {
  const normalized = String(typeName || "").trim().toLowerCase();
  if (!normalized) return false;
  if (typeName === LINE_OF_CREDIT_TYPE_NAME) return true;
  return (
    normalized === "line of credit" ||
    normalized === "loc" ||
    normalized.includes("line of credit") ||
    normalized.includes("heloc") ||
    normalized === "home equity line of credit"
  );
}

export function isLiabilityAccountType(typeName) {
  const normalized = String(typeName || "").trim().toLowerCase();
  if (!normalized) return false;
  if (LIABILITY_ACCOUNT_TYPES.has(typeName)) return true;
  if (isLineOfCreditAccountType(typeName)) return true;
  return (
    normalized === "loan" ||
    normalized === "credit card" ||
    normalized.includes("loan") ||
    normalized.includes("credit card") ||
    normalized.includes("creditcard")
  );
}

export function isLoanAccountType(typeName = "") {
  const normalized = String(typeName || "").trim().toLowerCase();
  if (!normalized) return false;
  if (isLineOfCreditAccountType(typeName)) return false;
  if (typeName === LOAN_TYPE_NAME) return true;
  return normalized === "loan" || (normalized.includes("loan") && !normalized.includes("credit"));
}

export function parseMoneyValue(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`"${value}" is not a valid money amount.`);
  }

  return numeric;
}

export function validateNonZeroMoney(value, label = "Amount") {
  const numeric = parseMoneyValue(value);
  if (numeric === null) {
    throw new Error(`${label} is required.`);
  }
  if (numeric === 0) {
    throw new Error(`${label} cannot be zero.`);
  }
  return numeric;
}

export function getAvailableCredit(balance, creditLimit) {
  const limit = Number(creditLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  const owed = Math.max(Number(balance) || 0, 0);
  return Math.max(limit - owed, 0);
}

/**
 * Transfer partner amount depends on whether each side is an asset or liability.
 * Asset↔asset transfers use opposite signs; asset↔liability payments use the same sign.
 * @deprecated Prefer buildTransferLegAmounts for From→To transfers.
 */
export function getTransferPartnerAmount(primaryType, sourceType, primaryAmount) {
  const numeric = Number(primaryAmount);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return numeric;
  }

  const primaryLiability = isLiabilityAccountType(primaryType);
  const sourceLiability = isLiabilityAccountType(sourceType);

  if (primaryLiability === sourceLiability) {
    return -numeric;
  }

  if (numeric < 0) {
    return numeric;
  }

  if (primaryLiability && !sourceLiability) {
    return -numeric;
  }

  if (!primaryLiability && sourceLiability) {
    return numeric;
  }

  return -numeric;
}

/**
 * From→To transfer legs from a positive amount and account type names.
 * Returns signed amounts for each side plus a transfer_kind label key.
 *
 * Line of Credit draws:
 * - LOC → bank: advance (+/+): owed up on LOC, cash up in bank
 * - LOC → credit card/loan: loc_draw (+/−): owed up on LOC, owed down on destination
 */
export function buildTransferLegAmounts(fromType, toType, absoluteAmount) {
  const abs = Math.abs(Number(absoluteAmount));
  if (!Number.isFinite(abs) || abs === 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const fromLiability = isLiabilityAccountType(fromType);
  const toLiability = isLiabilityAccountType(toType);

  // Drawing a line of credit to pay down another liability.
  if (isLineOfCreditAccountType(fromType) && toLiability) {
    return {
      fromAmount: abs,
      toAmount: -abs,
      absoluteAmount: abs,
      kind: "loc_draw",
    };
  }

  // Drawing a line of credit into a bank/asset account (owed up, cash up).
  if (isLineOfCreditAccountType(fromType) && !toLiability) {
    return {
      fromAmount: abs,
      toAmount: abs,
      absoluteAmount: abs,
      kind: "loc_draw",
    };
  }

  if (fromLiability === toLiability) {
    return {
      fromAmount: -abs,
      toAmount: abs,
      absoluteAmount: abs,
      kind: fromLiability ? "debt_move" : "move",
    };
  }

  if (!fromLiability && toLiability) {
    return {
      fromAmount: -abs,
      toAmount: -abs,
      absoluteAmount: abs,
      kind: "payment",
    };
  }

  return {
    fromAmount: abs,
    toAmount: abs,
    absoluteAmount: abs,
    kind: "advance",
  };
}

export function getTransferKindLabel(kind) {
  switch (kind) {
    case "payment":
      return "payment";
    case "advance":
      return "cash advance";
    case "loc_draw":
      return "line of credit draw";
    case "debt_move":
      return "debt move";
    case "move":
    default:
      return "transfer";
  }
}

/**
 * Infer From/To roles from a linked transfer pair using account types and signs.
 */
export function resolveTransferRoles(rowA, typeA, rowB, typeB) {
  const aLiability = isLiabilityAccountType(typeA);
  const bLiability = isLiabilityAccountType(typeB);
  const aAmount = Number(rowA.amount);
  const bAmount = Number(rowB.amount);

  if (aLiability && bLiability) {
    // LOC draw: positive on LOC (from), negative on destination (to).
    if (aAmount > 0 && bAmount < 0 && isLineOfCreditAccountType(typeA)) {
      return {
        from: rowA,
        to: rowB,
        absoluteAmount: Math.abs(aAmount),
        kind: "loc_draw",
      };
    }
    if (bAmount > 0 && aAmount < 0 && isLineOfCreditAccountType(typeB)) {
      return {
        from: rowB,
        to: rowA,
        absoluteAmount: Math.abs(bAmount),
        kind: "loc_draw",
      };
    }

    // Classic debt move: negative from, positive to.
    if (aAmount < 0) {
      return {
        from: rowA,
        to: rowB,
        absoluteAmount: Math.abs(aAmount),
        kind: "debt_move",
      };
    }
    return {
      from: rowB,
      to: rowA,
      absoluteAmount: Math.abs(bAmount),
      kind: "debt_move",
    };
  }

  if (aLiability === bLiability) {
    if (aAmount < 0) {
      return {
        from: rowA,
        to: rowB,
        absoluteAmount: Math.abs(aAmount),
        kind: "move",
      };
    }
    return {
      from: rowB,
      to: rowA,
      absoluteAmount: Math.abs(bAmount),
      kind: "move",
    };
  }

  // Mixed asset/liability: both negative => payment (asset → liability).
  // Both positive => advance (liability → asset).
  if (aAmount < 0 && bAmount < 0) {
    if (!aLiability && bLiability) {
      return { from: rowA, to: rowB, absoluteAmount: Math.abs(aAmount), kind: "payment" };
    }
    if (aLiability && !bLiability) {
      return { from: rowB, to: rowA, absoluteAmount: Math.abs(bAmount), kind: "payment" };
    }
  }

  if (aAmount > 0 && bAmount > 0) {
    if (aLiability && !bLiability) {
      return {
        from: rowA,
        to: rowB,
        absoluteAmount: Math.abs(aAmount),
        kind: isLineOfCreditAccountType(typeA) ? "loc_draw" : "advance",
      };
    }
    if (!aLiability && bLiability) {
      return {
        from: rowB,
        to: rowA,
        absoluteAmount: Math.abs(bAmount),
        kind: isLineOfCreditAccountType(typeB) ? "loc_draw" : "advance",
      };
    }
  }

  // Fallback: treat negative side as From.
  if (aAmount < 0) {
    return {
      from: rowA,
      to: rowB,
      absoluteAmount: Math.abs(aAmount),
      kind: !aLiability && bLiability ? "payment" : "move",
    };
  }
  return {
    from: rowB,
    to: rowA,
    absoluteAmount: Math.abs(bAmount),
    kind: aLiability && !bLiability ? "advance" : "move",
  };
}

export function formatTransferPreview({
  fromName,
  toName,
  fromAmount,
  toAmount,
  kind,
  formatCurrency,
}) {
  const kindLabel = getTransferKindLabel(kind);
  const fromSigned = formatCurrency(fromAmount);
  const toSigned = formatCurrency(toAmount);
  return `${fromName || "From"} ${fromSigned} → ${toName || "To"} ${toSigned} (${kindLabel})`;
}

export function validateCategorySignedAmount(amount, categoryType, accountTypeName = "") {
  const numeric = validateNonZeroMoney(amount, "Amount");
  const liability = isLiabilityAccountType(accountTypeName);
  const normalizedType = String(categoryType || "").trim().toLowerCase();

  if (liability) {
    if (normalizedType === "expense" && numeric < 0) {
      throw new Error(
        "Charges on credit cards, loans, and lines of credit must be positive (increases amount owed)."
      );
    }
    if (normalizedType === "income" && numeric > 0) {
      throw new Error(
        "Payments and credits on credit cards, loans, and lines of credit must be negative (reduces amount owed)."
      );
    }
    return numeric;
  }

  if (normalizedType === "income" && numeric < 0) {
    throw new Error("Income must be entered as a positive amount (deposit).");
  }

  if (normalizedType === "expense" && numeric > 0) {
    throw new Error("Expenses must be entered as a negative amount (withdrawal).");
  }

  return numeric;
}

/**
 * Liability forms collect a positive amount plus Payment/Charge mode.
 * Payments reduce amount owed (stored negative); charges increase it (stored positive).
 */
export function resolveLiabilityTransactionAmount(amount, entryMode = "payment") {
  const numeric = validateNonZeroMoney(amount, "Amount");
  const absolute = Math.abs(numeric);
  return entryMode === "charge" ? absolute : -absolute;
}

/**
 * Cash/bank forms collect a positive amount plus Deposit/Withdrawal mode.
 * Deposits are stored positive; withdrawals are stored negative.
 * Avoids needing a minus key on mobile number keypads.
 */
export function resolveCashTransactionAmount(amount, entryMode = "withdrawal") {
  const numeric = validateNonZeroMoney(amount, "Amount");
  const absolute = Math.abs(numeric);
  return entryMode === "deposit" ? absolute : -absolute;
}

export function getDefaultCashEntryMode(categoryType = "") {
  const normalizedType = String(categoryType || "").trim().toLowerCase();
  if (normalizedType === "income") return "deposit";
  return "withdrawal";
}

export function getDefaultLiabilityEntryMode(accountTypeName = "") {
  return isLoanAccountType(accountTypeName) ? "payment" : "charge";
}

export function validateTransferPrimaryAmount(amount) {
  return validateNonZeroMoney(amount, "Amount");
}

export function validateLiabilityOpeningBalance(value, label = "Opening balance") {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const numeric = parseMoneyValue(value);
  if (numeric < 0) {
    throw new Error(`${label} must be zero or positive (amount owed at the start).`);
  }
  return numeric;
}

export function validateAccountBalance(balance, accountTypeName) {
  if (balance === "" || balance === null || balance === undefined) {
    return 0;
  }

  const numeric = parseMoneyValue(balance);

  if (isLiabilityAccountType(accountTypeName) && numeric < 0) {
    throw new Error("Amount owed must be zero or positive on credit cards, loans, and lines of credit.");
  }

  return numeric;
}

export function validateBudgetAmount(amount) {
  const numeric = parseMoneyValue(amount);
  if (numeric === null) {
    throw new Error("Budget amount is required.");
  }
  if (numeric <= 0) {
    throw new Error("Budget amount must be greater than zero.");
  }
  return numeric;
}

export function normalizeBudgetMoneyField(table, fieldName, value, context = {}) {
  if (!isMoneyField(table, fieldName)) {
    return value;
  }

  if (table === "accounts" && fieldName === "balance") {
    return validateAccountBalance(value, context.accountTypeName ?? "");
  }

  if (table === "accounts" && fieldName === "opening_balance") {
    if (isLiabilityAccountType(context.accountTypeName ?? "")) {
      return validateLiabilityOpeningBalance(value);
    }
    return parseMoneyValue(value) ?? 0;
  }

  if (table === "accounts" && fieldName === "credit_limit") {
    const numeric = parseMoneyValue(value);
    if (numeric === null) {
      return null;
    }
    if (numeric < 0) {
      throw new Error("Credit limit must be zero or positive.");
    }
    return numeric;
  }

  if (table === "budgets" && fieldName === "amount") {
    return validateBudgetAmount(value);
  }

  return parseMoneyValue(value);
}

export function getMoneyFieldHint(table, fieldName, context = {}) {
  if (table === "accounts" && fieldName === "opening_balance") {
    if (isLoanAccountType(context.accountTypeName)) {
      return "What you still owe when you start tracking this loan. Payments (negative) walk this down; you do not need a separate first charge for the principal.";
    }
    if (isLiabilityAccountType(context.accountTypeName)) {
      return "Starting amount owed before any transactions in this app. Running balance owed = opening + charges − payments.";
    }
    return "Starting balance before any transactions in this app. Running balance = opening balance + transactions.";
  }

  if (table === "accounts" && fieldName === "balance") {
    if (isLiabilityAccountType(context.accountTypeName)) {
      return "Amount owed. Positive charges increase this; negative payments reduce it.";
    }
    return "Positive balance means money in the account. Negative means an overdraft.";
  }

  if (table === "accounts" && fieldName === "credit_limit") {
    return "Revolving limit for credit cards and lines of credit. Available credit = limit − amount owed. Not used for loans.";
  }

  if (table === "accounts" && fieldName === "apr") {
    return "Annual percentage rate used by the debt planner (for example 19.99).";
  }

  if (table === "accounts" && fieldName === "minimum_payment") {
    return "Minimum monthly payment used by the debt planner.";
  }

  if (table === "budgets" && fieldName === "amount") {
    return "Enter a positive budget limit.";
  }

  if (table === "transactions" && fieldName === "amount") {
    if (context.isTransfer) {
      const primaryLiability = isLiabilityAccountType(context.accountTypeName);
      const sourceLiability = isLiabilityAccountType(context.sourceAccountType);
      const mixed = primaryLiability !== sourceLiability;

      if (mixed) {
        return "Payment between accounts: use a negative amount (for example -500). Both accounts move in the same direction — cash leaves the bank account and debt goes down.";
      }

      return "Transfer between accounts of the same type: positive moves money into this account; the pay-from account gets the opposite amount.";
    }

    if (isLiabilityAccountType(context.accountTypeName)) {
      if (String(context.categoryType || "").toLowerCase() === "income") {
        return "Payments and credits must be negative (reduces amount owed).";
      }
      return "Charges and purchases must be positive (increases amount owed).";
    }

    if (String(context.categoryType || "").toLowerCase() === "income") {
      return "Deposits and income must be positive.";
    }

    if (String(context.categoryType || "").toLowerCase() === "expense") {
      return "Withdrawals and expenses must be negative.";
    }

    return "Use positive amounts for deposits and negative amounts for withdrawals.";
  }

  return null;
}

export function getSignedAmountClass(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "";
  }
  return numeric > 0 ? "money-positive" : "money-negative";
}
