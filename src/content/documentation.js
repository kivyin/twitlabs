const field = (name, label, description) => ({ name, label, description });

const section = (heading, bodyOrBullets) =>
  typeof bodyOrBullets === "string"
    ? { heading, body: bodyOrBullets }
    : { heading, bullets: bodyOrBullets };

/** Shared list/table UX used across budget (and other) record lists. */
const listWorkflowSections = (entityLabel) => [
  section("Working with the list", [
    `Open ${entityLabel} from the sidebar or the app home.`,
    "Click any row to open the edit form — the whole row is clickable, not just the ID.",
    "Use column headers to sort. Your sort and visible columns are remembered for each table.",
    "Use Columns to show, hide, and reorder fields. Your layout is saved per user.",
    "Use Filters to narrow rows (for example by account, date, or category). Apply or Clear when ready.",
    "Large lists paginate; use the pager at the bottom to move between pages.",
    "Delete from the edit form. Most deletes are soft deletes — restore them under Administration → Deleted Records.",
    "Use Back in the page header to return to the previous screen you came from.",
  ]),
];

const REPORT_DOCS = {
  "total-balance": {
    title: "Total Balance",
    summary: "Combined balance across all accounts.",
    sections: [
      section("What it shows", "Sums current balances for every account you track."),
      section("Tips", [
        "Bank-style accounts contribute cash on hand.",
        "Credit cards and loans contribute amount owed (liabilities).",
        "Site accounts with no money fields do not affect the total.",
      ]),
    ],
  },
  "month-summary": {
    title: "This Month",
    summary: "Income, spending, and net for the current calendar month.",
    sections: [
      section("What it shows", "Totals income and expense transactions dated this month, then shows net."),
      section("Tips", ["Transfers between your own accounts are excluded from income/expense totals where possible."]),
    ],
  },
  "accounts-overview": {
    title: "Accounts",
    summary: "Balances grouped by account.",
    sections: [
      section("What it shows", "A per-account snapshot of stored balances so you can spot which accounts hold cash or debt."),
      section("Related", "Open an account’s register from the Accounts list for full transaction history."),
    ],
  },
  "recent-transactions": {
    title: "Recent Transactions",
    summary: "Latest activity across accounts.",
    sections: [
      section("What it shows", "The most recent transactions so you can jump back into editing or categorization."),
      section("Tips", ["Click through to the full Transactions list when you need filters or import tools."]),
    ],
  },
  "spending-by-category": {
    title: "Spending by Category",
    summary: "Where money went this month.",
    sections: [
      section("What it shows", "Expense totals grouped by category for the current month."),
      section("Tips", [
        "Assign categories on every expense for accurate charts.",
        "Split transactions allocate amounts across multiple categories.",
      ]),
    ],
  },
  "spending-trends": {
    title: "Spending Trends",
    summary: "Monthly spending totals over time.",
    sections: [
      section("What it shows", "A month-by-month view of total spending so you can spot seasonality and drift."),
    ],
  },
  "year-over-year": {
    title: "Year over Year",
    summary: "Compare the same calendar month across years.",
    sections: [
      section("What it shows", "Spending for a chosen month compared with the same month in prior years."),
    ],
  },
  "income-vs-expense-trend": {
    title: "Income vs Expense",
    summary: "Monthly income, spending, and net over time.",
    sections: [
      section("What it shows", "Side-by-side income and expense totals by month, plus net."),
    ],
  },
  "cash-flow-forecast": {
    title: "Cash Flow Forecast",
    summary: "Projected liquid balance from recurring bills and income.",
    sections: [
      section("How it works", [
        "Uses active recurring schedules and current liquid balances.",
        "Projects upcoming due dates forward so you can see dips before bills hit.",
        "Keep next due dates accurate on Recurring Bills for a useful forecast.",
      ]),
    ],
  },
  "cash-flow-sankey": {
    title: "Cash Flow Sankey",
    summary: "Compare last month and this month: income flowing into spending categories.",
    sections: [
      section("What it shows", [
        "Two flow diagrams stacked — top defaults to last month, bottom to this month.",
        "Each chart lists every income and spending category that had activity in that month.",
        "Transfers are not included. Credit Card and other non-income category types count as spending.",
      ]),
      section("Filters", [
        "Use Account to scope both charts to one account, or leave All accounts.",
        "Change either chart’s month independently with its date control.",
      ]),
      section("Tips", ["Account registers also show a Sankey scoped to that single account."]),
    ],
  },
  "budget-vs-actual": {
    title: "Budget vs Actual",
    summary: "Monthly spending against your category budgets.",
    sections: [
      section("How to use", [
        "Create Budgets for each category and month (YYYY-MM).",
        "As transactions post, actual spending is compared to the planned amount.",
        "Over-budget categories stand out so you can adjust spending or the plan.",
      ]),
    ],
  },
  "bills-due": {
    title: "Bills Due",
    summary: "Upcoming recurring bills and a post-due action.",
    sections: [
      section("How to use", [
        "Review bills whose next due date is approaching or past due.",
        "Post due bills to create matching transactions and advance next due dates.",
        "You can also post due bills from the Recurring Bills list toolbar.",
      ]),
    ],
  },
  "savings-goals": {
    title: "Savings Goals",
    summary: "Progress toward your savings targets.",
    sections: [
      section("How to use", [
        "Create goals with a target amount and optional linked account.",
        "When a goal is linked to an account, use Sync from account on this widget to refresh current progress from the account balance.",
        "Unlinked goals track current amount manually on the goal form.",
      ]),
    ],
  },
  "net-worth-history": {
    title: "Net Worth",
    summary: "Assets, liabilities, and monthly net worth history.",
    sections: [
      section("How to use", [
        "Capture a snapshot when you want a point-in-time net worth reading.",
        "History charts use those snapshots over time.",
        "Keep account balances and types accurate so assets vs liabilities classify correctly.",
      ]),
    ],
  },
  "debt-planner": {
    title: "Debt Planner",
    summary: "Credit card payoff timeline with snowball or avalanche.",
    sections: [
      section("How it works", [
        "Uses liability accounts with balances, APR, and minimum payment fields.",
        "Snowball pays smallest balances first; avalanche pays highest APR first.",
        "Fill APR and minimum payment on each credit card or loan for realistic timelines.",
      ]),
    ],
  },
  "tax-summary": {
    title: "Tax Category Summary",
    summary: "Totals for categories marked tax deductible.",
    sections: [
      section("How to use", [
        "On Categories, set Tax deductible to Yes for deductible expense categories.",
        "This report totals activity in those categories for tax prep.",
      ]),
    ],
  },
};

