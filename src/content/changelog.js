/**
 * Static release notes for the Versions page.
 * Add a new entry at the top when you ship a release (match package.json / GitHub tag).
 */
export const CHANGELOG = [
  {
    version: "1.7",
    date: "2026-07-27",
    title: "Line of credit accounts & transfers",
    highlights: [
      "New Line of Credit account type (revolving liability with credit limit, like a card)",
      "LOC → bank transfer draws cash: increases amount owed and bank balance",
      "LOC → credit card/loan transfer pays down the destination: owed up on LOC, owed down on the card/loan",
      "Transaction form copy for draws, payments, and transfer callouts on lines of credit",
      "Net worth, debt, and cash-flow reports include lines of credit with other liabilities",
      "Account edit page split into Charts, Details, and Transactions tabs",
      "Selected account tab persists across navigation and login",
      "Account workspace is full-bleed with tighter spacing for more usable height",
      "Details actions match the Transactions section head layout",
      "App version status checks GitHub for newer releases",
      "Version status includes Repo link and a manual Check action",
      "Version check cache TTL is configurable via VERSION_CHECK_TTL_SECONDS",
    ],
  },
  {
    version: "1.6",
    date: "2026-07-24",
    title: "Shell chrome, navigation, and charts",
    highlights: [
      "Page header command row with Back, Favorite, Help, and account menu",
      "Logged-in user moved out of the sidebar footer; Sign out lives in the user menu",
      "Non-LCARS sidebar controls sit under the brand instead of overlapping it",
      "Left-nav groups start collapsed by default",
      "Favorite star no longer shows a separate customize pencil (edit from Favorites nav)",
      "Spending pie charts show on-slice labels (name, amount, percent)",
      "Data table toolbar merged into the column header band",
      "Account type, opening balance, and current balance shown in the page header meta",
    ],
  },
];

export function getChangelog() {
  return CHANGELOG;
}

export function getChangelogEntry(version) {
  const normalized = String(version || "")
    .trim()
    .replace(/^v/i, "");
  return CHANGELOG.find((entry) => entry.version === normalized) ?? null;
}
