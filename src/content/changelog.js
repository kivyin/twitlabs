/**
 * Static release notes for the Versions page.
 * Add a new entry at the top when you ship a release (match package.json / GitHub tag).
 */
export const CHANGELOG = [
  {
    version: "1.11.0",
    date: "2026-08-04",
    title: "Calendar app",
    highlights: [
      "New Calendar app for shared events and work time frames (including overnight shifts)",
      "Day, week, and month views with large touch targets for touch-screen displays",
      "Calendar user role can add/edit/delete; Calendar view role shows a full-screen read-only kiosk calendar",
      "Tap a day/time slot to create an event with start/end and assigned person",
      "Recurring events: daily, weekly, biweekly, monthly, and yearly (birthdays), with optional end date",
      "Shopping lists on Calendar: multiple named lists, purchased strikethrough, close/reopen, and move items between lists",
      "Left-nav Calendar entry, applications list, Help docs, and Zero Boot wipe support",
    ],
  },
  {
    version: "1.10.0",
    date: "2026-08-03",
    title: "Training app",
    highlights: [
      "New Training app for weightlifting: exercise library, routines, live workout logging, history, progress, and body measurements",
      "Live logging with rest timer, RPE, supersets, and previous-session values",
      "Progress charts: weekly volume, top e1RM lifts, muscle-group volume, and per-exercise e1RM/volume trends",
      "Body weight line chart on Measurements",
      "Cardio exercises log minutes (and optional distance) instead of weight/reps",
      "Full-screen rest timer on mobile with End rest / Close",
      "Completed workouts can be edited from History",
      "AI Coach: three goals → 5–6 week day-by-day workout plan (each training day saved as a routine); Daily HIIT starts a WOD",
      "Athlete switcher moved to the bottom of Training page headers",
      "Boxing, kickboxing, martial arts drills, and mobility stretches added to the exercise library for fight-shape plans/WODs",
      "Training user role; system admins can switch athletes and view everyone’s data",
      "Left-nav Training section and Help docs",
      "Administration Backup: export all / import all database tables as JSON for migrate or offline restore",
    ],
  },
  {
    version: "1.9.79",
    date: "2026-07-31",
    title: "Notes workspace & mobile budget amounts",
    highlights: [
      "Notes hierarchy simplified to Notebook → Subject → Note (topics removed; existing topic notes migrate onto their subject)",
      "Notes browse redesigned with notebook tabs, library view, and clearer outline actions",
      "Note Edit / Done / Save / Delete / Pin actions live in the page header; title edits inline while editing",
      "Rich-text toolbar stays sticky while scrolling the note body",
      "Pasted, dropped, and linked images embed locally so notes work offline",
      "Outline shows note-type icons; Help docs updated for the new hierarchy",
      "Budget transactions: Deposit / Withdrawal toggles so you enter positive amounts (fixes Chrome mobile missing minus key)",
      "Recurring bills use the same Deposit / Withdrawal amount entry",
    ],
  },
  {
    version: "1.9",
    date: "2026-07-29",
    title: "Site Tracker app",
    highlights: [
      "New Site Tracker app for website logins and Site accounts",
      "Budget accounts list excludes Site accounts to reduce clutter",
      "Account create forms are scoped: Budget = money types, Site Tracker = Site only",
      "Site Tracker user role; admins still see every app",
      "Left-nav Site Accounts entry and Help docs for Site Tracker",
    ],
  },
  {
    version: "1.8",
    date: "2026-07-27",
    title: "Decision Picker app",
    highlights: [
      "New Decision Picker app: add options, spin an animated wheel, and pick a random winner",
      "Confetti celebration on selection, optional remove-winner, and re-spin",
      "Option lists persist per user on the server across logouts",
      "Decision Picker user role available in Administration → Users",
      "Help docs and navigation icon for Decision Picker",
      "Site inactivity timeout is configurable via SESSION_IDLE_SECONDS in .env",
    ],
  },
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
      "Version control lives in the page header (next to Help) as a dropdown: Repo, Notes, Check for updates",
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