const DOC_APPS = {
  workspace: {
    label: "Workspace",
    description: "Sign-in, home screen, favorites, theme, and branding.",
    topics: {
      overview: {
        title: "Workspace home",
        summary: "After sign-in, the home page lists every application your roles allow.",
        sections: [
          section("How it works", [
            "Each card opens an application (Budget, Tasks, Notes, Decision Picker, and others assigned to you).",
            "Administrators see every registered application.",
            "Use the left sidebar to move between apps without returning home.",
            "Open Documentation from the sidebar for field-level and process help.",
            "Use the Help control on a page header for context about the screen you are on.",
          ]),
          section("Related topics", [
            "Signing in — passwords, deep links, and session timeouts.",
            "Favorites — pin pages you use often.",
            "Appearance — theme and branding.",
          ]),
        ],
      },
      "signing-in": {
        title: "Signing in",
        summary: "How login, deep links, password changes, and sessions work.",
        sections: [
          section("Sign in", [
            "Open the app and enter your username and password on the login screen.",
            "If an administrator created your account, ask them for the initial password.",
            "New admin-style accounts may be required to change the default password before continuing.",
          ]),
          section("Deep links", [
            "If you open a bookmark or shared URL while signed out, you are sent to login.",
            "After a successful sign-in, you return to the original page (path, query, and hash).",
            "The same happens after a session expires mid-work — sign in again to resume that screen.",
          ]),
          section("Change password", [
            "When must-change-password is set, a dedicated screen blocks the rest of the app.",
            "New password must be at least 8 characters and cannot be the default value admin.",
            "Confirm the new password, then continue to your destination.",
          ]),
          section("Sessions", [
            "You are signed out after a period of inactivity (default five minutes).",
            "Administrators configure the timeout with SESSION_IDLE_SECONDS in the server .env file (restart required).",
            "API session expiry also returns you to login with a message.",
            "Use Sign out in the shell when you are done on a shared computer.",
          ]),
        ],
      },
      favorites: {
        title: "Favorites",
        summary: "Pin frequently used pages in the sidebar.",
        sections: [
          section("How to use", [
            "On most pages, use the star control in the page header to favorite the current screen.",
            "Favorites appear in the sidebar for quick return.",
            "Edit a favorite to change its label, icon, or color, or upload a custom icon.",
            "Remove a favorite when you no longer need the shortcut.",
          ]),
        ],
      },
      appearance: {
        title: "Theme and branding",
        summary: "Personalize how the shell looks.",
        sections: [
          section("Theme", [
            "Open the account menu (your name/avatar), then use the Theme dropdown to choose Light, Dark, System, or LCARS.",
            "System follows your operating system preference.",
            "LCARS is a high-contrast command-style theme.",
            "On the login screen, use the theme dropdown in the corner before you sign in.",
          ]),
          section("Branding", [
            "Open Branding under Applications → Administration to set the application name shown in the shell.",
            "Optional Ship name supports LCARS-style labeling.",
            "Branding appears on login and in the sidebar brand area.",
          ]),
        ],
      },
    },
  },

  budget: {
    label: "Budget",
    description: "Accounts, transactions, budgets, bills, goals, and reports.",
    topics: {
      overview: {
        title: "Budget app overview",
        summary: "Track money across accounts, categorize spending, plan budgets, and run reports.",
        sections: [
          section("Main areas", [
            "Home dashboard — widgets for balances, bills, goals, cash flow, and more.",
            "Accounts — where money lives (checking, credit cards, lines of credit, loans, site logins).",
            "Account register — checkbook view for one account.",
            "Transactions — income, expenses, transfers, splits, import, and receipt scan.",
            "Categories & budgets — organize spending and set monthly limits.",
            "Payees & payee rules — remember merchants and auto-categorize imports.",
            "Recurring bills — scheduled payments with post-due workflow.",
            "Goals — savings targets, optionally synced from an account balance.",
            "Reports — Report Center and dashboard widgets.",
          ]),
          section("Suggested setup order", [
            "Create account types if needed, then create Accounts.",
            "Create Categories (and category types) for income, expense, and transfer.",
            "Add Payees and optional Payee rules for imports.",
            "Enter opening history or import CSV transactions.",
            "Add Budgets for the current month.",
            "Add Recurring bills and Goals.",
            "Customize the home dashboard and pin Report Center favorites.",
          ]),
        ],
      },
      lists: {
        title: "Lists, filters, and columns",
        summary: "Shared behavior for every budget table list.",
        sections: listWorkflowSections("a table"),
      },
      accounts: {
        title: "Accounts",
        summary: "Accounts represent banks, cards, loans, cash, or online logins.",
        sections: [
          ...listWorkflowSections("Accounts"),
          section("When to use", "Create an account for each place you hold money or track a balance. Transactions post against an account."),
          section("Account types control the form", [
            "Bank checking / savings — opening balance and cash balance fields.",
            "Credit card — starting amount owed, credit limit, APR, and minimum payment. Balance is amount owed. Optimized for point-of-sale charges.",
            "Line of credit — starting amount owed, credit limit, APR, and minimum payment (same revolving fields as a card). Designed for cash draws: use Transfer to move funds to a bank or to pay down a credit card/loan.",
            "Loan — starting amount owed (principal when you begin tracking), APR, and minimum payment. On transactions choose Payment and enter a positive amount to pay it down (or use a bank→loan transfer).",
            "Site account — login URL, username, and password; no money fields.",
          ]),
          section("Owner and joint accounts", [
            "Owner is the person whose name is on the account (cardholder / named account holder).",
            "Owner is separate from Added by — the user who created the record in the app.",
            "Set Joint account to Yes when more than one person is on the account, then select the other joint users.",
            "The primary Owner does not need to be listed again under joint users.",
          ]),
          section("On the edit screen", [
            "Upload an account image (tiles view uses it).",
            "Open the register for a checkbook view of that account.",
            "Review balance trend and spending charts when the account type supports them.",
            "New transaction from the register prefills this account.",
          ]),
          section("List views", [
            "Switch between List and Tiles on the Accounts page.",
            "Tiles open register or edit actions for that account.",
          ]),
        ],
        fields: [
          field("name", "Name", "Display name, such as Chase Checking."),
          field("account_type_id", "Account type", "Bank checking/savings, credit card, line of credit, loan, or site account. Controls which money and login fields appear."),
          field("owner_user_id", "Owner", "Person whose name is on the account. Separate from who added the account in the app."),
          field("is_joint", "Joint account", "Yes if additional people share the account. When Yes, select joint users on the form."),
          field("opening_balance", "Opening / starting owed", "Banks: starting cash. Credit cards, lines of credit, and loans: starting amount owed before app transactions. For loans, enter the principal you still owe — payments then reduce it."),
          field("balance", "Balance", "Current balance maintained by transactions. Not edited directly on the form — use Sync on the register if stored balance diverges from the ledger."),
          field("credit_limit", "Credit limit", "Credit cards and lines of credit. Available credit is limit minus amount owed. Loans use Starting amount owed instead."),
          field("apr", "APR (%)", "Annual percentage rate for debt planner reports."),
          field("minimum_payment", "Minimum payment", "Typical minimum payment for debt planning."),
          field("account_number", "Account number", "Optional reference number for your records."),
          field("login_url", "URL", "Website for online access."),
          field("site_username", "Username", "Login username for the site."),
          field("site_password", "Password", "Stored login password. Masked on the form; admins can reveal it."),
          field("notes", "Notes", "Free-form notes about the account."),
          field("image_path", "Account image", "Optional picture shown on account tiles. Upload on the edit screen."),
          field("user_id", "Added by", "User who created the account record in the app. Set automatically and not shown on the form."),
        ],
      },
      account_types: {
        title: "Account types",
        summary: "Lookup list for account classifications.",
        sections: listWorkflowSections("Account types"),
        fields: [
          field("name", "Name", "Type label such as Bank Checking, Credit Card, Line of Credit, Loan, or Site account."),
        ],
      },
      "account-register": {
        title: "Account register",
        summary: "Checkbook-style view of one account’s transactions with running balance.",
        sections: [
          section("How to open", [
            "From Accounts list or tiles, open Register.",
            "From an account edit form, use Open register.",
          ]),
          section("What you see", [
            "Stored balance vs ledger balance, available credit (liability accounts), cleared balance, and uncleared count.",
            "If stored balance differs from the ledger, Sync stored balance to ledger updates the account balance.",
            "Cash-flow Sankey for activity on this account.",
            "Transaction table: cleared, date, description, category, amount, running balance.",
          ]),
          section("Working the register", [
            "Toggle Cleared on a row to mark bank reconciliation status.",
            "Click a row to edit the transaction.",
            "New transaction prefills this account.",
            "Filter, sort, paginate, and use Columns like other lists.",
          ]),
        ],
      },
      categories: {
        title: "Categories",
        summary: "Classify transactions as income, expense, or transfer.",
        sections: [
          ...listWorkflowSections("Categories"),
          section("Tips", [
            "Create enough expense categories for budgets and reports to be useful.",
            "Mark tax-deductible categories Yes for the Tax Category Summary report.",
            "Transfer categories pair with transfer transactions between accounts.",
          ]),
        ],
        fields: [
          field("name", "Name", "Category label on transactions and reports."),
          field("type_id", "Category type", "Income, expense, or transfer. Controls amount sign expectations."),
          field("tax_deductible", "Tax deductible", "Yes or No. Used by the Tax Category Summary report. Blank is not allowed."),
        ],
      },
      category_types: {
        title: "Category types",
        summary: "High-level grouping for categories.",
        sections: listWorkflowSections("Category types"),
        fields: [field("name", "Name", "Type name such as Income, Expense, or Transfer.")],
      },
      budgets: {
        title: "Budgets",
        summary: "Monthly spending limits per category.",
        sections: [
          ...listWorkflowSections("Budgets"),
          section("How budgeting works", [
            "Create one budget row per category per month (month as YYYY-MM).",
            "Budget vs Actual report compares planned amounts to spending.",
            "Update amounts when your plan changes; keep months current.",
          ]),
        ],
        fields: [
          field("category_id", "Category", "Category this monthly budget applies to."),
          field("amount", "Amount", "Planned spending limit for the month (positive)."),
          field("month", "Month", "Budget month in YYYY-MM. One budget per category per month."),
        ],
      },
      payees: {
        title: "Payees",
        summary: "Merchants, employers, and people you pay or receive money from.",
        sections: [
          ...listWorkflowSections("Payees"),
          section("How payees help", [
            "Selecting a payee on a transaction can fill default category and description.",
            "Payee rules can also assign a payee when an imported description matches a pattern.",
          ]),
        ],
        fields: [
          field("name", "Name", "Payee name as it appears on statements."),
          field("default_category_id", "Default category", "Suggested category when you pick this payee."),
          field("description", "Description", "Default memo filled when you select this payee."),
          field("notes", "Notes", "Internal notes (not copied onto transactions)."),
        ],
      },
      payee_rules: {
        title: "Payee rules",
        summary: "Auto-categorize transactions when the description contains a pattern.",
        sections: [
          ...listWorkflowSections("Payee rules"),
          section("How matching works", [
            "When a transaction description contains the pattern (case-insensitive), the rule suggests category and optional payee.",
            "Higher priority rules win when more than one could match.",
            "Optional account limits the rule to one account.",
            "Inactive rules are ignored.",
            "Matching also runs when you leave the description field on the transaction form.",
          ]),
        ],
        fields: [
          field("pattern", "Pattern", "Text to find inside the description, e.g. starbucks or paycheck."),
          field("category_id", "Category", "Category applied when the pattern matches."),
          field("payee_id", "Payee", "Optional payee applied on match."),
          field("account_id", "Account", "Optional. Only applies to this account."),
          field("priority", "Priority", "Higher numbers are checked first."),
          field("is_active", "Active", "Turn off without deleting the rule."),
        ],
      },
      transactions: {
        title: "Transactions",
        summary: "Record income, expenses, transfers, and splits — including import and receipt scan.",
        sections: [
          ...listWorkflowSections("Transactions"),
          section("Create a standard transaction", [
            "Choose the account and transaction date.",
            "Optionally pick a payee (may fill category and memo).",
            "Enter amount using the sign hints for that account and category.",
            "Choose a category (required unless you use splits).",
            "Add a description — used by payee rules and imports.",
            "Save. Attachments can be added on the edit screen.",
          ]),
          section("Amount signs", [
            "Expenses are usually negative on asset (bank) accounts; income is usually positive.",
            "Credit card and loan (and line of credit) accounts may use the opposite convention — follow on-form hints.",
            "Category type (income / expense / transfer) also guides expected signs.",
          ]),
          section("Transfers", [
            "Open New transfer (or Transfer from an account register) instead of the regular transaction form.",
            "Choose From account → To account and enter a positive amount, plus date, memo, and category.",
            "The app posts linked entries with the correct signs: savings→checking moves money; bank→credit card/loan/LOC is a payment; credit card→bank is a cash advance; line of credit→bank draws cash (owed up, cash up); line of credit→credit card/loan draws to pay down the other debt (owed up on LOC, owed down on the destination).",
            "A live preview shows both signed amounts before you save. Use Swap to reverse From and To.",
            "Editing either linked row opens the same From → To form. Transfers do not use split lines.",
          ]),
          section("Splits", [
            "Enable Split across categories when one purchase spans multiple budgets.",
            "Enter a category and amount on each line; lines must total the transaction amount.",
            "Splits cannot be combined with a transfer.",
          ]),
          section("Import CSV", [
            "On the Transactions list, open Import.",
            "Required columns: date, account, amount, category.",
            "Optional columns: payee, description, cleared.",
            "You can skip duplicates during import.",
            "Export CSV downloads current transactions for backup or external tools.",
          ]),
          section("Scan receipt", [
            "On the Transactions list, choose Scan receipt and upload a clear photo.",
            "Requires GEMINI_API_KEY in the server .env file.",
            "The form opens prefilled with extracted total, date, and memo; the photo attaches on save.",
            "Review account, category, and amount before saving.",
          ]),
          section("Attachments", [
            "On the transaction edit form, use the attachments panel to upload receipts or documents.",
            "Receipt scans attach automatically when you save the prefilled draft.",
          ]),
        ],
        fields: [
          field("account_id", "Account", "Account the transaction posts to."),
          field("transaction_date", "Transaction date", "Date the activity occurred."),
          field("payee_id", "Pay to the order of / Payee", "Optional merchant or payer. Can fill category and description."),
          field("amount", "Amount", "Signed amount. Follow form hints for account and category."),
          field("description", "Memo / Description", "Bank memo. Used by payee rules."),
          field("category_id", "Category", "Budget category. Hidden when splits are enabled."),
          field("user_id", "User", "Who owns this transaction."),
          field("source_account_id", "Pay from another account", "Creates a linked transfer from this source account."),
          field("cleared", "Cleared", "Bank reconciliation flag. Toggle on the account register (not on the main form)."),
          field("transaction_kind", "Kind", "Set by the app: standard, transfer, or split."),
        ],
      },
      recurring_transactions: {
        title: "Recurring bills",
        summary: "Scheduled bills and income with next due dates and posting.",
        sections: [
          ...listWorkflowSections("Recurring bills"),
          section("Create a schedule", [
            "Choose account, category, amount, and frequency.",
            "Set start date and next due date.",
            "For monthly bills, set day of month.",
            "Optional end date stops the schedule later.",
            "Inactive schedules are skipped when posting.",
          ]),
          section("Post due bills", [
            "On the Recurring Bills list toolbar, use Post due bills.",
            "Or post from the Bills Due dashboard/report widget.",
            "Posting creates transactions and advances next due dates.",
            "Review generated transactions afterward for category and amount accuracy.",
          ]),
        ],
        fields: [
          field("user_id", "User", "Owner of the recurring item."),
          field("account_id", "Account", "Account used when the bill posts."),
          field("payee_id", "Payee", "Optional linked payee."),
          field("category_id", "Category", "Category used when posted."),
          field("amount", "Amount", "Bill amount. Expenses negative; income positive (follow form hints)."),
          field("description", "Description", "Memo on generated transactions."),
          field("frequency", "Frequency", "Weekly, Every 2 weeks, Monthly, Quarterly, or Yearly."),
          field("day_of_month", "Day of month", "For monthly schedules, which day it is due."),
          field("start_date", "Start date", "First date the schedule is valid."),
          field("next_due_date", "Next due date", "Next date to post or remind."),
          field("end_date", "End date", "Optional stop date."),
          field("is_active", "Active", "Inactive schedules are skipped."),
        ],
      },
      goals: {
        title: "Savings goals",
        summary: "Track progress toward a savings target.",
        sections: [
          ...listWorkflowSections("Goals"),
          section("Linked accounts", [
            "Optionally link a savings account.",
            "When linked, current amount is driven by the account balance — edit it via Sync, not typing.",
            "On the dashboard Savings Goals widget, use Sync from account to refresh progress.",
          ]),
          section("Manual goals", [
            "Without a linked account, update Current amount on the goal form as you save.",
            "Inactive goals are hidden from some summaries.",
          ]),
        ],
        fields: [
          field("user_id", "User", "Owner of the goal."),
          field("name", "Goal name", "Short label for the goal."),
          field("target_amount", "Target amount", "Amount you want to save."),
          field("current_amount", "Current amount", "Progress so far. Disabled when a linked account drives the value."),
          field("account_id", "Linked account", "Optional account whose balance updates progress when synced."),
          field("target_date", "Target date", "Optional deadline."),
          field("notes", "Notes", "Optional details."),
          field("is_active", "Active", "Inactive goals are hidden from some summaries."),
        ],
      },
      reports: {
        title: "Report center",
        summary: "Built-in and custom reports for balances, spending, and planning.",
        sections: [
          section("How to use", [
            "Open Reports from the budget sidebar or home.",
            "Browse by category: Overview, Spending, Income & Cash Flow, Planning, Taxes.",
            "Open a report for a full-page view; many also appear as dashboard widgets.",
            "Create custom SQL reports for your own queries (read-only SELECT).",
          ]),
          section("Built-in reports", [
            "Total Balance, This Month, Accounts, Recent Transactions",
            "Spending by Category, Spending Trends, Year over Year",
            "Income vs Expense, Cash Flow Forecast, Cash Flow Sankey",
            "Budget vs Actual, Bills Due, Savings Goals, Net Worth, Debt Planner",
            "Tax Category Summary",
          ]),
        ],
      },
      dashboard_reports: {
        title: "Dashboard and custom reports",
        summary: "Home dashboard layouts and custom SQL widgets.",
        sections: [
          section("Dashboard home", [
            "Budget home shows a grid of report widgets.",
            "You can maintain multiple dashboards (tabs), rename them, set a default, and open a specific one with ?dashboard=id.",
            "Add, remove, and reorder widgets to match how you work.",
            "Favorite a dashboard layout from the header when available.",
          ]),
          section("Custom report builder", [
            "Create a report with a name, description, and read-only SELECT SQL.",
            "Choose a visualization (table, bars, charts, and related widget kinds).",
            "Map label and value columns when the chart needs them.",
            "Preview before saving; results appear as dashboard widgets and in Report Center.",
          ]),
          section("Safety", "Only SELECT queries are allowed. Use Administration → Database IDE to explore data while writing SQL."),
        ],
        fields: [
          field("name", "Name", "Report title on the dashboard and Report Center."),
          field("application", "Application", "Usually budget."),
          field("description", "Description", "Short explanation of what the report answers."),
          field("widget_kind", "Visualization", "How results render (table, bars, charts, and similar)."),
          field("sql", "SQL", "Read-only SELECT query."),
          field("label_column", "Label column", "Column used for labels on charts."),
          field("value_column", "Value column", "Column used for numeric values on charts."),
          field("chart_config", "Chart config", "Optional chart options stored with the report."),
        ],
      },
    },
  },

  tasks: {
    label: "Tasks",
    description: "Projects, boards, lists, tags, and focus timer.",
    topics: {
      overview: {
        title: "Tasks app overview",
        summary: "Organize work with projects, statuses, tags, and a Pomodoro timer.",
        sections: [
          section("Main areas", [
            "Home — jump into board, lists, projects, or focus.",
            "Board — columns by status (Inbox, To Do, In Progress, Done).",
            "Lists — Today, Upcoming, Inbox, All, and Completed views.",
            "Projects & tags — group and label related work.",
            "Task detail — full edit, subtasks, tags, notes, and timer.",
            "Focus — standalone Pomodoro timer.",
          ]),
          section("Suggested workflow", [
            "Capture quick tasks into Inbox.",
            "Assign a project, priority, and due date.",
            "Move work across the board as status changes.",
            "Use Focus while working a single task.",
            "Link Notes when a task needs longer writing or sketches.",
          ]),
        ],
      },
      board: {
        title: "Task board",
        summary: "Kanban columns by status.",
        sections: [
          section("How to use", [
            "Each column is a status: Inbox, To Do, In Progress, Done.",
            "Drag cards between columns (or open a card and change status).",
            "Filter by project when you want a smaller board.",
            "Quick Add creates a task without leaving the board.",
            "Open a card for subtasks, tags, estimates, and notes.",
          ]),
        ],
      },
      list: {
        title: "Task lists",
        summary: "Filtered lists such as Today and Inbox.",
        sections: [
          section("Views", [
            "Today — due today, overdue, and in progress.",
            "Upcoming — due in the next 7 days.",
            "Inbox — uncategorized / inbox status tasks.",
            "All Tasks — everything except done.",
            "Completed — finished tasks.",
          ]),
          section("Actions", [
            "New Task opens the detail form.",
            "Change status from the card or open the full task.",
            "Quick Add is available on list screens that support it.",
          ]),
        ],
      },
      "task-detail": {
        title: "Task detail",
        summary: "Create or edit a single task.",
        sections: [
          section("How to use", [
            "Set title, description, status, priority, project, estimate, and due date/time.",
            "Add subtasks for checklist-style progress.",
            "Attach tags for filtering and grouping.",
            "Open linked notes or create notes tied to this task.",
            "Use the Pomodoro side panel to focus without leaving the task.",
          ]),
        ],
        fields: [
          field("title", "Title", "Short task name."),
          field("description", "Description", "Longer notes about the work."),
          field("status", "Status", "Inbox, To Do, In Progress, or Done."),
          field("priority", "Priority", "None, Low, Medium, High, or Urgent."),
          field("project_id", "Project", "Optional project grouping."),
          field("estimated_minutes", "Estimated minutes", "How long you expect the task to take."),
          field("due_date", "Due date", "Optional deadline date."),
          field("due_time", "Due time", "Optional time on the due date."),
          field("tags", "Tags", "Labels managed on the task and in Projects & Tags."),
          field("subtasks", "Subtasks", "Checklist items under the parent task."),
        ],
      },
      projects: {
        title: "Projects and tags",
        summary: "Group tasks under projects and reusable tags.",
        sections: [
          section("Projects", [
            "Create a project with a name, optional description, and accent color.",
            "Assign tasks to a project on the board, list, or task detail.",
            "Filter the board by project to focus.",
          ]),
          section("Tags", [
            "Create tags for cross-project labels.",
            "Apply tags on the task detail screen.",
          ]),
        ],
        fields: [
          field("name", "Name", "Project or tag title."),
          field("description", "Description", "Optional summary (projects)."),
          field("color", "Color", "Accent color on boards and lists."),
        ],
      },
      focus: {
        title: "Focus timer",
        summary: "Pomodoro work and break intervals.",
        sections: [
          section("How to use", [
            "Open Focus from the Tasks app, or use the timer on a task detail.",
            "Pick a task when you want sessions attributed to that work.",
            "Start a focus session; the timer cycles work and break intervals.",
            "Adjust work, short break, and long break lengths in timer settings (stored in the browser).",
          ]),
        ],
      },
      tasks: {
        title: "Tasks table",
        summary: "Task records when opened through a dictionary table list.",
        sections: listWorkflowSections("Tasks"),
        fields: [
          field("title", "Title", "Task name."),
          field("status", "Status", "Inbox, To Do, In Progress, or Done."),
          field("priority", "Priority", "None through Urgent."),
          field("project_id", "Project", "Optional project."),
          field("due_date", "Due date", "Optional deadline."),
          field("estimated_minutes", "Estimated minutes", "Optional effort estimate."),
        ],
      },
    },
  },

  notes: {
    label: "Notes",
    description: "Notebook hierarchy with rich text and drawing.",
    topics: {
      overview: {
        title: "Notes app overview",
        summary: "Organize notes in notebooks, subjects, topics, and notes.",
        sections: [
          section("Hierarchy", [
            "Notebook → Subject → Topic (and sub-topics) → Note (and sub-notes).",
            "Use Browse for the full outline and editor.",
            "Use Recent when you remember working on something lately but not where it lives.",
          ]),
          section("Suggested workflow", [
            "Create a notebook per area of life or work.",
            "Add subjects and topics as the outline grows.",
            "Write in the editor with rich text; switch to pen for sketches.",
            "Pin important notes; link a note to a task when it supports active work.",
          ]),
        ],
      },
      workspace: {
        title: "Notes workspace",
        summary: "Outline, editor, rich text, and drawing.",
        sections: [
          section("Outline", [
            "Browse and search the notebook tree.",
            "Create notebooks, subjects, topics, and notes from the tree actions.",
            "Select a note to load it in the editor.",
          ]),
          section("Editor tools", [
            "Type — rich text with formatting toolbar.",
            "Pen / Eraser — draw on top of text.",
            "Grid — lined paper background for writing and drawing.",
            "Full screen — expand the editor.",
            "Pin — keep the note easy to find.",
            "Note type — general, meeting, idea, reference, journal, or checklist.",
            "Linked task — optional connection to the Tasks app.",
          ]),
          section("Saving", "Edits save with the note; drawing strokes are stored separately from HTML text."),
        ],
        fields: [
          field("title", "Title", "Note name in the outline."),
          field("note_type", "Note type", "General, meeting, idea, reference, journal, or checklist."),
          field("task_id", "Linked task", "Optional link to a task."),
          field("is_pinned", "Pinned", "Pinned notes are easier to find."),
          field("content_html", "Text content", "Rich text body."),
          field("content_drawing", "Drawing", "Ink strokes stored separately from text."),
          field("show_grid", "Grid", "Lined paper background for this note."),
        ],
      },
      recent: {
        title: "Recent notes",
        summary: "Quick access to notes edited recently.",
        sections: [
          section("How to use", [
            "Open Recent when you know you worked on something lately.",
            "Select a note to jump into the workspace editor.",
          ]),
        ],
      },
      notebooks: {
        title: "Notebooks, subjects, and topics",
        summary: "Structure above individual notes.",
        sections: [
          section("Create structure", [
            "Notebooks are the top level.",
            "Subjects sit under notebooks.",
            "Topics (and sub-topics) sit under subjects.",
            "Notes (and sub-notes) hang off topics.",
          ]),
        ],
        fields: [
          field("name", "Name", "Title shown in the outline."),
          field("description", "Description", "Optional summary."),
          field("color", "Color", "Accent color in the outline."),
          field("is_archived", "Archived", "Hide structure you no longer use day to day."),
        ],
      },
    },
  },

  decisions: {
    label: "Decision Picker",
    description: "Spin a wheel to randomly choose from a list of options.",
    topics: {
      overview: {
        title: "Decision Picker overview",
        summary: "Add options, spin an animated wheel, celebrate the winner, and optionally remove it.",
        sections: [
          section("How to use", [
            "Open Decision Picker from the workspace home or the sidebar.",
            "Add at least two options to the list.",
            "Click Spin — the wheel animates for a few seconds and lands on a random winner.",
            "Confetti plays when a winner is selected.",
            "Use Re-spin to choose again from the current list.",
            "Optionally enable Remove winning item after spin, or remove a winner manually.",
          ]),
          section("Access", [
            "Grant the Decision Picker user role under Administration → Users.",
            "System admins can open every app, including Decision Picker.",
          ]),
          section("Tips", [
            "Your option list is saved per user and persists across logouts.",
            "Clear all removes every option from the current list.",
            "Great for dinner spots, chore picks, movie night, or any coin-flip moment.",
          ]),
        ],
      },
    },
  },

  admin: {
    label: "Administration",
    description: "Users, schema dictionary, navigation, deletes, logs, zero boot, and SQL tools.",
    topics: {
      overview: {
        title: "Administration overview",
        summary: "System configuration for administrators only.",
        sections: [
          section("Areas", [
            "Applications — register apps users can open.",
            "Tables & fields — dictionary labels and metadata for forms and lists.",
            "Users — accounts, passwords, and roles.",
            "Navigation — sidebar structure.",
            "Deleted records — restore soft-deleted rows.",
            "Error logs — inspect client and server errors.",
            "Zero Boot — factory-reset user data while keeping out-of-box configuration.",
            "IDE — run SQL against the database (read-only by default; escalate for emergency writes).",
          ]),
          section("Common patterns", [
            "Click a row in an admin table to load it into the edit form above the list.",
            "Delete from the form while editing (with confirmation).",
            "Dictionary Health on Tables highlights duplicates and missing labels.",
          ]),
        ],
      },
      applications: {
        title: "Applications",
        summary: "Register apps shown on the workspace home.",
        sections: [
          section("How to use", [
            "Create an application with an internal name and display title.",
            "Users only see apps their roles grant (or all apps if System Admin).",
            "Click a row to edit; delete from the form when needed.",
          ]),
        ],
        fields: [
          field("name", "Name", "Internal app key, e.g. budget. Used in URLs and roles."),
          field("title", "Title", "Display name on home cards and navigation."),
          field("description", "Description", "Short summary on the home card."),
        ],
      },
      tables: {
        title: "Tables",
        summary: "Dictionary entries for each database collection.",
        sections: [
          section("How to use", [
            "Each collection (table) needs a dictionary row for labels and app ownership.",
            "Reseed from DB Schema when the physical schema changes.",
            "Dictionary Health lists duplicates, missing labels, and bad references — click a row to jump to edit.",
            "Click a definition row to edit; delete from the form while editing.",
          ]),
        ],
        fields: [
          field("name", "Name", "Physical table name in the database."),
          field("label", "Label", "Human-friendly name in navigation and headers."),
          field("application", "Application", "Which app owns this table."),
          field("data_type", "Data type", "Optional metadata for the collection."),
          field("sort_order", "Sort order", "Order in navigation lists."),
        ],
      },
      fields: {
        title: "Fields",
        summary: "Dictionary labels and references for columns.",
        sections: [
          section("How to use", [
            "Field rows control labels, order, required flags, and foreign-key dropdowns on forms.",
            "Pick the parent table, then name/label the column.",
            "Set ref_table when the field should be a dropdown of another table’s rows.",
            "Set ref_label_field to the display column on that table (for example name or display_name).",
            "Click a row to edit; delete from the form while editing.",
          ]),
        ],
        fields: [
          field("table", "Table", "Parent collection this field belongs to."),
          field("name", "Name", "Physical column name."),
          field("label", "Label", "Name shown on forms and lists."),
          field("application", "Application", "Inherited from the parent table for fields."),
          field("data_type", "Data type", "Optional hint for rendering."),
          field("ref_table", "Reference table", "For dropdowns, which table to link to."),
          field(
            "ref_label_field",
            "Reference label field",
            "Column on the referenced table used as the display name (for example name)."
          ),
          field("required", "Required", "1 = required on forms, 0 = optional."),
          field("sort_order", "Sort order", "Order on create/edit forms."),
        ],
      },
      users: {
        title: "Users",
        summary: "Login accounts, passwords, and permissions.",
        sections: [
          section("How to use", [
            "Create a user with username and password (at least 8 characters).",
            "Set display name for friendlier UI labels.",
            "Grant System Admin for full access to all apps and Administration.",
            "Or grant per-application roles so the user only sees selected apps.",
            "Click a row to edit; delete from the form while editing.",
            "Users without a role for an app cannot open that app.",
          ]),
        ],
        fields: [
          field("username", "Username", "Login name."),
          field("display_name", "Display name", "Friendly name in the UI."),
          field("password", "Password", "Required on create; leave blank on edit to keep the current password."),
          field("confirm_password", "Confirm password", "Must match password when setting a new one."),
          field("is_system_admin", "System Admin", "Full access to all apps and the admin panel."),
          field("app_roles", "Application roles", "One basic role per app for non-admins."),
        ],
      },
      navigation: {
        title: "Navigation",
        summary: "Sidebar links and grouping.",
        sections: [
          section("How to use", [
            "Main links appear as parents in the left navigation.",
            "Child links reference a parent and show indented underneath.",
            "Section chooses Applications grouping (apps vs admin links still appear together in the sidebar Applications list).",
            "Application ties an apps-section link to a specific app.",
            "Reseed navigation when apps/tables change and you want defaults restored.",
            "Click a row to edit; delete from the form while editing.",
          ]),
        ],
        fields: [
          field("label", "Label", "Text shown in the sidebar."),
          field("path", "Path", "Route the link opens, e.g. /app/budget/accounts."),
          field("nav_section", "Section", "apps or admin."),
          field("application", "Application", "App key when section is apps."),
          field("icon", "Icon", "Sidebar icon key."),
          field("is_main", "Main item", "Top-level parent vs child link."),
          field("parent_id", "Parent", "Parent main link for child items."),
          field("sort_order", "Sort order", "Position within a group."),
        ],
      },
      deletes: {
        title: "Deleted records",
        summary: "Restore rows removed through the app UI.",
        sections: [
          section("How it works", [
            "Deletes from most forms and lists are soft deletes archived here.",
            "Click a row to start restore (confirm in the dialog).",
            "Restoring brings the record back into its original table when possible.",
            "Clear-all style operations may note that archived copies can still appear here.",
          ]),
        ],
      },
      logs: {
        title: "Error logs",
        summary: "Inspect client and server errors recorded by the app.",
        sections: [
          section("How to use", [
            "Browse recent errors with level, source, user, status, and URL.",
            "Click a row to open detail for message and stack context.",
            "Use this when diagnosing failed API calls or client crashes.",
          ]),
        ],
        fields: [
          field("created_at", "When", "Timestamp of the log entry."),
          field("level", "Level", "Severity such as error."),
          field("source", "Source", "Client or server origin."),
          field("user_id", "User", "Signed-in user when known."),
          field("status_code", "Status", "HTTP status when applicable."),
          field("url", "URL", "Request or page URL related to the error."),
          field("message", "Message", "Short error summary."),
        ],
      },
      "zero-boot": {
        title: "Zero Boot",
        summary: "Factory-reset user data while keeping the root admin and out-of-box configuration.",
        sections: [
          section("When to use", [
            "Start over with a clean database without reinstalling the app.",
            "Remove demo or test data before handing the system to end users.",
          ]),
          section("What is removed", [
            "Accounts, transactions, budgets, payees, goals, recurring bills, and attachments.",
            "Tasks, notes, custom dashboards, and custom SQL reports.",
            "Favorites, preferences, deleted-record archives, and error logs.",
            "All users except the root admin account.",
          ]),
          section("What is kept or restored", [
            "Root admin user and system-admin role.",
            "Budget, Tasks, Notes, and Decision Picker applications.",
            "Default account types and default income/expense categories.",
            "Dictionary metadata and standard navigation.",
            "Built-in reports that ship with the product.",
          ]),
          section("How to run", [
            "Open Administration → Zero Boot.",
            "Type ZERO to enable the button.",
            "Confirm in the dialog. The reset cannot be undone.",
          ]),
        ],
      },
      ide: {
        title: "Database IDE",
        summary: "Inspect the local database with SQL; escalate for emergency record updates.",
        sections: [
          section("How to use", [
            "Write a SELECT (or WITH / PRAGMA) query and run it to inspect rows.",
            "Use results while designing custom dashboard reports.",
            "JSON insert remains available for dictionary-aware row creation.",
          ]),
          section("Escalate for emergency updates", [
            "Custom SQL is read-only by default.",
            "Choose Escalate access and re-enter your admin password.",
            "For 15 minutes you can run INSERT, UPDATE, and DELETE for emergency fixes.",
            "End elevated access when finished, or wait for the timer to expire.",
            "Elevated statements are written to system logs.",
          ]),
          section("Safety", [
            "Without elevation, only SELECT / WITH / PRAGMA are allowed.",
            "DDL (CREATE / ALTER / DROP) stays blocked even when elevated.",
            "Dashboard custom SQL reports remain read-only SELECT.",
          ]),
        ],
      },
    },
  },
};

