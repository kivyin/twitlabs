import AccountsOverviewReport from "./reports/AccountsOverviewReport";
import BillsDueReport from "./reports/BillsDueReport";
import BudgetVsActualReport from "./reports/BudgetVsActualReport";
import CashFlowForecastReport from "./reports/CashFlowForecastReport";
import CashFlowSankeyReport from "./reports/CashFlowSankeyReport";
import DebtPlannerReport from "./reports/DebtPlannerReport";
import IncomeVsExpenseTrendReport from "./reports/IncomeVsExpenseTrendReport";
import MonthSummaryReport from "./reports/MonthSummaryReport";
import NetWorthHistoryReport from "./reports/NetWorthHistoryReport";
import RecentTransactionsReport from "./reports/RecentTransactionsReport";
import SavingsGoalsReport from "./reports/SavingsGoalsReport";
import SpendingByCategoryReport from "./reports/SpendingByCategoryReport";
import SpendingTrendsReport from "./reports/SpendingTrendsReport";
import TaxCategorySummaryReport from "./reports/TaxCategorySummaryReport";
import TotalBalanceReport from "./reports/TotalBalanceReport";
import YearOverYearReport from "./reports/YearOverYearReport";

export const REPORT_CATEGORIES = [
  { id: "overview", label: "Overview" },
  { id: "spending", label: "Spending" },
  { id: "income", label: "Income & Cash Flow" },
  { id: "planning", label: "Planning" },
  { id: "taxes", label: "Taxes" },
];

const BUDGET_REPORTS = [
  {
    id: "total-balance",
    title: "Total Balance",
    description: "Combined balance across all accounts.",
    category: "overview",
    defaultSpan: 1,
    component: TotalBalanceReport,
  },
  {
    id: "month-summary",
    title: "This Month",
    description: "Income, spending, and net for the current month.",
    category: "overview",
    defaultSpan: 1,
    component: MonthSummaryReport,
  },
  {
    id: "accounts-overview",
    title: "Accounts",
    description: "Balances grouped by account.",
    category: "overview",
    defaultSpan: 3,
    component: AccountsOverviewReport,
  },
  {
    id: "recent-transactions",
    title: "Recent Transactions",
    description: "Latest activity across accounts.",
    category: "overview",
    defaultSpan: 3,
    component: RecentTransactionsReport,
  },
  {
    id: "spending-by-category",
    title: "Spending by Category",
    description: "Where money went this month.",
    category: "spending",
    defaultSpan: 3,
    component: SpendingByCategoryReport,
  },
  {
    id: "spending-trends",
    title: "Spending Trends",
    description: "Monthly spending totals over time.",
    category: "spending",
    defaultSpan: 3,
    dashboard: false,
    component: SpendingTrendsReport,
  },
  {
    id: "year-over-year",
    title: "Year over Year",
    description: "Compare the same calendar month across years.",
    category: "spending",
    defaultSpan: 3,
    dashboard: false,
    component: YearOverYearReport,
  },
  {
    id: "income-vs-expense-trend",
    title: "Income vs Expense",
    description: "Monthly income, spending, and net over time.",
    category: "income",
    defaultSpan: 3,
    dashboard: false,
    component: IncomeVsExpenseTrendReport,
  },
  {
    id: "cash-flow-forecast",
    title: "Cash Flow Forecast",
    description: "Projected liquid balance from recurring bills and income.",
    category: "income",
    defaultSpan: 3,
    component: CashFlowForecastReport,
  },
  {
    id: "cash-flow-sankey",
    title: "Cash Flow Sankey",
    description: "Income flowing into spending categories for the month.",
    category: "income",
    defaultSpan: 3,
    component: CashFlowSankeyReport,
  },
  {
    id: "budget-vs-actual",
    title: "Budget vs Actual",
    description: "Monthly spending against your category budgets.",
    category: "planning",
    defaultSpan: 3,
    component: BudgetVsActualReport,
  },
  {
    id: "bills-due",
    title: "Bills Due",
    description: "Upcoming recurring bills and post-due action.",
    category: "planning",
    defaultSpan: 3,
    component: BillsDueReport,
  },
  {
    id: "savings-goals",
    title: "Savings Goals",
    description: "Progress toward your savings targets.",
    category: "planning",
    defaultSpan: 3,
    component: SavingsGoalsReport,
  },
  {
    id: "net-worth-history",
    title: "Net Worth",
    description: "Assets, liabilities, and monthly net worth history.",
    category: "planning",
    defaultSpan: 3,
    component: NetWorthHistoryReport,
  },
  {
    id: "debt-planner",
    title: "Debt Planner",
    description: "Credit card payoff timeline with snowball or avalanche.",
    category: "planning",
    defaultSpan: 3,
    component: DebtPlannerReport,
  },
  {
    id: "tax-summary",
    title: "Tax Category Summary",
    description: "Totals for categories marked tax deductible.",
    category: "taxes",
    defaultSpan: 3,
    dashboard: false,
    component: TaxCategorySummaryReport,
  },
];

/** Builtin reports that should fill the full dashboard row by default. */
export const FULL_WIDTH_DASHBOARD_KEYS = new Set(
  BUDGET_REPORTS.filter((report) => report.defaultSpan >= 3).map(
    (report) => `builtin:${report.id}`
  )
);

const REGISTRY = {
  budget: BUDGET_REPORTS,
};

export function getBuiltinReports(application, { dashboardOnly = false, reportCenterOnly = false } = {}) {
  const reports = REGISTRY[application] ?? [];
  return reports.filter((report) => {
    if (dashboardOnly && report.dashboard === false) {
      return false;
    }
    if (reportCenterOnly && report.reportCenter === false) {
      return false;
    }
    return true;
  });
}

export function getBuiltinReport(application, reportId) {
  return (REGISTRY[application] ?? []).find((report) => report.id === reportId) ?? null;
}

export function getReportsByCategory(application) {
  const reports = getBuiltinReports(application);
  return REPORT_CATEGORIES.map((category) => ({
    ...category,
    reports: reports.filter((report) => report.category === category.id),
  })).filter((group) => group.reports.length > 0);
}

export function hasDashboard(application) {
  return getBuiltinReports(application, { dashboardOnly: true }).length > 0;
}

export function hasReportCenter(application) {
  return getBuiltinReports(application).length > 0;
}

export const DEFAULT_LAYOUTS = {
  budget: [
    { key: "builtin:total-balance", span: 1 },
    { key: "builtin:month-summary", span: 1 },
    { key: "builtin:budget-vs-actual", span: 3 },
    { key: "builtin:bills-due", span: 3 },
    { key: "builtin:savings-goals", span: 3 },
    { key: "builtin:net-worth-history", span: 3 },
    { key: "builtin:cash-flow-forecast", span: 3 },
    { key: "builtin:cash-flow-sankey", span: 3 },
    { key: "builtin:debt-planner", span: 3 },
    { key: "builtin:accounts-overview", span: 3 },
    { key: "builtin:recent-transactions", span: 3 },
    { key: "builtin:spending-by-category", span: 3 },
  ],
};

export function parseReportKey(key) {
  if (key.startsWith("builtin:")) {
    return { source: "builtin", id: key.slice("builtin:".length) };
  }
  if (key.startsWith("custom:")) {
    return { source: "custom", id: Number(key.slice("custom:".length)) };
  }
  return null;
}

export function buildReportKey(source, id) {
  return `${source}:${id}`;
}

export function buildCustomReportPath(id) {
  return `custom-${id}`;
}

export function parseReportRouteKey(reportKey) {
  if (reportKey.startsWith("custom-")) {
    return { source: "custom", id: Number(reportKey.slice("custom-".length)) };
  }
  return { source: "builtin", id: reportKey };
}