function cloneTopic(topic) {
  return {
    ...topic,
    sections: topic.sections ? topic.sections.map((item) => ({ ...item })) : [],
    fields: topic.fields ? topic.fields.map((item) => ({ ...item })) : [],
  };
}

export function getDocApps() {
  return Object.entries(DOC_APPS).map(([id, app]) => ({
    id,
    label: app.label,
    description: app.description,
    topicCount: Object.keys(app.topics).length,
  }));
}

export function getDocApp(appId) {
  return DOC_APPS[appId] ?? null;
}

export function getDocTopics(appId) {
  const app = getDocApp(appId);
  if (!app) {
    return [];
  }

  const topics = Object.entries(app.topics).map(([id, topic]) => ({
    id,
    title: topic.title,
    summary: topic.summary,
  }));

  if (appId === "budget") {
    for (const [reportKey, reportDoc] of Object.entries(REPORT_DOCS)) {
      topics.push({
        id: `report-${reportKey}`,
        title: reportDoc.title,
        summary: reportDoc.summary,
      });
    }
  }

  return topics;
}

export function getDocTopic(appId, topicId) {
  const app = getDocApp(appId);
  if (!app) {
    return null;
  }

  const topic = app.topics[topicId] ?? app.topics.overview;
  if (!topic) {
    return null;
  }

  return {
    appId,
    appLabel: app.label,
    topicId: app.topics[topicId] ? topicId : "overview",
    ...cloneTopic(topic),
  };
}

export function getReportDocTitle(reportKey) {
  if (REPORT_DOCS[reportKey]?.title) {
    return REPORT_DOCS[reportKey].title;
  }
  return reportKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDocTopicOrReport(appId, topicId) {
  if (topicId?.startsWith("report-")) {
    const reportKey = topicId.replace(/^report-/, "");
    const reportDoc = REPORT_DOCS[reportKey];
    if (reportDoc) {
      return {
        appId,
        appLabel: getDocApp(appId)?.label ?? appId,
        topicId,
        ...cloneTopic(reportDoc),
      };
    }
    return {
      appId,
      appLabel: getDocApp(appId)?.label ?? appId,
      topicId,
      title: getReportDocTitle(reportKey),
      summary: `Documentation for the ${getReportDocTitle(reportKey)} report.`,
      sections: [
        section(
          "About this report",
          "Open the report from Report Center to see live numbers. Reports use your current accounts, categories, and transactions."
        ),
      ],
      fields: [],
    };
  }

  return getDocTopic(appId, topicId);
}
