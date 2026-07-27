import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Load .env before resolving data paths (SQLITE_DB_PATH, SQLITE_DATA_DIR, GEMINI_API_KEY, …).
(() => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
})();

const resolveDataRoot = () => {
  const configured = process.env.SQLITE_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), "data");
};

const DATA_ROOT = resolveDataRoot();

const resolveDbPath = () => {
  const configured = process.env.SQLITE_DB_PATH?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(DATA_ROOT, "mydb.db");
};

const dbPath = resolveDbPath();
mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

const GITHUB_REPO = process.env.GITHUB_REPO?.trim() || "kivyin/twitlabs";
const VERSION_CHECK_TTL_MS = (() => {
  const raw = process.env.VERSION_CHECK_TTL_SECONDS?.trim();
  const seconds = raw ? Number(raw) : 300;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 5 * 60 * 1000;
  }
  return Math.floor(seconds * 1000);
})();
let versionCheckCache = null;

function readPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    return String(pkg.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function normalizeReleaseVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[+/]/)[0];
}

function compareReleaseVersions(left, right) {
  const a = normalizeReleaseVersion(left)
    .split(".")
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const b = normalizeReleaseVersion(right)
    .split(".")
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta > 0) return 1;
    if (delta < 0) return -1;
  }
  return 0;
}

async function fetchLatestGitHubRelease({ force = false } = {}) {
  const now = Date.now();
  if (
    !force &&
    versionCheckCache &&
    now - versionCheckCache.fetchedAt < VERSION_CHECK_TTL_MS &&
    versionCheckCache.ok
  ) {
    return versionCheckCache;
  }

  const current = process.env.APP_VERSION?.trim() || readPackageVersion();
  const repo = GITHUB_REPO;

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "twitlabs-version-check",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const message = `GitHub release check failed (${response.status}).`;
      versionCheckCache = {
        ok: false,
        fetchedAt: now,
        payload: {
          status: "unknown",
          current: normalizeReleaseVersion(current),
          latest: null,
          releaseUrl: `https://github.com/${repo}/releases`,
          releaseName: null,
          repo,
          error: message,
          checkedAt: new Date(now).toISOString(),
        },
      };
      return versionCheckCache;
    }

    const release = await response.json();
    const latest = normalizeReleaseVersion(release.tag_name || release.name || "");
    const normalizedCurrent = normalizeReleaseVersion(current);
    const updateAvailable = latest ? compareReleaseVersions(latest, normalizedCurrent) > 0 : false;

    versionCheckCache = {
      ok: true,
      fetchedAt: now,
      payload: {
        status: updateAvailable ? "update-available" : "up-to-date",
        current: normalizedCurrent,
        latest: latest || null,
        releaseUrl: release.html_url || `https://github.com/${repo}/releases`,
        releaseName: release.name || release.tag_name || null,
        repo,
        checkedAt: new Date(now).toISOString(),
      },
    };
    return versionCheckCache;
  } catch (error) {
    versionCheckCache = {
      ok: false,
      fetchedAt: now,
      payload: {
        status: "error",
        current: normalizeReleaseVersion(current),
        latest: null,
        releaseUrl: `https://github.com/${repo}/releases`,
        releaseName: null,
        repo,
        error: error?.message || "GitHub release check failed.",
        checkedAt: new Date(now).toISOString(),
      },
    };
    return versionCheckCache;
  }
}

const ATTACHMENTS_DIR = path.join(DATA_ROOT, "attachments");
const ACCOUNT_IMAGES_DIR = path.join(DATA_ROOT, "account-images");
const LOGS_DIR = path.join(DATA_ROOT, "logs");

const SYSTEM_DICTIONARY_TABLE = "system_dictionary";
const APPLICATIONS_TABLE = "applications";
const USERS_TABLE = "users";
const USER_ROLES_TABLE = "user_roles";
const ACCOUNT_TYPES_TABLE = "account_types";
const ACCOUNTS_TABLE = "accounts";
const ACCOUNT_JOINT_USERS_TABLE = "account_joint_users";
const DASHBOARD_REPORTS_TABLE = "dashboard_reports";
const DASHBOARDS_TABLE = "dashboards";
const DASHBOARD_LAYOUT_ITEMS_TABLE = "dashboard_layout_items";
const USER_FAVORITES_TABLE = "user_favorites";
const USER_PREFERENCES_TABLE = "user_preferences";
const TRANSACTIONS_TABLE = "transactions";
const CATEGORY_TYPES_TABLE = "category_types";
const CATEGORIES_TABLE = "categories";
const BUDGETS_TABLE = "budgets";
const PAYEES_TABLE = "payees";
const PAYEE_RULES_TABLE = "payee_rules";
const TRANSACTION_SPLITS_TABLE = "transaction_splits";
const TRANSACTION_ATTACHMENTS_TABLE = "transaction_attachments";
const RECURRING_TRANSACTIONS_TABLE = "recurring_transactions";
const GOALS_TABLE = "goals";
const NET_WORTH_SNAPSHOTS_TABLE = "net_worth_snapshots";
const TASK_PROJECTS_TABLE = "task_projects";
const TASKS_TABLE = "tasks";
const TASK_SUBTASKS_TABLE = "task_subtasks";
const TASK_TAGS_TABLE = "task_tags";
const TASK_TAG_LINKS_TABLE = "task_tag_links";
const POMODORO_SESSIONS_TABLE = "pomodoro_sessions";
const NOTEBOOKS_TABLE = "notebooks";
const NOTE_SUBJECTS_TABLE = "note_subjects";
const NOTE_TOPICS_TABLE = "note_topics";
const NOTES_TABLE = "notes";
const SYSTEM_DELETES_TABLE = "system_deletes";
const SYSTEM_NAVIGATION_TABLE = "system_navigation";
const SYSTEM_LOGS_TABLE = "system_logs";

// Tables excluded from auto-discovery in the app dictionary
const SYSTEM_TABLES = new Set([
  SYSTEM_DELETES_TABLE,
  SYSTEM_NAVIGATION_TABLE,
  SYSTEM_LOGS_TABLE,
  ACCOUNT_JOINT_USERS_TABLE,
]);

const APP_USER_ROLES = {
  budget: "budget_user",
  tasks: "task_user",
  notes: "note_user",
};

const SHARED_LOOKUP_TABLES = new Set(["users", "applications"]);

const DELETE_ARCHIVE_EXCLUDED = new Set([
  SYSTEM_DELETES_TABLE,
  SYSTEM_NAVIGATION_TABLE,
  SYSTEM_LOGS_TABLE,
  USER_PREFERENCES_TABLE,
  ACCOUNT_JOINT_USERS_TABLE,
]);

const HIDDEN_NAV_TABLES = new Set([
  "system_dictionary",
  "applications",
  "users",
  "user_roles",
  SYSTEM_DELETES_TABLE,
  SYSTEM_NAVIGATION_TABLE,
  SYSTEM_LOGS_TABLE,
  TRANSACTION_SPLITS_TABLE,
  TRANSACTION_ATTACHMENTS_TABLE,
  NET_WORTH_SNAPSHOTS_TABLE,
  TASK_SUBTASKS_TABLE,
  TASK_TAG_LINKS_TABLE,
  POMODORO_SESSIONS_TABLE,
  DASHBOARDS_TABLE,
  DASHBOARD_LAYOUT_ITEMS_TABLE,
  USER_FAVORITES_TABLE,
  USER_PREFERENCES_TABLE,
  ACCOUNT_JOINT_USERS_TABLE,
]);

const DEFAULT_ADMIN_NAV_ITEMS = [
  { label: "Applications", path: "/admin/applications", icon: "applications", sort_order: 10 },
  { label: "Tables", path: "/admin/tables", icon: "tables", sort_order: 20 },
  { label: "Fields", path: "/admin/fields", icon: "fields", sort_order: 30 },
  { label: "Users", path: "/admin/users", icon: "users", sort_order: 40 },
  { label: "Deleted Records", path: "/admin/deletes", icon: "deletes", sort_order: 50 },
  { label: "Error Logs", path: "/admin/logs", icon: "logs", sort_order: 55 },
  { label: "Navigation", path: "/admin/navigation", icon: "navigation", sort_order: 60 },
  { label: "IDE", path: "/admin/ide", icon: "ide", sort_order: 70 },
  { label: "Zero Boot", path: "/admin/zero-boot", icon: "deletes", sort_order: 90 },
];

const AUDIT_FIELDS = ["created_by", "created_on", "updated_by", "updated_on"];

const AUDIT_FIELD_LABELS = {
  created_by: "Created By",
  created_on: "Created On",
  updated_by: "Updated By",
  updated_on: "Updated On",
};

const DEFAULT_CATEGORY_TYPES = ["income", "expense"];

const DEFAULT_CATEGORIES = {
  income: ["Salary", "Paycheck", "Interest", "Other Income"],
  expense: [
    "Groceries",
    "Rent / Mortgage",
    "Utilities",
    "Transportation",
    "Dining Out",
    "Entertainment",
    "Healthcare",
    "Insurance",
    "Shopping",
    "Subscriptions",
    "Personal Care",
    "Education",
    "Gifts",
    "Other Expense",
  ],
};

const DEFAULT_ACCOUNT_TYPES = [
  "Credit Card",
  "Line of Credit",
  "Loan",
  "Bank Checking",
  "Bank Savings",
  "Site account",
];

const LIABILITY_ACCOUNT_TYPES = new Set(["Credit Card", "Line of Credit", "Loan"]);
const LIABILITY_ACCOUNT_TYPE_SQL = "'Credit Card', 'Line of Credit', 'Loan'";
const LINE_OF_CREDIT_TYPE_NAME = "Line of Credit";

const LEGACY_ACCOUNT_TYPE_MAP = {
  checking: "Bank Checking",
  savings: "Bank Savings",
  credit: "Credit Card",
  cash: "Bank Checking",
};

const SITE_ACCOUNT_TYPE_NAME = "Site account";

const SITE_ACCOUNT_COLUMNS = [
  { name: "login_url", label: "URL" },
  { name: "site_username", label: "Username" },
  { name: "site_password", label: "Password" },
  { name: "notes", label: "Notes" },
  { name: "account_number", label: "Account Number" },
];

const ACCOUNT_FIELD_LABELS = {
  account_type_id: "Account Type",
  opening_balance: "Opening Balance",
  credit_limit: "Credit Limit",
  apr: "APR (%)",
  minimum_payment: "Minimum Payment",
  owner_user_id: "Owner",
  is_joint: "Joint account",
  login_url: "URL",
  site_username: "Username",
  site_password: "Password",
  notes: "Notes",
  account_number: "Account Number",
  user_id: "Added by",
};

const isLineOfCreditAccountTypeName = (typeName) => {
  const normalized = String(typeName || "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (typeName === LINE_OF_CREDIT_TYPE_NAME) return true;
  return (
    normalized === "line of credit" ||
    normalized === "loc" ||
    normalized.includes("line of credit") ||
    normalized.includes("heloc") ||
    normalized === "home equity line of credit"
  );
};

const isLiabilityAccountTypeName = (typeName) => {
  const normalized = String(typeName || "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (LIABILITY_ACCOUNT_TYPES.has(typeName)) return true;
  if (isLineOfCreditAccountTypeName(typeName)) return true;
  return (
    normalized === "loan" ||
    normalized === "credit card" ||
    normalized.includes("loan") ||
    normalized.includes("credit card") ||
    normalized.includes("creditcard")
  );
};

// In-memory sessions: token → { user, lastSeenAt, mustChangePassword }
const sessions = new Map();
const SESSION_IDLE_MS = 5 * 60 * 1000;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();

const hashPassword = (pwd) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(pwd), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (pwd, stored) => {
  if (!stored || typeof stored !== "string") {
    return false;
  }

  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) {
      return false;
    }
    const [, salt, hash] = parts;
    const actual = scryptSync(String(pwd), salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (actual.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(actual, expected);
  }

  // Legacy SHA-256 hashes from earlier builds.
  const legacy = createHash("sha256").update(String(pwd)).digest("hex");
  return legacy === stored;
};

const generateToken = () => randomBytes(32).toString("hex");

const getClientIp = (req) =>
  String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() ||
  req.socket?.remoteAddress ||
  "unknown";

const assertLoginNotRateLimited = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return;
  }
  if (entry.count >= LOGIN_RATE_MAX_ATTEMPTS) {
    const minutes = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
    throw new Error(`Too many login attempts. Try again in about ${minutes} minute(s).`);
  }
};

const recordLoginFailure = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return;
  }
  entry.count += 1;
};

const clearLoginFailures = (req) => {
  loginAttempts.delete(getClientIp(req));
};

const IDE_ELEVATION_MS = 15 * 60 * 1000;

const createSession = (user, { mustChangePassword = false } = {}) => {
  const token = generateToken();
  sessions.set(token, {
    user,
    lastSeenAt: Date.now(),
    mustChangePassword: Boolean(mustChangePassword),
    ideElevatedUntil: null,
  });
  return token;
};

const getIdeElevatedUntil = (sessionLike) => {
  const until = Number(sessionLike?.ideElevatedUntil);
  if (!Number.isFinite(until) || until <= Date.now()) {
    return null;
  }
  return until;
};

const isIdeElevated = (sessionLike) => getIdeElevatedUntil(sessionLike) != null;

const clearIdeElevation = (storedSession) => {
  if (storedSession) {
    storedSession.ideElevatedUntil = null;
  }
};

const getSessionRecord = (req, { touch = true } = {}) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (Date.now() - session.lastSeenAt > SESSION_IDLE_MS) {
    sessions.delete(token);
    return null;
  }

  if (session.ideElevatedUntil && Number(session.ideElevatedUntil) <= Date.now()) {
    session.ideElevatedUntil = null;
  }

  if (touch) {
    session.lastSeenAt = Date.now();
  }

  return { token, ...session };
};

const isValidIdentifier = (value) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
const quoteIdentifier = (value) => `"${value.replace(/"/g, "\"\"")}"`;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const all = (sql, params = []) => db.prepare(sql).all(...params);

const run = (sql, params = []) => {
  const result = db.prepare(sql).run(...params);
  return {
    changes: result.changes ?? 0,
    lastID: Number(result.lastInsertRowid ?? 0),
  };
};

const formatLabel = (value) =>
  value
    .replace(/_id$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const hasColumn = (table, column) => {
  const columns = all(`PRAGMA table_info(${table})`);
  return columns.some((entry) => entry.name === column);
};

const hasTable = (table) =>
  all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1", [table])
    .length > 0;

const auditTimestamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const tableSupportsAudit = (table) => hasColumn(table, "created_on");

const stripAuditFields = (data) => {
  const cleaned = { ...data };
  for (const field of AUDIT_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
};

const withAuditForInsert = (table, data, userId) => {
  if (!tableSupportsAudit(table)) {
    return stripAuditFields(data);
  }

  const timestamp = auditTimestamp();
  return {
    ...stripAuditFields(data),
    created_by: userId ?? null,
    created_on: timestamp,
    updated_by: userId ?? null,
    updated_on: timestamp,
  };
};

const withAuditForUpdate = (table, data, userId) => {
  if (!tableSupportsAudit(table)) {
    return stripAuditFields(data);
  }

  return {
    ...stripAuditFields(data),
    updated_by: userId ?? null,
    updated_on: auditTimestamp(),
  };
};

const insertAuditedRow = (table, data, userId) => {
  assertValidTable(table);
  const audited = withAuditForInsert(table, data, userId);
  const entries = Object.entries(audited);
  if (entries.length === 0) {
    throw new Error("data is required for insert.");
  }

  const safeTable = quoteIdentifier(table);
  const keys = entries.map(([key]) => key);
  for (const key of keys) {
    if (!isValidIdentifier(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
  }

  const placeholders = entries.map(() => "?").join(", ");
  return run(
    `INSERT INTO ${safeTable} (${keys.map((key) => quoteIdentifier(key)).join(", ")}) VALUES (${placeholders})`,
    entries.map(([, value]) => value)
  );
};

const updateAuditedRow = (table, data, where, whereParams, userId) => {
  assertValidTable(table);
  if (!where) {
    throw new Error("where is required for update.");
  }

  const audited = withAuditForUpdate(table, data, userId);
  const entries = Object.entries(audited);
  if (entries.length === 0) {
    throw new Error("data is required for update.");
  }

  const safeTable = quoteIdentifier(table);
  const setClauses = entries.map(([key]) => {
    if (!isValidIdentifier(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
    return `${quoteIdentifier(key)} = ?`;
  });

  return run(
    `UPDATE ${safeTable} SET ${setClauses.join(", ")} WHERE ${where}`,
    [...entries.map(([, value]) => value), ...whereParams]
  );
};

const ensureAuditColumns = () => {
  const rows = all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  for (const { name: tableName } of rows) {
    if (!hasColumn(tableName, "created_by")) {
      run(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN created_by INTEGER`);
    }
    if (!hasColumn(tableName, "created_on")) {
      run(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN created_on TEXT`);
    }
    if (!hasColumn(tableName, "updated_by")) {
      run(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN updated_by INTEGER`);
    }
    if (!hasColumn(tableName, "updated_on")) {
      run(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN updated_on TEXT`);
    }
  }
};

const ensureAuditDictionaryLabels = () => {
  for (const [name, label] of Object.entries(AUDIT_FIELD_LABELS)) {
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET label = ?,
            ref_table = CASE
              WHEN name IN ('created_by', 'updated_by') THEN 'users'
              ELSE ref_table
            END
        WHERE type = 'field' AND name = ?
      `,
      [label, name]
    );
  }
};

const ensureApplications = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${APPLICATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT
    )
  `);

  run(`
    INSERT OR IGNORE INTO ${APPLICATIONS_TABLE} (name, title, description)
    VALUES ('budget', 'Budget', 'Manage budget tables, records, and forms.')
  `);

  run(`
    INSERT OR IGNORE INTO ${APPLICATIONS_TABLE} (name, title, description)
    VALUES ('tasks', 'Tasks', 'Track tasks, projects, priorities, and focus sessions.')
  `);

  run(`
    INSERT OR IGNORE INTO ${APPLICATIONS_TABLE} (name, title, description)
    VALUES ('notes', 'Notes', 'Organize notebooks, subjects, topics, and rich notes.')
  `);
};

const ensureUsers = () => {
  // If the table exists with an incompatible schema (missing username column), drop and recreate
  const tableExists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").length > 0;
  if (tableExists && !hasColumn(USERS_TABLE, "username")) {
    run(`DROP TABLE ${USERS_TABLE}`);
  }

  run(`
    CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  // Handle additive schema migrations
  if (!hasColumn(USERS_TABLE, "display_name")) {
    run(`ALTER TABLE ${USERS_TABLE} ADD COLUMN display_name TEXT`);
  }
  if (!hasColumn(USERS_TABLE, "role")) {
    run(`ALTER TABLE ${USERS_TABLE} ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  }

  const userCount = all(`SELECT COUNT(*) AS count FROM ${USERS_TABLE}`)[0].count;
  if (userCount === 0) {
    run(
      `INSERT INTO ${USERS_TABLE} (username, password, display_name, role) VALUES (?, ?, ?, ?)`,
      ["admin", hashPassword("admin"), "Administrator", "admin"]
    );
  }
};

const ensureUserRoles = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${USER_ROLES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      application TEXT NOT NULL DEFAULT 'system',
      role TEXT NOT NULL DEFAULT 'member',
      UNIQUE(user_id, application)
    )
  `);

  // Migrate: grant system admin to any user with legacy role='admin'
  const legacyAdmins = all(`SELECT id FROM ${USERS_TABLE} WHERE role = 'admin'`);
  for (const user of legacyAdmins) {
    run(
      `INSERT OR IGNORE INTO ${USER_ROLES_TABLE} (user_id, application, role) VALUES (?, 'system', 'admin')`,
      [user.id]
    );
  }

  // Migrate legacy per-app "member" roles to named app user roles.
  for (const [application, roleName] of Object.entries(APP_USER_ROLES)) {
    run(
      `UPDATE ${USER_ROLES_TABLE} SET role = ? WHERE application = ? AND role = 'member'`,
      [roleName, application]
    );
  }
};

const getUserRoles = (userId) =>
  all(`SELECT application, role FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [userId]);

const isAllowedRoleAssignment = (application, role) => {
  if (application === "system" && role === "admin") {
    return true;
  }
  return APP_USER_ROLES[application] === role;
};

const setUserRoles = (userId, roles, actingUserId = null) => {
  if (!Array.isArray(roles)) {
    throw new Error("roles must be an array.");
  }

  for (const entry of roles) {
    const application = String(entry?.application ?? "").trim();
    const role = String(entry?.role ?? "").trim();
    if (!application || !role || !isAllowedRoleAssignment(application, role)) {
      throw new Error(
        `Invalid role assignment: ${application || "(missing app)"} / ${role || "(missing role)"}.`
      );
    }
  }

  run(`DELETE FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [userId]);
  for (const { application, role } of roles) {
    insertAuditedRow(
      USER_ROLES_TABLE,
      { user_id: userId, application, role },
      actingUserId
    );
  }
  // Update any active sessions for this user so role changes take effect immediately
  for (const [token, session] of sessions.entries()) {
    if (session.user?.id === userId) {
      sessions.set(token, {
        ...session,
        user: { ...session.user, roles: getUserRoles(userId) },
      });
    }
  }
};

const ensureAccountTypes = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${ACCOUNT_TYPES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  for (const name of DEFAULT_ACCOUNT_TYPES) {
    run(`INSERT OR IGNORE INTO ${ACCOUNT_TYPES_TABLE} (name) VALUES (?)`, [name]);
  }
};

const ensureAccountSiteColumns = () => {
  const accountsExists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [ACCOUNTS_TABLE])
      .length > 0;

  if (!accountsExists) {
    return;
  }

  for (const column of SITE_ACCOUNT_COLUMNS) {
    if (!hasColumn(ACCOUNTS_TABLE, column.name)) {
      run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN ${column.name} TEXT`);
    }
  }
};

const ensureAccountDictionaryLabels = () => {
  for (const [name, label] of Object.entries(ACCOUNT_FIELD_LABELS)) {
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET label = ?
        WHERE "table" = ? AND name = ? AND type = 'field'
      `,
      [label, ACCOUNTS_TABLE, name]
    );
  }

  run(
    `DELETE FROM ${SYSTEM_DICTIONARY_TABLE} WHERE type = 'collection' AND name = ?`,
    [ACCOUNT_JOINT_USERS_TABLE]
  );
  run(
    `DELETE FROM ${SYSTEM_DICTIONARY_TABLE} WHERE type = 'field' AND "table" = ?`,
    [ACCOUNT_JOINT_USERS_TABLE]
  );
};

const ensureAccountsSchema = () => {
  ensureAccountTypes();

  const accountsExists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [ACCOUNTS_TABLE])
      .length > 0;

  if (!accountsExists) {
    run(`
      CREATE TABLE ${ACCOUNTS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        account_type_id INTEGER NOT NULL,
        balance REAL DEFAULT 0,
        account_number TEXT,
        login_url TEXT,
        site_username TEXT,
        site_password TEXT,
        notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES ${USERS_TABLE}(id),
        FOREIGN KEY (account_type_id) REFERENCES ${ACCOUNT_TYPES_TABLE}(id)
      )
    `);
    return;
  }

  if (!hasColumn(ACCOUNTS_TABLE, "account_type_id")) {
    if (!hasColumn(ACCOUNTS_TABLE, "type")) {
      run(
        `ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN account_type_id INTEGER REFERENCES ${ACCOUNT_TYPES_TABLE}(id)`
      );
    } else {
      const typeNameToId = Object.fromEntries(
        all(`SELECT id, name FROM ${ACCOUNT_TYPES_TABLE}`).map((row) => [row.name, row.id])
      );
      const defaultTypeId = typeNameToId["Bank Checking"];

      run(`
        CREATE TABLE accounts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT NOT NULL,
          account_type_id INTEGER NOT NULL,
          balance REAL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES ${USERS_TABLE}(id),
          FOREIGN KEY (account_type_id) REFERENCES ${ACCOUNT_TYPES_TABLE}(id)
        )
      `);

      const existingAccounts = all(
        `SELECT id, user_id, name, type, balance FROM ${ACCOUNTS_TABLE}`
      );

      for (const account of existingAccounts) {
        const typeName = LEGACY_ACCOUNT_TYPE_MAP[account.type] ?? "Bank Checking";
        const accountTypeId = typeNameToId[typeName] ?? defaultTypeId;

        run(
          `INSERT INTO accounts_new (id, user_id, name, account_type_id, balance) VALUES (?, ?, ?, ?, ?)`,
          [account.id, account.user_id, account.name, accountTypeId, account.balance ?? 0]
        );
      }

      run(`DROP TABLE ${ACCOUNTS_TABLE}`);
      run(`ALTER TABLE accounts_new RENAME TO ${ACCOUNTS_TABLE}`);

      run(
        `DELETE FROM ${SYSTEM_DICTIONARY_TABLE} WHERE "table" = ? AND name = 'type' AND type = 'field'`,
        [ACCOUNTS_TABLE]
      );
    }
  }

  ensureAccountSiteColumns();

  if (!hasColumn(ACCOUNTS_TABLE, "opening_balance")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0`);
  }

  if (!hasColumn(ACCOUNTS_TABLE, "credit_limit")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN credit_limit REAL`);
  }

  if (!hasColumn(ACCOUNTS_TABLE, "image_path")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN image_path TEXT`);
  }
  if (!hasColumn(ACCOUNTS_TABLE, "image_mime_type")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN image_mime_type TEXT`);
  }

  if (!hasColumn(ACCOUNTS_TABLE, "owner_user_id")) {
    run(
      `ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN owner_user_id INTEGER REFERENCES ${USERS_TABLE}(id)`
    );
    // Named owner defaults to whoever added the account historically.
    run(
      `UPDATE ${ACCOUNTS_TABLE} SET owner_user_id = user_id WHERE owner_user_id IS NULL AND user_id IS NOT NULL`
    );
  }

  if (!hasColumn(ACCOUNTS_TABLE, "is_joint")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN is_joint INTEGER NOT NULL DEFAULT 0`);
  }

  if (!hasColumn(ACCOUNTS_TABLE, "sort_order")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
    run(`UPDATE ${ACCOUNTS_TABLE} SET sort_order = id`);
  }

  run(`
    CREATE TRIGGER IF NOT EXISTS accounts_sort_order_ai
    AFTER INSERT ON ${ACCOUNTS_TABLE}
    WHEN NEW.sort_order = 0
    BEGIN
      UPDATE ${ACCOUNTS_TABLE}
      SET sort_order = (
        SELECT IFNULL(MAX(sort_order), -1) + 1 FROM ${ACCOUNTS_TABLE} WHERE id != NEW.id
      )
      WHERE id = NEW.id;
    END
  `);

  // Loans that stored principal in credit_limit (old UX) → opening_balance.
  // Skip when a positive charge already posted (that charge is likely the principal).
  run(`
    UPDATE ${ACCOUNTS_TABLE}
    SET
      opening_balance = credit_limit,
      balance = CAST(credit_limit AS REAL) + (
        SELECT COALESCE(SUM(t.amount), 0)
        FROM ${TRANSACTIONS_TABLE} t
        WHERE t.account_id = ${ACCOUNTS_TABLE}.id
      ),
      credit_limit = NULL
    WHERE account_type_id IN (
      SELECT id FROM ${ACCOUNT_TYPES_TABLE} WHERE LOWER(name) = 'loan'
    )
      AND COALESCE(opening_balance, 0) = 0
      AND credit_limit IS NOT NULL
      AND CAST(credit_limit AS REAL) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM ${TRANSACTIONS_TABLE} t
        WHERE t.account_id = ${ACCOUNTS_TABLE}.id
          AND CAST(t.amount AS REAL) > 0.005
      )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${ACCOUNT_JOINT_USERS_TABLE} (
      account_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (account_id, user_id),
      FOREIGN KEY (account_id) REFERENCES ${ACCOUNTS_TABLE}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE
    )
  `);
  run(`
    CREATE INDEX IF NOT EXISTS account_joint_users_user_idx
    ON ${ACCOUNT_JOINT_USERS_TABLE}(user_id)
  `);
};

const ensureSchemaMigrationsTable = () => {
  run(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      name TEXT PRIMARY KEY,
      applied_on TEXT NOT NULL
    )
  `);
};

const hasSchemaMigration = (name) =>
  all(`SELECT 1 FROM _schema_migrations WHERE name = ? LIMIT 1`, [name]).length > 0;

const markSchemaMigration = (name) => {
  ensureSchemaMigrationsTable();
  run(`INSERT OR IGNORE INTO _schema_migrations (name, applied_on) VALUES (?, datetime('now'))`, [
    name,
  ]);
};

const ensureLiabilityPositiveOwedSemantics = () => {
  ensureSchemaMigrationsTable();
  if (hasSchemaMigration("liability_positive_owed_v1")) {
    return;
  }

  const transactionsExist =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [
      TRANSACTIONS_TABLE,
    ]).length > 0;

  if (!transactionsExist) {
    return;
  }

  const liabilityTypeIds = all(
    `SELECT id FROM ${ACCOUNT_TYPES_TABLE} WHERE name IN (${LIABILITY_ACCOUNT_TYPE_SQL})`
  ).map((row) => row.id);

  if (!liabilityTypeIds.length) {
    markSchemaMigration("liability_positive_owed_v1");
    return;
  }

  const placeholders = liabilityTypeIds.map(() => "?").join(", ");

  run(
    `
      UPDATE ${ACCOUNTS_TABLE}
      SET opening_balance = -opening_balance,
          balance = -balance
      WHERE account_type_id IN (${placeholders})
    `,
    liabilityTypeIds
  );

  run(
    `
      UPDATE ${TRANSACTIONS_TABLE}
      SET amount = -amount
      WHERE account_id IN (
        SELECT id
        FROM ${ACCOUNTS_TABLE}
        WHERE account_type_id IN (${placeholders})
      )
    `,
    liabilityTypeIds
  );

  markSchemaMigration("liability_positive_owed_v1");
};

const ensureDashboardSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${DASHBOARD_REPORTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application TEXT NOT NULL DEFAULT 'budget',
      name TEXT NOT NULL,
      description TEXT,
      widget_kind TEXT NOT NULL CHECK(widget_kind IN ('stat', 'table', 'bars')),
      sql TEXT NOT NULL,
      label_column TEXT,
      value_column TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate to chart-capable reports: add chart_config and drop the
  // restrictive widget_kind CHECK so new chart types can be stored.
  if (!hasColumn(DASHBOARD_REPORTS_TABLE, "chart_config")) {
    const hasAudit = hasColumn(DASHBOARD_REPORTS_TABLE, "created_by");
    run(`
      CREATE TABLE ${DASHBOARD_REPORTS_TABLE}_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application TEXT NOT NULL DEFAULT 'budget',
        name TEXT NOT NULL,
        description TEXT,
        widget_kind TEXT NOT NULL,
        sql TEXT NOT NULL,
        label_column TEXT,
        value_column TEXT,
        chart_config TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);
    const auditSelect = hasAudit
      ? ", created_by, created_on, updated_by, updated_on"
      : ", NULL, NULL, NULL, NULL";
    run(`
      INSERT INTO ${DASHBOARD_REPORTS_TABLE}_migrated
        (id, application, name, description, widget_kind, sql, label_column,
         value_column, chart_config, sort_order, created_at,
         created_by, created_on, updated_by, updated_on)
      SELECT id, application, name, description, widget_kind, sql, label_column,
             value_column, NULL, sort_order, created_at${auditSelect}
      FROM ${DASHBOARD_REPORTS_TABLE}
    `);
    run(`DROP TABLE ${DASHBOARD_REPORTS_TABLE}`);
    run(`ALTER TABLE ${DASHBOARD_REPORTS_TABLE}_migrated RENAME TO ${DASHBOARD_REPORTS_TABLE}`);
  }

  run(`
    CREATE TABLE IF NOT EXISTS ${DASHBOARDS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application TEXT NOT NULL DEFAULT 'budget',
      user_id INTEGER NOT NULL REFERENCES ${USERS_TABLE}(id),
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      created_on TEXT,
      updated_by INTEGER,
      updated_on TEXT
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${DASHBOARD_LAYOUT_ITEMS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dashboard_id INTEGER NOT NULL REFERENCES ${DASHBOARDS_TABLE}(id),
      report_key TEXT NOT NULL,
      span INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  run(`
    CREATE INDEX IF NOT EXISTS idx_dashboard_layout_items_dashboard
    ON ${DASHBOARD_LAYOUT_ITEMS_TABLE}(dashboard_id)
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${USER_FAVORITES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES ${USERS_TABLE}(id),
      label TEXT NOT NULL,
      path TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_on TEXT,
      UNIQUE(user_id, path)
    )
  `);

  // Migrate favorites to support custom colors and uploaded icon images
  // (stored inline as data URLs since favorite icons are small).
  if (!hasColumn(USER_FAVORITES_TABLE, "color")) {
    run(`ALTER TABLE ${USER_FAVORITES_TABLE} ADD COLUMN color TEXT`);
  }
  if (!hasColumn(USER_FAVORITES_TABLE, "custom_icon_data")) {
    run(`ALTER TABLE ${USER_FAVORITES_TABLE} ADD COLUMN custom_icon_data TEXT`);
  }

  run(`
    CREATE TABLE IF NOT EXISTS ${USER_PREFERENCES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES ${USERS_TABLE}(id),
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      UNIQUE(user_id, pref_key)
    )
  `);

  run(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key
    ON ${USER_PREFERENCES_TABLE}(user_id, pref_key)
  `);
};

const TRANSACTION_FIELD_LABELS = {
  user_id: "User",
  cleared: "Cleared",
  transaction_kind: "Kind",
  linked_transaction_id: "Linked Transaction",
  payee_id: "Payee",
};

const RECURRING_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

const ensureTransactionsSchema = () => {
  const exists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [
      TRANSACTIONS_TABLE,
    ]).length > 0;

  if (!exists) {
    return;
  }

  if (!hasColumn(TRANSACTIONS_TABLE, "linked_transaction_id")) {
    run(
      `ALTER TABLE ${TRANSACTIONS_TABLE} ADD COLUMN linked_transaction_id INTEGER REFERENCES ${TRANSACTIONS_TABLE}(id)`
    );
  }

  if (!hasColumn(TRANSACTIONS_TABLE, "transaction_kind")) {
    run(
      `ALTER TABLE ${TRANSACTIONS_TABLE} ADD COLUMN transaction_kind TEXT NOT NULL DEFAULT 'standard'`
    );
  }

  if (!hasColumn(TRANSACTIONS_TABLE, "user_id")) {
    run(
      `ALTER TABLE ${TRANSACTIONS_TABLE} ADD COLUMN user_id INTEGER REFERENCES ${USERS_TABLE}(id)`
    );
  }

  if (!hasColumn(TRANSACTIONS_TABLE, "cleared")) {
    run(
      `ALTER TABLE ${TRANSACTIONS_TABLE} ADD COLUMN cleared INTEGER NOT NULL DEFAULT 0`
    );
  }
};

const ensureCategoryFinanceSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${CATEGORY_TYPES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${CATEGORIES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type_id INTEGER NOT NULL,
      FOREIGN KEY (type_id) REFERENCES ${CATEGORY_TYPES_TABLE}(id)
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${BUDGETS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      month TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES ${CATEGORIES_TABLE}(id)
    )
  `);

  run(`
    CREATE UNIQUE INDEX IF NOT EXISTS budgets_category_month_key
    ON ${BUDGETS_TABLE}(category_id, month)
  `);
};

const ensurePhase2Schema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${PAYEES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      default_category_id INTEGER REFERENCES ${CATEGORIES_TABLE}(id),
      description TEXT,
      notes TEXT
    )
  `);

  if (!hasColumn(PAYEES_TABLE, "description")) {
    run(`ALTER TABLE ${PAYEES_TABLE} ADD COLUMN description TEXT`);
  }

  run(`
    CREATE TABLE IF NOT EXISTS ${PAYEE_RULES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES ${CATEGORIES_TABLE}(id),
      payee_id INTEGER REFERENCES ${PAYEES_TABLE}(id),
      account_id INTEGER REFERENCES ${ACCOUNTS_TABLE}(id),
      priority INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TRANSACTION_SPLITS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES ${TRANSACTIONS_TABLE}(id),
      category_id INTEGER NOT NULL REFERENCES ${CATEGORIES_TABLE}(id),
      amount REAL NOT NULL,
      description TEXT
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TRANSACTION_ATTACHMENTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES ${TRANSACTIONS_TABLE}(id),
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload'
    )
  `);

  run(`
    CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction
    ON ${TRANSACTION_ATTACHMENTS_TABLE}(transaction_id)
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${RECURRING_TRANSACTIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES ${USERS_TABLE}(id),
      account_id INTEGER NOT NULL REFERENCES ${ACCOUNTS_TABLE}(id),
      payee_id INTEGER REFERENCES ${PAYEES_TABLE}(id),
      category_id INTEGER NOT NULL REFERENCES ${CATEGORIES_TABLE}(id),
      amount REAL NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
      day_of_month INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_posted_date TEXT
    )
  `);

  const transactionsExists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [
      TRANSACTIONS_TABLE,
    ]).length > 0;

  if (transactionsExists && !hasColumn(TRANSACTIONS_TABLE, "payee_id")) {
    run(
      `ALTER TABLE ${TRANSACTIONS_TABLE} ADD COLUMN payee_id INTEGER REFERENCES ${PAYEES_TABLE}(id)`
    );
  }
};

const ensurePhase2DictionaryLabels = () => {
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Recurring Bills'
      WHERE type = 'collection' AND name = ?
    `,
    [RECURRING_TRANSACTIONS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Payee Rules'
      WHERE type = 'collection' AND name = ?
    `,
    [PAYEE_RULES_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Description',
          sort_order = COALESCE(sort_order, 30)
      WHERE type = 'field' AND "table" = ? AND name = 'description'
    `,
    [PAYEES_TABLE]
  );
};

const ensurePhase3Schema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${GOALS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES ${USERS_TABLE}(id),
      name TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK(target_amount > 0),
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      account_id INTEGER REFERENCES ${ACCOUNTS_TABLE}(id),
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${NET_WORTH_SNAPSHOTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_month TEXT NOT NULL UNIQUE,
      assets_total REAL NOT NULL,
      liabilities_total REAL NOT NULL,
      net_worth REAL NOT NULL,
      captured_on TEXT NOT NULL
    )
  `);

  if (!hasColumn(ACCOUNTS_TABLE, "apr")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN apr REAL`);
  }
  if (!hasColumn(ACCOUNTS_TABLE, "minimum_payment")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN minimum_payment REAL`);
  }
  if (!hasColumn(ACCOUNTS_TABLE, "credit_limit")) {
    run(`ALTER TABLE ${ACCOUNTS_TABLE} ADD COLUMN credit_limit REAL`);
  }
};

const ensurePhase4Schema = () => {
  if (!hasColumn(CATEGORIES_TABLE, "tax_deductible")) {
    run(
      `ALTER TABLE ${CATEGORIES_TABLE} ADD COLUMN tax_deductible INTEGER NOT NULL DEFAULT 0`
    );
  }
};

const ensurePhase4DictionaryLabels = () => {
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Tax Deductible'
      WHERE type = 'field' AND "table" = ? AND name = 'tax_deductible'
    `,
    [CATEGORIES_TABLE]
  );
};

const ensureTasksSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${TASK_PROJECTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TASKS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      due_time TEXT,
      estimated_minutes INTEGER,
      completed_at TEXT,
      sort_order INTEGER DEFAULT 0,
      recurrence_rule TEXT
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TASK_SUBTASKS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TASK_TAGS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#64748b'
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${TASK_TAG_LINKS_TABLE} (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id)
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${POMODORO_SESSIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      session_type TEXT NOT NULL DEFAULT 'work',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER,
      completed INTEGER NOT NULL DEFAULT 0
    )
  `);
};

const ensureTasksDictionaryLabels = () => {
  const tasksApp = all(
    `SELECT id, name FROM ${APPLICATIONS_TABLE} WHERE name = 'tasks' LIMIT 1`
  )[0];
  if (!tasksApp) return;

  const taskTables = [
    [TASK_PROJECTS_TABLE, "Projects", 10],
    [TASKS_TABLE, "Tasks", 20],
    [TASK_TAGS_TABLE, "Tags", 30],
  ];

  for (const [tableName, label, sortOrder] of taskTables) {
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET application = ?, application_id = ?, label = ?, sort_order = ?
        WHERE type = 'collection' AND name = ?
      `,
      [tasksApp.name, tasksApp.id, label, sortOrder, tableName]
    );
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET application = ?, application_id = ?
        WHERE type = 'field' AND "table" = ?
      `,
      [tasksApp.name, tasksApp.id, tableName]
    );
  }

  const fieldLabels = {
    [TASK_PROJECTS_TABLE]: {
      user_id: "Owner",
      name: "Name",
      description: "Description",
      color: "Color",
      sort_order: "Sort Order",
      is_archived: "Archived",
    },
    [TASKS_TABLE]: {
      user_id: "Owner",
      project_id: "Project",
      title: "Title",
      description: "Description",
      status: "Status",
      priority: "Priority",
      due_date: "Due Date",
      due_time: "Due Time",
      estimated_minutes: "Estimated Minutes",
      completed_at: "Completed At",
      sort_order: "Sort Order",
      recurrence_rule: "Recurrence",
    },
    [TASK_TAGS_TABLE]: {
      user_id: "Owner",
      name: "Name",
      color: "Color",
    },
  };

  for (const [tableName, labels] of Object.entries(fieldLabels)) {
    for (const [name, label] of Object.entries(labels)) {
      run(
        `
          UPDATE ${SYSTEM_DICTIONARY_TABLE}
          SET label = ?
          WHERE type = 'field' AND "table" = ? AND name = ?
        `,
        [label, tableName, name]
      );
    }
  }
};

const ensureNotesSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${NOTEBOOKS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#0f766e',
      sort_order INTEGER DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${NOTE_SUBJECTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notebook_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#14b8a6',
      sort_order INTEGER DEFAULT 0
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${NOTE_TOPICS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      parent_topic_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS ${NOTES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      notebook_id INTEGER,
      subject_id INTEGER,
      topic_id INTEGER,
      parent_note_id INTEGER,
      task_id INTEGER,
      note_type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      content_html TEXT,
      content_plain TEXT,
      content_mode TEXT NOT NULL DEFAULT 'text',
      content_drawing TEXT,
      show_grid INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);
};

const ensureNotesEditorColumns = () => {
  const notesExists =
    all("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [NOTES_TABLE])
      .length > 0;

  if (!notesExists) {
    return;
  }

  if (!hasColumn(NOTES_TABLE, "content_mode")) {
    run(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN content_mode TEXT NOT NULL DEFAULT 'text'`);
  }
  if (!hasColumn(NOTES_TABLE, "content_drawing")) {
    run(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN content_drawing TEXT`);
  }
  if (!hasColumn(NOTES_TABLE, "show_grid")) {
    run(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN show_grid INTEGER NOT NULL DEFAULT 0`);
  }
};

const ensureNotesDictionaryLabels = () => {
  const notesApp = all(
    `SELECT id, name FROM ${APPLICATIONS_TABLE} WHERE name = 'notes' LIMIT 1`
  )[0];
  if (!notesApp) return;

  const noteTables = [
    [NOTEBOOKS_TABLE, "Notebooks", 10],
    [NOTE_SUBJECTS_TABLE, "Subjects", 20],
    [NOTE_TOPICS_TABLE, "Topics", 30],
    [NOTES_TABLE, "Notes", 40],
  ];

  for (const [tableName, label, sortOrder] of noteTables) {
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET application = ?, application_id = ?, label = ?, sort_order = ?
        WHERE type = 'collection' AND name = ?
      `,
      [notesApp.name, notesApp.id, label, sortOrder, tableName]
    );
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET application = ?, application_id = ?
        WHERE type = 'field' AND "table" = ?
      `,
      [notesApp.name, notesApp.id, tableName]
    );
  }
};

const ensurePhase3DictionaryLabels = () => {
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Savings Goals'
      WHERE type = 'collection' AND name = ?
    `,
    [GOALS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = 'Net Worth History'
      WHERE type = 'collection' AND name = ?
    `,
    [NET_WORTH_SNAPSHOTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?
      WHERE type = 'field' AND "table" = ? AND name = 'apr'
    `,
    [ACCOUNT_FIELD_LABELS.apr, ACCOUNTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?
      WHERE type = 'field' AND "table" = ? AND name = 'minimum_payment'
    `,
    [ACCOUNT_FIELD_LABELS.minimum_payment, ACCOUNTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?
      WHERE type = 'field' AND "table" = ? AND name = 'credit_limit'
    `,
    [ACCOUNT_FIELD_LABELS.credit_limit, ACCOUNTS_TABLE]
  );
  run(
    `
      INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
      ("table", application, application_id, name, label, type, data_type, ref_table, required, sort_order)
      SELECT ?, application, application_id, 'credit_limit', ?, 'field', 'REAL', NULL, 0, 45
      FROM ${SYSTEM_DICTIONARY_TABLE}
      WHERE type = 'collection' AND name = ?
      LIMIT 1
    `,
    [ACCOUNTS_TABLE, ACCOUNT_FIELD_LABELS.credit_limit, ACCOUNTS_TABLE]
  );
  run(
    `
      INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
      ("table", application, application_id, name, label, type, data_type, ref_table, required, sort_order)
      SELECT ?, application, application_id, 'owner_user_id', ?, 'field', 'INTEGER', 'users', 0, 25
      FROM ${SYSTEM_DICTIONARY_TABLE}
      WHERE type = 'collection' AND name = ?
      LIMIT 1
    `,
    [ACCOUNTS_TABLE, ACCOUNT_FIELD_LABELS.owner_user_id, ACCOUNTS_TABLE]
  );
  run(
    `
      INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
      ("table", application, application_id, name, label, type, data_type, ref_table, required, sort_order)
      SELECT ?, application, application_id, 'is_joint', ?, 'field', 'INTEGER', NULL, 0, 26
      FROM ${SYSTEM_DICTIONARY_TABLE}
      WHERE type = 'collection' AND name = ?
      LIMIT 1
    `,
    [ACCOUNTS_TABLE, ACCOUNT_FIELD_LABELS.is_joint, ACCOUNTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?, ref_table = 'users'
      WHERE type = 'field' AND "table" = ? AND name = 'owner_user_id'
    `,
    [ACCOUNT_FIELD_LABELS.owner_user_id, ACCOUNTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?
      WHERE type = 'field' AND "table" = ? AND name = 'is_joint'
    `,
    [ACCOUNT_FIELD_LABELS.is_joint, ACCOUNTS_TABLE]
  );
  run(
    `
      UPDATE ${SYSTEM_DICTIONARY_TABLE}
      SET label = ?, ref_table = 'users'
      WHERE type = 'field' AND "table" = ? AND name = 'user_id'
    `,
    [ACCOUNT_FIELD_LABELS.user_id, ACCOUNTS_TABLE]
  );
};

const seedCategoryFinance = (userId = null) => {
  ensureCategoryFinanceSchema();
  dedupeCategoryFinance();

  for (const name of DEFAULT_CATEGORY_TYPES) {
    const existingType = all(
      `SELECT id FROM ${CATEGORY_TYPES_TABLE} WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [name]
    )[0];
    if (!existingType) {
      run(`INSERT INTO ${CATEGORY_TYPES_TABLE} (name) VALUES (?)`, [name]);
    }
  }

  const typeIds = Object.fromEntries(
    all(`SELECT id, name FROM ${CATEGORY_TYPES_TABLE}`).map((row) => [
      String(row.name).trim().toLowerCase(),
      row.id,
    ])
  );

  for (const [typeName, categoryNames] of Object.entries(DEFAULT_CATEGORIES)) {
    const typeId = typeIds[String(typeName).toLowerCase()];
    if (!typeId) {
      continue;
    }

    for (const categoryName of categoryNames) {
      const existing = all(
        `
          SELECT id
          FROM ${CATEGORIES_TABLE}
          WHERE LOWER(name) = LOWER(?)
            AND type_id = ?
          LIMIT 1
        `,
        [categoryName, typeId]
      );
      if (existing.length === 0) {
        insertAuditedRow(
          CATEGORIES_TABLE,
          { name: categoryName, type_id: typeId },
          userId
        );
      }
    }
  }
};

/**
 * Merge case-variant category types (Income/income) and duplicate category
 * names, remapping transactions and other FK references onto the kept rows.
 */
const dedupeCategoryFinance = () => {
  if (!hasTable(CATEGORY_TYPES_TABLE) || !hasTable(CATEGORIES_TABLE)) {
    return;
  }

  const remappedCategories = new Map(); // loserId -> keeperId

  const remapCategoryReferences = (fromId, toId) => {
    if (fromId === toId) return;
    remappedCategories.set(fromId, toId);

    run(`UPDATE ${TRANSACTIONS_TABLE} SET category_id = ? WHERE category_id = ?`, [toId, fromId]);

    if (hasTable(TRANSACTION_SPLITS_TABLE)) {
      run(
        `UPDATE ${TRANSACTION_SPLITS_TABLE} SET category_id = ? WHERE category_id = ?`,
        [toId, fromId]
      );
    }

    if (hasTable(PAYEES_TABLE) && hasColumn(PAYEES_TABLE, "default_category_id")) {
      run(
        `UPDATE ${PAYEES_TABLE} SET default_category_id = ? WHERE default_category_id = ?`,
        [toId, fromId]
      );
    }

    if (hasTable(PAYEE_RULES_TABLE) && hasColumn(PAYEE_RULES_TABLE, "category_id")) {
      run(
        `UPDATE ${PAYEE_RULES_TABLE} SET category_id = ? WHERE category_id = ?`,
        [toId, fromId]
      );
    }

    if (hasTable(RECURRING_TRANSACTIONS_TABLE) && hasColumn(RECURRING_TRANSACTIONS_TABLE, "category_id")) {
      run(
        `UPDATE ${RECURRING_TRANSACTIONS_TABLE} SET category_id = ? WHERE category_id = ?`,
        [toId, fromId]
      );
    }

    if (hasTable(BUDGETS_TABLE) && hasColumn(BUDGETS_TABLE, "category_id")) {
      // Prefer keeper budget when both exist for the same month.
      const loserBudgets = all(
        `SELECT id, month FROM ${BUDGETS_TABLE} WHERE category_id = ?`,
        [fromId]
      );
      for (const budget of loserBudgets) {
        const keeperBudget = all(
          `SELECT id FROM ${BUDGETS_TABLE} WHERE category_id = ? AND month = ? LIMIT 1`,
          [toId, budget.month]
        )[0];
        if (keeperBudget) {
          run(`DELETE FROM ${BUDGETS_TABLE} WHERE id = ?`, [budget.id]);
        } else {
          run(`UPDATE ${BUDGETS_TABLE} SET category_id = ? WHERE id = ?`, [toId, budget.id]);
        }
      }
    }
  };

  const categoryUsageScore = (categoryId) => {
    const tx = all(
      `SELECT COUNT(*) AS c FROM ${TRANSACTIONS_TABLE} WHERE category_id = ?`,
      [categoryId]
    )[0]?.c;
    const splits = hasTable(TRANSACTION_SPLITS_TABLE)
      ? all(
          `SELECT COUNT(*) AS c FROM ${TRANSACTION_SPLITS_TABLE} WHERE category_id = ?`,
          [categoryId]
        )[0]?.c
      : 0;
    const recurring =
      hasTable(RECURRING_TRANSACTIONS_TABLE) && hasColumn(RECURRING_TRANSACTIONS_TABLE, "category_id")
        ? all(
            `SELECT COUNT(*) AS c FROM ${RECURRING_TRANSACTIONS_TABLE} WHERE category_id = ?`,
            [categoryId]
          )[0]?.c
        : 0;
    const payees =
      hasTable(PAYEES_TABLE) && hasColumn(PAYEES_TABLE, "default_category_id")
        ? all(
            `SELECT COUNT(*) AS c FROM ${PAYEES_TABLE} WHERE default_category_id = ?`,
            [categoryId]
          )[0]?.c
        : 0;
    return Number(tx || 0) + Number(splits || 0) + Number(recurring || 0) + Number(payees || 0);
  };

  // 1) Merge case-variant category types (Income vs income).
  const typeGroups = new Map();
  for (const row of all(`SELECT id, name FROM ${CATEGORY_TYPES_TABLE}`)) {
    const key = String(row.name || "").trim().toLowerCase();
    if (!key) continue;
    if (!typeGroups.has(key)) typeGroups.set(key, []);
    typeGroups.get(key).push(row);
  }

  for (const [, group] of typeGroups) {
    if (group.length < 2) continue;

    const scored = group
      .map((type) => {
        const cats = all(`SELECT id FROM ${CATEGORIES_TABLE} WHERE type_id = ?`, [type.id]);
        const usage = cats.reduce((sum, cat) => sum + categoryUsageScore(cat.id), 0);
        const isCanonicalDefault = DEFAULT_CATEGORY_TYPES.includes(
          String(type.name || "").trim().toLowerCase()
        );
        const isTitleCase = /^[A-Z]/.test(String(type.name || ""));
        return {
          type,
          usage,
          catCount: cats.length,
          // Prefer title-case Income/Expense that already holds live data.
          rank: usage * 1000 + catCount * 10 + (isTitleCase ? 2 : 0) + (isCanonicalDefault ? 1 : 0),
        };
      })
      .sort((a, b) => b.rank - a.rank || a.type.id - b.type.id);

    const keeper = scored[0].type;
    for (const loser of scored.slice(1)) {
      run(`UPDATE ${CATEGORIES_TABLE} SET type_id = ? WHERE type_id = ?`, [
        keeper.id,
        loser.type.id,
      ]);
      run(`DELETE FROM ${CATEGORY_TYPES_TABLE} WHERE id = ?`, [loser.type.id]);
    }
  }

  // 2) Merge duplicate category names (case-insensitive), preferring the busiest row.
  const byNameOnly = new Map();
  for (const row of all(`SELECT id, name, type_id FROM ${CATEGORIES_TABLE}`)) {
    const key = String(row.name || "").trim().toLowerCase();
    if (!byNameOnly.has(key)) byNameOnly.set(key, []);
    byNameOnly.get(key).push(row);
  }

  for (const [, group] of byNameOnly) {
    if (group.length < 2) continue;

    const scored = group
      .map((cat) => ({
        cat,
        usage: categoryUsageScore(cat.id),
      }))
      .sort((a, b) => b.usage - a.usage || a.cat.id - b.cat.id);

    const keeper = scored[0].cat;
    for (const loser of scored.slice(1)) {
      remapCategoryReferences(loser.cat.id, keeper.id);
      run(`DELETE FROM ${CATEGORIES_TABLE} WHERE id = ?`, [loser.cat.id]);
    }
  }

  if (remappedCategories.size > 0) {
    writeSystemLog({
      level: "info",
      source: "server",
      message: `Deduped ${remappedCategories.size} duplicate categor${
        remappedCategories.size === 1 ? "y" : "ies"
      }.`,
      function_name: "dedupeCategoryFinance",
      data: {
        remapped: Object.fromEntries(remappedCategories.entries()),
      },
    });
  }
};

const ensureSystemDeletesSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${SYSTEM_DELETES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_table TEXT NOT NULL,
      record_id INTEGER,
      record_data TEXT NOT NULL
    )
  `);
};

const ensureSystemLogsSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${SYSTEM_LOGS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL DEFAULT 'error',
      source TEXT NOT NULL DEFAULT 'server',
      message TEXT NOT NULL,
      stack TEXT,
      function_name TEXT,
      url TEXT,
      method TEXT,
      status_code INTEGER,
      user_id INTEGER,
      username TEXT,
      user_agent TEXT,
      ip_address TEXT,
      data TEXT
    )
  `);
};

const ensureNavigationSchema = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${SYSTEM_NAVIGATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      icon TEXT,
      is_main INTEGER NOT NULL DEFAULT 0,
      parent_id INTEGER REFERENCES ${SYSTEM_NAVIGATION_TABLE}(id),
      application TEXT,
      nav_section TEXT NOT NULL DEFAULT 'apps' CHECK(nav_section IN ('apps', 'admin')),
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  run(`
    CREATE UNIQUE INDEX IF NOT EXISTS system_navigation_path_key
    ON ${SYSTEM_NAVIGATION_TABLE}(path)
  `);
};

const upsertNavigationItem = (item, userId = null) => {
  const existing = all(`SELECT id FROM ${SYSTEM_NAVIGATION_TABLE} WHERE path = ? LIMIT 1`, [
    item.path,
  ])[0];

  const payload = {
    label: item.label,
    path: item.path,
    icon: item.icon ?? null,
    is_main: item.is_main ? 1 : 0,
    parent_id: item.parent_id ?? null,
    application: item.application ?? null,
    nav_section: item.nav_section ?? "apps",
    sort_order: Number(item.sort_order) || 0,
  };

  if (existing) {
    updateAuditedRow(
      SYSTEM_NAVIGATION_TABLE,
      payload,
      "id = ?",
      [existing.id],
      userId
    );
    return existing.id;
  }

  return insertAuditedRow(SYSTEM_NAVIGATION_TABLE, payload, userId).lastID;
};

const seedNavigation = (userId = null) => {
  ensureNavigationSchema();

  const adminMainId = upsertNavigationItem(
    {
      label: "Administration",
      path: "/admin",
      icon: "applications",
      is_main: 1,
      parent_id: null,
      application: null,
      nav_section: "admin",
      sort_order: 0,
    },
    userId
  );

  for (const item of DEFAULT_ADMIN_NAV_ITEMS) {
    upsertNavigationItem(
      {
        ...item,
        is_main: 0,
        parent_id: adminMainId,
        application: null,
        nav_section: "admin",
      },
      userId
    );
  }

  const applications = all(
    `SELECT id, name, title FROM ${APPLICATIONS_TABLE} ORDER BY title, name`
  );

  for (const [appIndex, application] of applications.entries()) {
    const appMainId = upsertNavigationItem(
      {
        label: application.title,
        path: `/app/${application.name}`,
        icon: "app",
        is_main: 1,
        parent_id: null,
        application: application.name,
        nav_section: "apps",
        sort_order: (appIndex + 1) * 100,
      },
      userId
    );

    const collections = all(
      `
        SELECT d.name AS name, MIN(d.label) AS label, MIN(d.sort_order) AS sort_order
        FROM ${SYSTEM_DICTIONARY_TABLE} d
        JOIN ${APPLICATIONS_TABLE} a ON a.id = d.application_id
        WHERE d.type = 'collection'
          AND a.name = ?
          AND d.name IS NOT NULL
          AND TRIM(d.name) != ''
        GROUP BY d.name
        ORDER BY MIN(d.sort_order), MIN(d.label), d.name
      `,
      [application.name]
    );

    if (application.name === "budget") {
      upsertNavigationItem(
        {
          label: "Report Center",
          path: `/app/${application.name}/reports`,
          icon: "reports",
          is_main: 0,
          parent_id: appMainId,
          application: application.name,
          nav_section: "apps",
          sort_order: (appIndex + 1) * 100,
        },
        userId
      );
    }

    if (application.name === "tasks") {
      const taskNavItems = [
        { label: "Today", path: `/app/tasks/list/today`, icon: "tasks", sort_order: 1 },
        { label: "Board", path: `/app/tasks/board`, icon: "board", sort_order: 2 },
        { label: "All Tasks", path: `/app/tasks/list/all`, icon: "tasks", sort_order: 3 },
        { label: "Focus Timer", path: `/app/tasks/focus`, icon: "focus", sort_order: 4 },
        { label: "Projects", path: `/app/tasks/projects`, icon: "tables", sort_order: 5 },
      ];

      for (const item of taskNavItems) {
        upsertNavigationItem(
          {
            ...item,
            is_main: 0,
            parent_id: appMainId,
            application: application.name,
            nav_section: "apps",
            sort_order: (appIndex + 1) * 100 + item.sort_order,
          },
          userId
        );
      }
    }

    if (application.name === "notes") {
      const noteNavItems = [
        { label: "Workspace", path: `/app/notes/browse`, icon: "notes", sort_order: 1 },
        { label: "Recent Notes", path: `/app/notes/recent`, icon: "notes", sort_order: 2 },
      ];

      for (const item of noteNavItems) {
        upsertNavigationItem(
          {
            ...item,
            is_main: 0,
            parent_id: appMainId,
            application: application.name,
            nav_section: "apps",
            sort_order: (appIndex + 1) * 100 + item.sort_order,
          },
          userId
        );
      }
    }

    for (const [tableIndex, collection] of collections.entries()) {
      if (application.name === "tasks" || application.name === "notes") {
        continue;
      }

      if (HIDDEN_NAV_TABLES.has(collection.name) || SYSTEM_TABLES.has(collection.name)) {
        continue;
      }

      upsertNavigationItem(
        {
          label: collection.label || formatLabel(collection.name),
          path: `/app/${application.name}/${collection.name}`,
          icon: "tables",
          is_main: 0,
          parent_id: appMainId,
          application: application.name,
          nav_section: "apps",
          sort_order: (appIndex + 1) * 100 + tableIndex + 1,
        },
        userId
      );
    }
  }

  return { ok: true };
};

const ensureTransactionDictionaryLabels = () => {
  for (const [name, label] of Object.entries(TRANSACTION_FIELD_LABELS)) {
    run(
      `
        UPDATE ${SYSTEM_DICTIONARY_TABLE}
        SET label = ?
        WHERE "table" = ? AND name = ? AND type = 'field'
      `,
      [label, TRANSACTIONS_TABLE, name]
    );
  }
};

const DASHBOARD_WIDGET_KINDS = new Set([
  "stat",
  "table",
  "bars",
  "bar",
  "line",
  "area",
  "pie",
  "donut",
  "scatter",
]);

const normalizeChartConfig = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("chart_config must be a JSON object.");
  }
  return JSON.stringify(parsed);
};

const listUserDashboards = (userId, application) => {
  const dashboards = all(
    `
      SELECT id, application, user_id, name, is_default, sort_order
      FROM ${DASHBOARDS_TABLE}
      WHERE user_id = ? AND application = ?
      ORDER BY sort_order, id
    `,
    [userId, application]
  );
  if (dashboards.length === 0) {
    return [];
  }
  const ids = dashboards.map((dashboard) => dashboard.id);
  const placeholders = ids.map(() => "?").join(", ");
  const items = all(
    `
      SELECT id, dashboard_id, report_key, span, sort_order
      FROM ${DASHBOARD_LAYOUT_ITEMS_TABLE}
      WHERE dashboard_id IN (${placeholders})
      ORDER BY sort_order, id
    `,
    ids
  );
  const itemsByDashboard = new Map();
  for (const item of items) {
    const list = itemsByDashboard.get(item.dashboard_id) ?? [];
    list.push({ key: item.report_key, span: Number(item.span) || 1 });
    itemsByDashboard.set(item.dashboard_id, list);
  }
  return dashboards.map((dashboard) => ({
    ...dashboard,
    items: itemsByDashboard.get(dashboard.id) ?? [],
  }));
};

const getUserDashboard = (dashboardId, userId) =>
  all(
    `SELECT * FROM ${DASHBOARDS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
    [dashboardId, userId]
  )[0] ?? null;

const replaceDashboardLayoutItems = (dashboardId, items) => {
  run(`DELETE FROM ${DASHBOARD_LAYOUT_ITEMS_TABLE} WHERE dashboard_id = ?`, [dashboardId]);
  items.forEach((item, index) => {
    const key = String(item.key ?? item.report_key ?? "").trim();
    if (!key) return;
    const rawSpan = Number(item.span);
    const span = Number.isFinite(rawSpan) ? Math.min(Math.max(Math.round(rawSpan), 1), 3) : 1;
    run(
      `
        INSERT INTO ${DASHBOARD_LAYOUT_ITEMS_TABLE} (dashboard_id, report_key, span, sort_order)
        VALUES (?, ?, ?, ?)
      `,
      [dashboardId, key, span, index]
    );
  });
};

const assertSelectSql = (sql) => {
  if (!sql || typeof sql !== "string") {
    throw new Error("sql is required.");
  }
  if (sql.includes(";")) {
    throw new Error("Only one SQL statement is allowed.");
  }
  const statementType = getStatementType(sql);
  if (!["SELECT", "WITH"].includes(statementType)) {
    throw new Error("Only SELECT queries are allowed for dashboard reports.");
  }
};

/** Preferred display column for each referenced table (mirrors client heuristics). */
const DEFAULT_REF_LABEL_FIELDS = {
  users: "display_name",
  account_types: "name",
  category_types: "name",
  categories: "name",
  accounts: "name",
  payees: "name",
  applications: "title",
  task_projects: "name",
  task_tags: "name",
  notebooks: "name",
  note_subjects: "name",
  note_topics: "name",
  tasks: "title",
  notes: "title",
  transactions: "description",
  recurring_transactions: "description",
};

const DEFAULT_LABEL_FIELD_CANDIDATES = [
  "name",
  "title",
  "username",
  "display_name",
  "description",
  "email",
  "month",
  "type",
];

const resolveDefaultRefLabelField = (refTable) => {
  if (!refTable || !isValidIdentifier(refTable)) {
    return null;
  }

  const preferred = DEFAULT_REF_LABEL_FIELDS[refTable];
  if (preferred && hasColumn(refTable, preferred)) {
    return preferred;
  }

  for (const candidate of DEFAULT_LABEL_FIELD_CANDIDATES) {
    if (hasColumn(refTable, candidate)) {
      return candidate;
    }
  }

  const pkColumn =
    all(`PRAGMA table_info(${quoteIdentifier(refTable)})`).find(
      (column) => Number(column.pk) === 1
    )?.name ?? "id";
  return pkColumn;
};

const ensureRefLabelFields = () => {
  if (!hasColumn(SYSTEM_DICTIONARY_TABLE, "ref_label_field")) {
    return;
  }

  const fields = all(
    `
      SELECT id, ref_table, ref_label_field
      FROM ${SYSTEM_DICTIONARY_TABLE}
      WHERE type = 'field'
        AND ref_table IS NOT NULL
        AND TRIM(ref_table) != ''
        AND (ref_label_field IS NULL OR TRIM(ref_label_field) = '')
    `
  );

  for (const field of fields) {
    const labelField = resolveDefaultRefLabelField(field.ref_table);
    if (!labelField) continue;
    run(`UPDATE ${SYSTEM_DICTIONARY_TABLE} SET ref_label_field = ? WHERE id = ?`, [
      labelField,
      field.id,
    ]);
  }
};

const ensureSystemDictionary = () => {
  run(`
    CREATE TABLE IF NOT EXISTS ${SYSTEM_DICTIONARY_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "table" TEXT,
      application TEXT,
      application_id INTEGER,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('collection', 'field')),
      data_type TEXT,
      ref_table TEXT,
      ref_label_field TEXT,
      required INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      UNIQUE("table", name, type)
    )
  `);

  if (!hasColumn(SYSTEM_DICTIONARY_TABLE, "application")) {
    run(`ALTER TABLE ${SYSTEM_DICTIONARY_TABLE} ADD COLUMN application TEXT`);
  }
  if (!hasColumn(SYSTEM_DICTIONARY_TABLE, "application_id")) {
    run(`ALTER TABLE ${SYSTEM_DICTIONARY_TABLE} ADD COLUMN application_id INTEGER`);
  }
  if (!hasColumn(SYSTEM_DICTIONARY_TABLE, "ref_label_field")) {
    run(`ALTER TABLE ${SYSTEM_DICTIONARY_TABLE} ADD COLUMN ref_label_field TEXT`);
  }

  const defaultApp = all(
    `SELECT id, name FROM ${APPLICATIONS_TABLE} WHERE name = 'budget' LIMIT 1`
  )[0];
  const defaultApplicationId = defaultApp?.id ?? null;
  const defaultApplicationName = defaultApp?.name ?? "budget";

  const rows = all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const tableNames = rows.map((row) => row.name);

  run(`
    DELETE FROM ${SYSTEM_DICTIONARY_TABLE}
    WHERE (
      type = 'collection'
      AND name NOT IN (${tableNames.map(() => "?").join(", ")})
    )
    OR (
      type = 'field'
      AND "table" NOT IN (${tableNames.map(() => "?").join(", ")})
    )
  `, [...tableNames, ...tableNames]);

  run(`
    UPDATE ${SYSTEM_DICTIONARY_TABLE}
    SET "table" = ''
    WHERE type = 'collection' AND ("table" IS NULL OR "table" = '')
  `);

  run(`
    UPDATE ${SYSTEM_DICTIONARY_TABLE}
    SET application = ?
    WHERE application IS NULL OR TRIM(application) = ''
  `, [defaultApplicationName]);

  run(`
    UPDATE ${SYSTEM_DICTIONARY_TABLE}
    SET application_id = ?
    WHERE application_id IS NULL
  `, [defaultApplicationId]);

  run(`
    UPDATE ${SYSTEM_DICTIONARY_TABLE}
    SET application = (
      SELECT c.application
      FROM ${SYSTEM_DICTIONARY_TABLE} c
      WHERE c.type = 'collection'
        AND c.name = ${SYSTEM_DICTIONARY_TABLE}."table"
      LIMIT 1
    )
    WHERE type = 'field'
      AND ("application" IS NULL OR TRIM(application) = '')
  `);

  run(`
    UPDATE ${SYSTEM_DICTIONARY_TABLE}
    SET application_id = (
      SELECT c.application_id
      FROM ${SYSTEM_DICTIONARY_TABLE} c
      WHERE c.type = 'collection'
        AND c.name = ${SYSTEM_DICTIONARY_TABLE}."table"
      LIMIT 1
    )
    WHERE type = 'field'
      AND application_id IS NULL
  `);

  for (const tableName of tableNames) {
    // Skip system tables — they are managed outside the app dictionary
    if (SYSTEM_TABLES.has(tableName)) continue;

    run(
      `
        INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
        ("table", application, application_id, name, label, type, data_type, ref_table, required, sort_order)
        VALUES ('', ?, ?, ?, ?, 'collection', NULL, NULL, 0, 0)
      `,
      [defaultApplicationName, defaultApplicationId, tableName, formatLabel(tableName)]
    );

    const columns = all(`PRAGMA table_info(${tableName})`);
    const foreignKeys = all(`PRAGMA foreign_key_list(${tableName})`);
    const foreignKeyMap = Object.fromEntries(
      foreignKeys.map((foreignKey) => [foreignKey.from, foreignKey.table])
    );

    for (const column of columns) {
      const refTable =
        foreignKeyMap[column.name] ??
        (["created_by", "updated_by", "user_id", "owner_user_id"].includes(column.name)
          ? "users"
          : null);
      const refLabelField = refTable ? resolveDefaultRefLabelField(refTable) : null;

      run(
        `
          INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
          ("table", application, application_id, name, label, type, data_type, ref_table, ref_label_field, required, sort_order)
          VALUES (?, ?, ?, ?, ?, 'field', ?, ?, ?, ?, ?)
        `,
        [
          tableName,
          defaultApplicationName,
          defaultApplicationId,
          column.name,
          formatLabel(column.name),
          column.type || null,
          refTable,
          refLabelField,
          Number(column.notnull) === 1 ? 1 : 0,
          Number(column.cid) + 1,
        ]
      );
    }
  }

  run(`
    DELETE FROM ${SYSTEM_DICTIONARY_TABLE}
    WHERE id IN (
      SELECT a.id
      FROM ${SYSTEM_DICTIONARY_TABLE} a
      JOIN ${SYSTEM_DICTIONARY_TABLE} b
        ON COALESCE(a."table", '') = COALESCE(b."table", '')
       AND a.name = b.name
       AND a.type = b.type
       AND a.id > b.id
    )
  `);

  run(`
    CREATE UNIQUE INDEX IF NOT EXISTS system_dictionary_unique_key
    ON ${SYSTEM_DICTIONARY_TABLE}(COALESCE("table", ''), name, type)
  `);

  ensureRefLabelFields();
};

ensureApplications();
ensureUsers();
ensureUserRoles();
ensureAccountsSchema();
ensureDashboardSchema();
ensureTransactionsSchema();
ensureLiabilityPositiveOwedSemantics();
ensureCategoryFinanceSchema();
ensurePhase2Schema();
ensurePhase3Schema();
ensurePhase4Schema();
ensureTasksSchema();
ensureNotesSchema();
ensureNotesEditorColumns();
ensureSystemDeletesSchema();
ensureSystemLogsSchema();
ensureNavigationSchema();
ensureAuditColumns();
run(`
  CREATE INDEX IF NOT EXISTS system_logs_created_on_idx
  ON ${SYSTEM_LOGS_TABLE}(created_on DESC, id DESC)
`);
ensureSystemDictionary();
ensurePhase2DictionaryLabels();
ensurePhase3DictionaryLabels();
ensurePhase4DictionaryLabels();
ensureTasksDictionaryLabels();
ensureNotesDictionaryLabels();
ensureAuditDictionaryLabels();
ensureAccountDictionaryLabels();
ensureTransactionDictionaryLabels();

const getDictionaryCounts = () => {
  const rows = all(
    `
      SELECT type, COUNT(*) AS count
      FROM ${SYSTEM_DICTIONARY_TABLE}
      GROUP BY type
    `
  );
  const counts = { collection: 0, field: 0 };
  for (const row of rows) {
    counts[row.type] = Number(row.count);
  }
  return counts;
};

const getTables = () => {
  const rows = all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return rows.map((row) => row.name);
};

const assertValidTable = (table) => {
  if (!isValidIdentifier(table)) {
    throw new Error("Invalid table name.");
  }

  const tables = getTables();
  if (!tables.includes(table)) {
    throw new Error(`Unknown table: ${table}`);
  }
};

const getStatementType = (sql) => {
  const match = sql.trim().match(/^([a-zA-Z]+)/);
  return match ? match[1].toUpperCase() : "";
};

const getPrimaryKeyColumn = (table) => {
  const columns = all(`PRAGMA table_info(${quoteIdentifier(table)})`);
  return columns.find((column) => Number(column.pk) === 1)?.name ?? "id";
};

const archiveAndDeleteRowsInternal = (table, where, whereParams, userId) => {
  if (!where) {
    throw new Error("where is required for delete.");
  }

  const safeTable = quoteIdentifier(table);

  if (DELETE_ARCHIVE_EXCLUDED.has(table)) {
    return run(`DELETE FROM ${safeTable} WHERE ${where}`, whereParams);
  }

  const rows = all(`SELECT * FROM ${safeTable} WHERE ${where}`, whereParams);
  if (rows.length === 0) {
    return { changes: 0, archived: 0 };
  }

  const pkColumn = getPrimaryKeyColumn(table);

  for (const row of rows) {
    insertAuditedRow(
      SYSTEM_DELETES_TABLE,
      {
        source_table: table,
        record_id: row[pkColumn] ?? null,
        record_data: JSON.stringify(row),
      },
      userId
    );
  }

  const result = run(`DELETE FROM ${safeTable} WHERE ${where}`, whereParams);
  return { ...result, archived: rows.length };
};

/** Include transfer partners so linked_transaction_id FKs do not block deletes. */
const expandLinkedTransactionIds = (ids) => {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = all(
    `
      SELECT DISTINCT t.id
      FROM ${TRANSACTIONS_TABLE} t
      WHERE t.id IN (${placeholders})
         OR t.linked_transaction_id IN (${placeholders})
         OR t.id IN (
           SELECT linked_transaction_id
           FROM ${TRANSACTIONS_TABLE}
           WHERE id IN (${placeholders})
             AND linked_transaction_id IS NOT NULL
         )
    `,
    [...uniqueIds, ...uniqueIds, ...uniqueIds]
  );

  return rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
};

/** Remove/null child rows that would block deleting parent records. */
const prepareDeleteDependents = (table, ids, userId = null) => {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  if (uniqueIds.length === 0) {
    return [];
  }

  if (table === TRANSACTIONS_TABLE) {
    const allTransactionIds = expandLinkedTransactionIds(uniqueIds);
    const txPlaceholders = allTransactionIds.map(() => "?").join(", ");

    // Break self-FK links before deleting either side of a transfer pair.
    run(
      `
        UPDATE ${TRANSACTIONS_TABLE}
        SET linked_transaction_id = NULL
        WHERE id IN (${txPlaceholders})
           OR linked_transaction_id IN (${txPlaceholders})
      `,
      [...allTransactionIds, ...allTransactionIds]
    );

    run(
      `DELETE FROM ${TRANSACTION_SPLITS_TABLE} WHERE transaction_id IN (${txPlaceholders})`,
      allTransactionIds
    );

    for (const transactionId of allTransactionIds) {
      deleteTransactionAttachments(transactionId);
    }

    return allTransactionIds;
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");

  if (table === ACCOUNTS_TABLE) {
    // Transfers store the counterpart on the other account via linked_transaction_id
    // (there is no source_account_id column). prepareDeleteDependents expands pairs.
    const seedTransactionIds = all(
      `
        SELECT id
        FROM ${TRANSACTIONS_TABLE}
        WHERE account_id IN (${placeholders})
      `,
      uniqueIds
    ).map((row) => Number(row.id));

    const transactionIds = prepareDeleteDependents(
      TRANSACTIONS_TABLE,
      seedTransactionIds,
      userId
    );

    if (transactionIds.length > 0) {
      const txPlaceholders = transactionIds.map(() => "?").join(", ");
      archiveAndDeleteRowsInternal(
        TRANSACTIONS_TABLE,
        `id IN (${txPlaceholders})`,
        transactionIds,
        userId
      );
    }

    const recurringIds = all(
      `SELECT id FROM ${RECURRING_TRANSACTIONS_TABLE} WHERE account_id IN (${placeholders})`,
      uniqueIds
    ).map((row) => Number(row.id));

    if (recurringIds.length > 0) {
      const recurringPlaceholders = recurringIds.map(() => "?").join(", ");
      archiveAndDeleteRowsInternal(
        RECURRING_TRANSACTIONS_TABLE,
        `id IN (${recurringPlaceholders})`,
        recurringIds,
        userId
      );
    }

    run(
      `UPDATE ${PAYEE_RULES_TABLE} SET account_id = NULL WHERE account_id IN (${placeholders})`,
      uniqueIds
    );
    run(
      `UPDATE ${GOALS_TABLE} SET account_id = NULL WHERE account_id IN (${placeholders})`,
      uniqueIds
    );

    run(
      `DELETE FROM ${ACCOUNT_JOINT_USERS_TABLE} WHERE account_id IN (${placeholders})`,
      uniqueIds
    );

    for (const accountId of uniqueIds) {
      const imageRow = all(
        `SELECT image_path FROM ${ACCOUNTS_TABLE} WHERE id = ? LIMIT 1`,
        [accountId]
      )[0];
      if (imageRow?.image_path) {
        try {
          deleteAccountImageFile(imageRow.image_path);
        } catch {
          // Ignore missing image files.
        }
      }
    }

    return uniqueIds;
  }

  // Generic FK cleanup for other tables.
  for (const childTable of getTables()) {
    if (childTable === table) continue;
    let foreignKeys = [];
    try {
      foreignKeys = all(`PRAGMA foreign_key_list(${quoteIdentifier(childTable)})`);
    } catch {
      continue;
    }

    for (const foreignKey of foreignKeys) {
      if (foreignKey.table !== table) continue;

      const childColumn = foreignKey.from;
      const columns = all(`PRAGMA table_info(${quoteIdentifier(childTable)})`);
      const columnInfo = columns.find((column) => column.name === childColumn);
      const nullable = columnInfo ? Number(columnInfo.notnull) === 0 : false;

      if (nullable) {
        run(
          `UPDATE ${quoteIdentifier(childTable)} SET ${quoteIdentifier(childColumn)} = NULL WHERE ${quoteIdentifier(childColumn)} IN (${placeholders})`,
          uniqueIds
        );
      } else if (childTable === TRANSACTION_SPLITS_TABLE || childTable === TRANSACTION_ATTACHMENTS_TABLE) {
        run(
          `DELETE FROM ${quoteIdentifier(childTable)} WHERE ${quoteIdentifier(childColumn)} IN (${placeholders})`,
          uniqueIds
        );
      } else {
        const childIds = all(
          `SELECT ${quoteIdentifier(getPrimaryKeyColumn(childTable))} AS id FROM ${quoteIdentifier(childTable)} WHERE ${quoteIdentifier(childColumn)} IN (${placeholders})`,
          uniqueIds
        ).map((row) => Number(row.id));
        if (childIds.length > 0) {
          const expandedChildIds = prepareDeleteDependents(childTable, childIds, userId);
          const idsToDelete = expandedChildIds.length > 0 ? expandedChildIds : childIds;
          const childPlaceholders = idsToDelete.map(() => "?").join(", ");
          archiveAndDeleteRowsInternal(
            childTable,
            `${quoteIdentifier(getPrimaryKeyColumn(childTable))} IN (${childPlaceholders})`,
            idsToDelete,
            userId
          );
        }
      }
    }
  }

  return uniqueIds;
};

const archiveAndDeleteRows = (table, where, whereParams, userId) =>
  runInTransaction(() => {
    const safeTable = quoteIdentifier(table);
    const rows = all(`SELECT * FROM ${safeTable} WHERE ${where}`, whereParams);
    const pkColumn = getPrimaryKeyColumn(table);
    const ids = rows.map((row) => row[pkColumn]).filter((id) => id !== null && id !== undefined);

    if (table === TRANSACTIONS_TABLE) {
      const transactionIds = prepareDeleteDependents(table, ids, userId);
      if (transactionIds.length === 0) {
        return { changes: 0, archived: 0 };
      }
      const placeholders = transactionIds.map(() => "?").join(", ");
      return archiveAndDeleteRowsInternal(
        table,
        `id IN (${placeholders})`,
        transactionIds,
        userId
      );
    }

    prepareDeleteDependents(table, ids, userId);
    return archiveAndDeleteRowsInternal(table, where, whereParams, userId);
  });

const CLEAR_TABLE_BLOCKED = new Set([
  USERS_TABLE,
  USER_ROLES_TABLE,
  APPLICATIONS_TABLE,
  SYSTEM_DELETES_TABLE,
  SYSTEM_NAVIGATION_TABLE,
  SYSTEM_LOGS_TABLE,
  SYSTEM_DICTIONARY_TABLE,
  USER_PREFERENCES_TABLE,
]);

const clearTableRecords = (table, userId = null) => {
  assertValidTable(table);
  if (CLEAR_TABLE_BLOCKED.has(table)) {
    throw new Error(`Clearing all rows from ${table} is not allowed.`);
  }

  return runInTransaction(() => {
    const pkColumn = getPrimaryKeyColumn(table);
    const ids = all(`SELECT ${quoteIdentifier(pkColumn)} AS id FROM ${quoteIdentifier(table)}`).map(
      (row) => row.id
    );
    if (ids.length === 0) {
      return { changes: 0, archived: 0, cleared: 0 };
    }

    if (table === TRANSACTIONS_TABLE) {
      const transactionIds = prepareDeleteDependents(table, ids, userId);
      if (transactionIds.length === 0) {
        return { changes: 0, archived: 0, cleared: 0 };
      }
      const placeholders = transactionIds.map(() => "?").join(", ");
      const result = archiveAndDeleteRowsInternal(
        table,
        `id IN (${placeholders})`,
        transactionIds,
        userId
      );
      return { ...result, cleared: transactionIds.length };
    }

    prepareDeleteDependents(table, ids, userId);
    const result = archiveAndDeleteRowsInternal(table, "1 = 1", [], userId);
    return { ...result, cleared: ids.length };
  });
};

const restoreArchivedRecord = (archiveId, userId) =>
  runInTransaction(() => {
    const archive = all(`SELECT * FROM ${SYSTEM_DELETES_TABLE} WHERE id = ? LIMIT 1`, [
      archiveId,
    ])[0];

    if (!archive) {
      throw new Error("Deleted record not found.");
    }

    const table = archive.source_table;
    assertValidTable(table);

    if (table === SYSTEM_DELETES_TABLE) {
      throw new Error("Cannot restore archive entries into the archive table.");
    }

    let data;
    try {
      data = JSON.parse(archive.record_data);
    } catch {
      throw new Error("Archived record data is invalid.");
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Archived record data is invalid.");
    }

    const pkColumn = getPrimaryKeyColumn(table);
    const recordId = data[pkColumn];

    if (recordId !== null && recordId !== undefined && recordId !== "") {
      const existing = all(
        `SELECT 1 AS found FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(pkColumn)} = ? LIMIT 1`,
        [recordId]
      );
      if (existing.length > 0) {
        throw new Error(
          `A record with ${pkColumn} = ${recordId} already exists in ${table}.`
        );
      }
    }

    insertAuditedRow(table, data, userId);
    run(`DELETE FROM ${SYSTEM_DELETES_TABLE} WHERE id = ?`, [archiveId]);

    if (table === TRANSACTIONS_TABLE && data.account_id) {
      refreshAccountBalances([data.account_id], userId);
    }

    return {
      ok: true,
      table,
      record_id: recordId ?? null,
      archive_id: archiveId,
    };
  });

const isSessionAdmin = (user) =>
  user?.roles?.some((role) => role.application === "system" && role.role === "admin") ??
  false;

const userCanAccessApp = (user, appName) => {
  if (!user || !appName) {
    return false;
  }
  if (isSessionAdmin(user)) {
    return true;
  }
  const expectedRole = APP_USER_ROLES[appName];
  if (!expectedRole) {
    return false;
  }
  return (
    user.roles?.some(
      (role) =>
        role.application === appName &&
        (role.role === expectedRole || role.role === "member")
    ) ?? false
  );
};

const getTableApplication = (tableName) => {
  const row = all(
    `
      SELECT application
      FROM ${SYSTEM_DICTIONARY_TABLE}
      WHERE type = 'collection' AND name = ?
      LIMIT 1
    `,
    [tableName]
  )[0];
  return row?.application ?? null;
};

const assertUserCanAccessTable = (user, tableName, { forWrite = false } = {}) => {
  if (!user) {
    throw new Error("Unauthorized.");
  }
  if (isSessionAdmin(user)) {
    return;
  }

  if (SHARED_LOOKUP_TABLES.has(tableName)) {
    if (forWrite) {
      throw new Error("Admin access required.");
    }
    return;
  }

  if (
    SYSTEM_TABLES.has(tableName) ||
    tableName === USER_ROLES_TABLE ||
    tableName === USERS_TABLE ||
    tableName.startsWith("system_")
  ) {
    throw new Error("Admin access required.");
  }

  const application = getTableApplication(tableName);
  if (!application || !APP_USER_ROLES[application]) {
    throw new Error(`You do not have access to ${tableName}.`);
  }
  if (!userCanAccessApp(user, application)) {
    throw new Error(`You do not have access to the ${application} app.`);
  }
};

const getTablesForUser = (user) => {
  const tables = getTables();
  if (isSessionAdmin(user)) {
    return tables;
  }
  return tables.filter((tableName) => {
    try {
      assertUserCanAccessTable(user, tableName, { forWrite: false });
      return true;
    } catch {
      return false;
    }
  });
};

const getNavigationForUser = (user) => {
  const items = all(
    `
      SELECT id, label, path, icon, is_main, parent_id, application, nav_section, sort_order
      FROM ${SYSTEM_NAVIGATION_TABLE}
      ORDER BY sort_order, id
    `
  );

  return items.filter((item) => {
    if (item.nav_section === "admin") {
      return isSessionAdmin(user);
    }

    if (item.nav_section === "apps") {
      return item.application && userCanAccessApp(user, item.application);
    }

    return false;
  });
};

const requireAdmin = (req, res) => {
  const user = getSessionUser(req);
  if (!isSessionAdmin(user)) {
    sendApiError(res, req, 403, "Admin access required.", {
      function_name: "requireAdmin",
      user,
    });
    return null;
  }
  return user;
};

const queryDb = ({ sql, params = [], table }) => {
  if (!sql || typeof sql !== "string") {
    throw new Error("sql is required.");
  }

  if (sql.includes(";")) {
    throw new Error("Only one SQL statement is allowed per request.");
  }

  if (table) {
    assertValidTable(table);
  }

  const statementType = getStatementType(sql);
  const readStatements = new Set(["SELECT", "WITH", "PRAGMA"]);

  if (!readStatements.has(statementType)) {
    throw new Error("Only read-only SQL (SELECT, WITH, PRAGMA) is allowed.");
  }

  return { rows: all(sql, params) };
};

const ELEVATED_IDE_STATEMENTS = new Set([
  "SELECT",
  "WITH",
  "PRAGMA",
  "INSERT",
  "UPDATE",
  "DELETE",
]);

const executeElevatedIdeSql = ({ sql, params = [] }, user = null) => {
  if (!sql || typeof sql !== "string") {
    throw new Error("sql is required.");
  }

  if (sql.includes(";")) {
    throw new Error("Only one SQL statement is allowed per request.");
  }

  const statementType = getStatementType(sql);
  if (!ELEVATED_IDE_STATEMENTS.has(statementType)) {
    throw new Error(
      "Elevated IDE SQL allows SELECT, WITH, PRAGMA, INSERT, UPDATE, and DELETE only."
    );
  }

  const truncatedSql = sql.trim().slice(0, 2000);
  const isRead = statementType === "SELECT" || statementType === "WITH" || statementType === "PRAGMA";

  let result;
  if (isRead) {
    const rows = all(sql, params);
    result = {
      rows,
      changes: 0,
      lastInsertRowid: 0,
      statement_type: statementType,
    };
  } else {
    const writeResult = run(sql, params);
    result = {
      rows: [],
      changes: writeResult.changes,
      lastInsertRowid: writeResult.lastID,
      statement_type: statementType,
    };
  }

  writeSystemLog({
    level: "info",
    source: "admin_ide",
    message: `Elevated IDE ${statementType}${isRead ? "" : ` (${result.changes} change(s))`}`,
    function_name: "executeElevatedIdeSql",
    user_id: user?.id ?? null,
    username: user?.username ?? null,
    data: {
      statement_type: statementType,
      sql: truncatedSql,
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
      row_count: Array.isArray(result.rows) ? result.rows.length : 0,
    },
  });

  return result;
};

const resolveRequestedLabelField = (refTable, requestedLabelField) => {
  if (
    requestedLabelField &&
    isValidIdentifier(requestedLabelField) &&
    hasColumn(refTable, requestedLabelField)
  ) {
    return requestedLabelField;
  }

  if (hasColumn(SYSTEM_DICTIONARY_TABLE, "ref_label_field")) {
    const fromDictionary = all(
      `
        SELECT ref_label_field
        FROM ${SYSTEM_DICTIONARY_TABLE}
        WHERE type = 'field'
          AND ref_table = ?
          AND ref_label_field IS NOT NULL
          AND TRIM(ref_label_field) != ''
        ORDER BY id
        LIMIT 1
      `,
      [refTable]
    )[0]?.ref_label_field;
    if (
      fromDictionary &&
      isValidIdentifier(fromDictionary) &&
      hasColumn(refTable, fromDictionary)
    ) {
      return fromDictionary;
    }
  }

  return resolveDefaultRefLabelField(refTable);
};

const buildReferenceLabelMapForTable = (refTable, idColumn, labelField, limit = 500) => {
  const safeTable = quoteIdentifier(refTable);
  const safeId = quoteIdentifier(idColumn);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 2000) : 500;

  let rows;
  if (
    refTable === USERS_TABLE &&
    labelField === "display_name" &&
    hasColumn(USERS_TABLE, "display_name") &&
    hasColumn(USERS_TABLE, "username")
  ) {
    rows = all(
      `
        SELECT ${safeId} AS id,
               COALESCE(NULLIF(TRIM(display_name), ''), username) AS label
        FROM ${safeTable}
        ORDER BY ${safeId}
        LIMIT ${safeLimit}
      `
    );
  } else if (labelField === idColumn || !hasColumn(refTable, labelField)) {
    rows = all(
      `
        SELECT ${safeId} AS id, CAST(${safeId} AS TEXT) AS label
        FROM ${safeTable}
        ORDER BY ${safeId}
        LIMIT ${safeLimit}
      `
    );
  } else {
    const safeLabel = quoteIdentifier(labelField);
    rows = all(
      `
        SELECT ${safeId} AS id,
               COALESCE(NULLIF(TRIM(CAST(${safeLabel} AS TEXT)), ''), CAST(${safeId} AS TEXT)) AS label
        FROM ${safeTable}
        ORDER BY ${safeId}
        LIMIT ${safeLimit}
      `
    );
  }

  return Object.fromEntries(
    rows
      .filter((row) => row.id !== null && row.id !== undefined && row.id !== "")
      .map((row) => [String(row.id), String(row.label ?? row.id)])
  );
};

const getReferenceLabelMaps = (refs, user) => {
  if (!Array.isArray(refs) || refs.length === 0) {
    return { maps: {} };
  }

  const maps = {};
  for (const ref of refs) {
    const refTable = String(ref?.table || "").trim();
    if (!refTable) {
      throw new Error("Each ref requires a table.");
    }
    assertValidTable(refTable);
    assertUserCanAccessTable(user, refTable, { forWrite: false });

    const idColumn =
      ref?.idColumn && isValidIdentifier(ref.idColumn) && hasColumn(refTable, ref.idColumn)
        ? ref.idColumn
        : getPrimaryKeyColumn(refTable);
    const labelField = resolveRequestedLabelField(refTable, ref?.labelField);
    if (!labelField) {
      maps[refTable] = {};
      continue;
    }

    maps[refTable] = buildReferenceLabelMapForTable(
      refTable,
      idColumn,
      labelField,
      Number(ref?.limit) || 500
    );
  }

  return { maps };
};

const crudDb = (payload, userId = null) => {
  const {
    action,
    table,
    data = {},
    where = "",
    whereParams = [],
    columns = ["*"],
    limit,
    offset,
    orderBy,
    orderDirection,
    countTotal = false,
  } = payload;

  if (!action) {
    throw new Error("action is required.");
  }

  assertValidTable(table);
  const safeTable = quoteIdentifier(table);

  const safeColumns =
    columns.length === 1 && columns[0] === "*"
      ? "*"
      : columns
          .map((column) => {
            if (!isValidIdentifier(column)) {
              throw new Error(`Invalid column name: ${column}`);
            }
            return quoteIdentifier(column);
          })
          .join(", ");

  switch (action) {
    case "select": {
      const whereClause = where ? ` WHERE ${where}` : "";
      const tableColumns = all(`PRAGMA table_info(${safeTable})`).map(
        (column) => column.name
      );

      let orderClause = "";
      if (orderBy) {
        if (!isValidIdentifier(orderBy)) {
          throw new Error(`Invalid orderBy column: ${orderBy}`);
        }
        if (!tableColumns.includes(orderBy)) {
          throw new Error(`Unknown sort column: ${orderBy}`);
        }
        const direction =
          String(orderDirection ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
        const secondarySort =
          orderBy === "id" ? "" : `, ${quoteIdentifier("id")} DESC`;
        orderClause = ` ORDER BY ${quoteIdentifier(orderBy)} ${direction}${secondarySort}`;
      }

      const limitClause =
        Number.isInteger(limit) && limit > 0 ? ` LIMIT ${limit}` : "";
      const offsetClause =
        Number.isInteger(offset) && offset >= 0 ? ` OFFSET ${offset}` : "";
      const rows = all(
        `SELECT ${safeColumns} FROM ${safeTable}${whereClause}${orderClause}${limitClause}${offsetClause}`,
        whereParams
      );

      if (!countTotal) {
        return { rows };
      }

      const total =
        all(`SELECT COUNT(*) AS total FROM ${safeTable}${whereClause}`, whereParams)[0]
          ?.total ?? 0;

      return { rows, total };
    }
    case "insert":
      return insertAuditedRow(table, data, userId);
    case "update":
      return updateAuditedRow(table, data, where, whereParams, userId);
    case "delete":
      return archiveAndDeleteRows(table, where, whereParams, userId);
    case "clear":
      return clearTableRecords(table, userId);
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
};

const getTokenFromHeader = (req) => {
  const authHeader = req.headers["authorization"] ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim() || null;
};

const getSessionUser = (req) => {
  const session = getSessionRecord(req);
  return session?.user ?? null;
};

const requireAuthUser = (req, res) => {
  const session = getSessionRecord(req);
  if (!session) {
    sendApiError(res, req, 401, "Session expired. Please sign in again.", {
      code: "SESSION_EXPIRED",
      function_name: "requireAuthUser",
    });
    return null;
  }
  return session;
};

let systemLogWriteDepth = 0;

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value, (_key, nested) => {
      if (nested instanceof Error) {
        return {
          name: nested.name,
          message: nested.message,
          stack: nested.stack,
        };
      }
      if (typeof nested === "bigint") {
        return nested.toString();
      }
      return nested;
    });
  } catch {
    return JSON.stringify({ serialization_error: true, value: String(value) });
  }
};

const appendSystemLogFile = (entry) => {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
  const day = String(entry.created_on || new Date().toISOString()).slice(0, 10);
  const filePath = path.join(LOGS_DIR, `errors-${day}.log`);
  appendFileSync(filePath, `${safeJsonStringify(entry)}\n`, "utf8");
};

/**
 * Persist an error/warning to the system_logs table and always append to data/logs.
 * File write is the durable fallback when the DB insert fails.
 */
const writeSystemLog = (partial = {}) => {
  const createdOn = new Date().toISOString();
  const entry = {
    level: String(partial.level || "error").slice(0, 32),
    source: String(partial.source || "server").slice(0, 32),
    message: String(partial.message || "Unknown error.").slice(0, 4000),
    stack: partial.stack ? String(partial.stack).slice(0, 20000) : null,
    function_name: partial.function_name ? String(partial.function_name).slice(0, 255) : null,
    url: partial.url ? String(partial.url).slice(0, 2000) : null,
    method: partial.method ? String(partial.method).slice(0, 16) : null,
    status_code:
      partial.status_code === undefined || partial.status_code === null
        ? null
        : Number(partial.status_code),
    user_id: partial.user_id == null || partial.user_id === "" ? null : Number(partial.user_id),
    username: partial.username ? String(partial.username).slice(0, 255) : null,
    user_agent: partial.user_agent ? String(partial.user_agent).slice(0, 1000) : null,
    ip_address: partial.ip_address ? String(partial.ip_address).slice(0, 128) : null,
    data:
      partial.data === undefined || partial.data === null
        ? null
        : typeof partial.data === "string"
          ? partial.data.slice(0, 100000)
          : safeJsonStringify(partial.data).slice(0, 100000),
    created_on: createdOn,
    created_by: partial.user_id == null || partial.user_id === "" ? null : Number(partial.user_id),
    updated_on: createdOn,
    updated_by: partial.user_id == null || partial.user_id === "" ? null : Number(partial.user_id),
  };

  if (systemLogWriteDepth > 0) {
    try {
      appendSystemLogFile({ ...entry, note: "nested_log_write" });
    } catch {
      // ignore
    }
    return null;
  }

  systemLogWriteDepth += 1;
  try {
    try {
      appendSystemLogFile(entry);
    } catch (fileError) {
      console.error("Failed to write error log file:", fileError);
    }

    try {
      const result = insertAuditedRow(
        SYSTEM_LOGS_TABLE,
        {
          level: entry.level,
          source: entry.source,
          message: entry.message,
          stack: entry.stack,
          function_name: entry.function_name,
          url: entry.url,
          method: entry.method,
          status_code: Number.isFinite(entry.status_code) ? entry.status_code : null,
          user_id: Number.isFinite(entry.user_id) ? entry.user_id : null,
          username: entry.username,
          user_agent: entry.user_agent,
          ip_address: entry.ip_address,
          data: entry.data,
        },
        Number.isFinite(entry.user_id) ? entry.user_id : null
      );
      return result;
    } catch (dbError) {
      try {
        appendSystemLogFile({
          ...entry,
          db_write_error: dbError?.message || String(dbError),
          db_write_stack: dbError?.stack || null,
        });
      } catch {
        console.error("Failed to write error log (DB and file):", dbError);
      }
      return null;
    }
  } finally {
    systemLogWriteDepth -= 1;
  }
};

const logRequestError = (req, errorOrMessage, options = {}) => {
  const err = errorOrMessage instanceof Error ? errorOrMessage : null;
  const message =
    err?.message ||
    (typeof errorOrMessage === "string" ? errorOrMessage : null) ||
    options.message ||
    "Request failed.";
  const user = options.user ?? getSessionUser(req);
  writeSystemLog({
    level: options.level || "error",
    source: options.source || "server",
    message,
    stack: options.stack || err?.stack || null,
    function_name: options.function_name || null,
    url: options.url || req?.url || null,
    method: options.method || req?.method || null,
    status_code: options.status_code ?? null,
    user_id: user?.id ?? null,
    username: user?.username ?? null,
    user_agent: req?.headers?.["user-agent"] || null,
    ip_address: req ? getClientIp(req) : null,
    data: {
      ...(options.data && typeof options.data === "object" ? options.data : { data: options.data }),
      error_name: err?.name || null,
      error_code: err?.code || options.code || null,
    },
  });
};

const sendApiError = (res, req, statusCode, errorOrMessage, options = {}) => {
  const message =
    errorOrMessage instanceof Error
      ? errorOrMessage.message || "Request failed."
      : String(errorOrMessage || "Request failed.");
  logRequestError(req, errorOrMessage, {
    ...options,
    status_code: statusCode,
    message,
  });
  const payload = { error: message };
  if (options.code) payload.code = options.code;
  if (options.extraPayload && typeof options.extraPayload === "object") {
    Object.assign(payload, options.extraPayload);
  }
  json(res, statusCode, payload);
};

const runInTransaction = (callback) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

const wipeDirectoryContents = (dirPath) => {
  if (!existsSync(dirPath)) {
    return 0;
  }

  let removed = 0;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    rmSync(path.join(dirPath, entry.name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
};

const resolveRootAdminUser = (actingUser) => {
  const byUsername = all(
    `SELECT * FROM ${USERS_TABLE} WHERE username = 'admin' LIMIT 1`
  )[0];
  if (byUsername) {
    return byUsername;
  }

  if (actingUser?.id) {
    const byId = all(`SELECT * FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`, [actingUser.id])[0];
    if (byId) {
      return byId;
    }
  }

  throw new Error("Could not resolve the root administrator account to preserve.");
};

const clearSqliteSequences = (tableNames) => {
  const sequenceExists =
    all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence' LIMIT 1")
      .length > 0;
  if (!sequenceExists || tableNames.length === 0) {
    return;
  }

  const placeholders = tableNames.map(() => "?").join(", ");
  run(`DELETE FROM sqlite_sequence WHERE name IN (${placeholders})`, tableNames);
};

/**
 * Factory reset: wipe user-entered data, keep OOB apps/types/dictionary/builtin reports,
 * and preserve the root admin user.
 */
const performZeroBoot = (actingUser, { confirm } = {}) => {
  if (String(confirm || "").trim().toUpperCase() !== "ZERO") {
    throw new Error('Type ZERO to confirm the factory reset.');
  }

  const rootUser = resolveRootAdminUser(actingUser);
  const rootUserId = Number(rootUser.id);

  const clearedTables = [];
  const deleteAll = (tableName) => {
    run(`DELETE FROM ${quoteIdentifier(tableName)}`);
    clearedTables.push(tableName);
  };

  // File wipe outside the DB transaction (best-effort; DB wipe is authoritative).
  const removedAttachmentDirs = wipeDirectoryContents(ATTACHMENTS_DIR);
  const removedAccountImages = wipeDirectoryContents(ACCOUNT_IMAGES_DIR);

  runInTransaction(() => {
    // Budget / finance dependents first.
    deleteAll(TRANSACTION_ATTACHMENTS_TABLE);
    deleteAll(TRANSACTION_SPLITS_TABLE);
    deleteAll(TRANSACTIONS_TABLE);
    deleteAll(RECURRING_TRANSACTIONS_TABLE);
    deleteAll(BUDGETS_TABLE);
    deleteAll(PAYEE_RULES_TABLE);
    deleteAll(PAYEES_TABLE);
    deleteAll(GOALS_TABLE);
    deleteAll(ACCOUNT_JOINT_USERS_TABLE);
    deleteAll(ACCOUNTS_TABLE);
    deleteAll(NET_WORTH_SNAPSHOTS_TABLE);

    // Categories: wipe then reseed OOB defaults after transaction.
    deleteAll(CATEGORIES_TABLE);
    deleteAll(CATEGORY_TYPES_TABLE);

    // Custom dashboards / SQL reports (builtin reports live in code).
    deleteAll(DASHBOARD_LAYOUT_ITEMS_TABLE);
    deleteAll(DASHBOARDS_TABLE);
    deleteAll(DASHBOARD_REPORTS_TABLE);

    // Tasks
    deleteAll(TASK_TAG_LINKS_TABLE);
    deleteAll(TASK_SUBTASKS_TABLE);
    deleteAll(POMODORO_SESSIONS_TABLE);
    deleteAll(TASKS_TABLE);
    deleteAll(TASK_TAGS_TABLE);
    deleteAll(TASK_PROJECTS_TABLE);

    // Notes
    deleteAll(NOTES_TABLE);
    deleteAll(NOTE_TOPICS_TABLE);
    deleteAll(NOTE_SUBJECTS_TABLE);
    deleteAll(NOTEBOOKS_TABLE);

    // Per-user UI state
    deleteAll(USER_FAVORITES_TABLE);
    deleteAll(USER_PREFERENCES_TABLE);

    // Ops archives / logs
    deleteAll(SYSTEM_DELETES_TABLE);
    deleteAll(SYSTEM_LOGS_TABLE);

    // Custom navigation is rebuilt from OOB seed.
    deleteAll(SYSTEM_NAVIGATION_TABLE);

    // Account types: restore defaults after wipe.
    deleteAll(ACCOUNT_TYPES_TABLE);

    // Applications: restore OOB apps after wipe.
    deleteAll(APPLICATIONS_TABLE);

    // Keep only the root user.
    run(`DELETE FROM ${USER_ROLES_TABLE} WHERE user_id != ?`, [rootUserId]);
    run(`DELETE FROM ${USERS_TABLE} WHERE id != ?`, [rootUserId]);
    run(
      `INSERT OR IGNORE INTO ${USER_ROLES_TABLE} (user_id, application, role) VALUES (?, 'system', 'admin')`,
      [rootUserId]
    );

    clearSqliteSequences([
      TRANSACTION_ATTACHMENTS_TABLE,
      TRANSACTION_SPLITS_TABLE,
      TRANSACTIONS_TABLE,
      RECURRING_TRANSACTIONS_TABLE,
      BUDGETS_TABLE,
      PAYEE_RULES_TABLE,
      PAYEES_TABLE,
      GOALS_TABLE,
      ACCOUNTS_TABLE,
      NET_WORTH_SNAPSHOTS_TABLE,
      CATEGORIES_TABLE,
      CATEGORY_TYPES_TABLE,
      DASHBOARD_LAYOUT_ITEMS_TABLE,
      DASHBOARDS_TABLE,
      DASHBOARD_REPORTS_TABLE,
      TASK_TAG_LINKS_TABLE,
      TASK_SUBTASKS_TABLE,
      POMODORO_SESSIONS_TABLE,
      TASKS_TABLE,
      TASK_TAGS_TABLE,
      TASK_PROJECTS_TABLE,
      NOTES_TABLE,
      NOTE_TOPICS_TABLE,
      NOTE_SUBJECTS_TABLE,
      NOTEBOOKS_TABLE,
      USER_FAVORITES_TABLE,
      USER_PREFERENCES_TABLE,
      SYSTEM_DELETES_TABLE,
      SYSTEM_LOGS_TABLE,
      SYSTEM_NAVIGATION_TABLE,
      ACCOUNT_TYPES_TABLE,
      APPLICATIONS_TABLE,
    ]);
  });

  // Restore out-of-box base data.
  ensureApplications();
  ensureAccountTypes();
  seedCategoryFinance(rootUserId);
  ensureSystemDictionary();
  ensurePhase2DictionaryLabels();
  ensurePhase3DictionaryLabels();
  ensurePhase4DictionaryLabels();
  ensureTasksDictionaryLabels();
  ensureNotesDictionaryLabels();
  ensureAuditDictionaryLabels();
  ensureAccountDictionaryLabels();
  ensureTransactionDictionaryLabels();
  seedNavigation(rootUserId);

  // Drop other users' in-memory sessions; keep the acting root session.
  for (const [token, session] of sessions.entries()) {
    if (Number(session?.user?.id) !== rootUserId) {
      sessions.delete(token);
    } else if (session?.user) {
      // Refresh roles on the preserved session.
      session.user.roles = getUserRoles(rootUserId);
    }
  }

  return {
    ok: true,
    preserved_user: {
      id: rootUserId,
      username: rootUser.username,
      display_name: rootUser.display_name,
    },
    cleared_tables: clearedTables,
    removed_attachment_dirs: removedAttachmentDirs,
    removed_account_images: removedAccountImages,
  };
};

const getTransactionById = (id) =>
  all(`SELECT * FROM ${TRANSACTIONS_TABLE} WHERE id = ? LIMIT 1`, [id])[0] ?? null;

const getCategoryType = (categoryId) => {
  const row = all(
    `
      SELECT ct.name AS type_name
      FROM categories c
      JOIN category_types ct ON ct.id = c.type_id
      WHERE c.id = ?
      LIMIT 1
    `,
    [categoryId]
  )[0];
  return row?.type_name ? String(row.type_name).trim().toLowerCase() : null;
};

const getTransactionSplits = (transactionId) =>
  all(
    `
      SELECT id, category_id, amount, description
      FROM ${TRANSACTION_SPLITS_TABLE}
      WHERE transaction_id = ?
      ORDER BY id
    `,
    [transactionId]
  );

const deleteTransactionSplits = (transactionId) => {
  run(`DELETE FROM ${TRANSACTION_SPLITS_TABLE} WHERE transaction_id = ?`, [transactionId]);
};

const saveTransactionSplits = (transactionId, splits, userId = null) => {
  deleteTransactionSplits(transactionId);
  for (const split of splits) {
    insertAuditedRow(
      TRANSACTION_SPLITS_TABLE,
      {
        transaction_id: transactionId,
        category_id: split.category_id,
        amount: split.amount,
        description: split.description ?? null,
      },
      userId
    );
  }
};

const ATTACHMENT_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

const ensureAttachmentsDir = () => {
  if (!existsSync(ATTACHMENTS_DIR)) {
    mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
};

const sanitizeAttachmentFilename = (filename, mimeType) => {
  const raw = String(filename || "attachment").trim() || "attachment";
  const base = path.basename(raw).replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120);
  if (base.includes(".")) {
    return base;
  }
  return `${base}${ATTACHMENT_MIME_EXTENSIONS[mimeType] || ""}`;
};

const normalizeAttachmentFilePayload = (fileBase64, mimeType, { allowPdf = true } = {}) => {
  let data = String(fileBase64 || "").trim();
  let mime = String(mimeType || "").trim().toLowerCase();

  const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    data = dataUrlMatch[2];
  }

  data = data.replace(/\s+/g, "");
  if (!data) {
    throw new Error("file_base64 is required.");
  }

  if (!mime) {
    mime = "image/jpeg";
  }
  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowPdf) {
    allowed.push("application/pdf");
  }
  if (!allowed.includes(mime)) {
    throw new Error(
      allowPdf
        ? "Unsupported file type. Use JPEG, PNG, WebP, GIF, or PDF."
        : "Unsupported image type. Use JPEG, PNG, WebP, or GIF."
    );
  }

  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes > 12 * 1024 * 1024) {
    throw new Error("Attachment is too large. Please use a file under 12MB.");
  }

  return { data, mimeType: mime, sizeBytes: approxBytes };
};

const FAVORITE_ICON_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

// Favorite icons are small (favicon-sized), so store them inline as a data
// URL rather than on disk like transaction attachments — this keeps the
// sidebar's icon rendering simple (no authenticated file-fetch needed) and
// avoids managing a separate upload directory for tiny images.
const normalizeFavoriteIconDataUrl = (dataUrl) => {
  const raw = String(dataUrl || "").trim();
  if (!raw) {
    throw new Error("Icon file is required.");
  }

  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Icon must be uploaded as a data URL.");
  }

  let mime = match[1].toLowerCase();
  const data = match[2].replace(/\s+/g, "");
  if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") {
    mime = "image/x-icon";
  }
  if (!FAVORITE_ICON_MIME_TYPES.includes(mime)) {
    throw new Error("Unsupported icon type. Use PNG, JPEG, WebP, GIF, SVG, or ICO.");
  }

  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes > 300 * 1024) {
    throw new Error("Icon is too large. Please use a file under 300KB.");
  }

  return `data:${mime};base64,${data}`;
};

const resolveAttachmentAbsolutePath = (storagePath) => {
  const absolute = path.resolve(ATTACHMENTS_DIR, storagePath);
  if (!absolute.startsWith(ATTACHMENTS_DIR)) {
    throw new Error("Invalid attachment path.");
  }
  return absolute;
};

const ensureAccountImagesDir = () => {
  if (!existsSync(ACCOUNT_IMAGES_DIR)) {
    mkdirSync(ACCOUNT_IMAGES_DIR, { recursive: true });
  }
};

const resolveAccountImageAbsolutePath = (storagePath) => {
  const absolute = path.resolve(ACCOUNT_IMAGES_DIR, storagePath);
  if (!absolute.startsWith(ACCOUNT_IMAGES_DIR)) {
    throw new Error("Invalid image path.");
  }
  return absolute;
};

// Account tile photos can be real logos/photos (larger than a favicon), so
// they're stored on disk like transaction attachments rather than inline as
// a data URL — this keeps the accounts table lean when listing many rows.
const normalizeAccountImagePayload = (fileBase64, mimeType) => {
  let data = String(fileBase64 || "").trim();
  let mime = String(mimeType || "").trim().toLowerCase();

  const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    data = dataUrlMatch[2];
  }

  data = data.replace(/\s+/g, "");
  if (!data) {
    throw new Error("Image file is required.");
  }

  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(mime)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes > 5 * 1024 * 1024) {
    throw new Error("Image is too large. Please use a file under 5MB.");
  }

  return { data, mimeType: mime, sizeBytes: approxBytes };
};

const deleteAccountImageFile = (imagePath) => {
  if (!imagePath) {
    return;
  }
  try {
    const absolutePath = resolveAccountImageAbsolutePath(imagePath);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  } catch {
    // Ignore cleanup failures — a missing file on disk shouldn't block the request.
  }
};

const setAccountImage = (accountId, { file_base64, mime_type } = {}, userId = null) => {
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error("Account not found.");
  }

  const { data, mimeType } = normalizeAccountImagePayload(file_base64, mime_type);
  const extension = ATTACHMENT_MIME_EXTENSIONS[mimeType] || ".jpg";
  const relativePath = `${accountId}_${randomBytes(8).toString("hex")}${extension}`;
  const absolutePath = resolveAccountImageAbsolutePath(relativePath);

  ensureAccountImagesDir();
  writeFileSync(absolutePath, Buffer.from(data, "base64"));

  const existingRow = all(`SELECT image_path FROM ${ACCOUNTS_TABLE} WHERE id = ? LIMIT 1`, [
    accountId,
  ])[0];

  updateAuditedRow(
    ACCOUNTS_TABLE,
    { image_path: relativePath, image_mime_type: mimeType },
    "id = ?",
    [accountId],
    userId
  );

  deleteAccountImageFile(existingRow?.image_path);

  return { image_path: relativePath, image_mime_type: mimeType };
};

const readAccountImageFile = (accountId) => {
  const row = all(
    `SELECT image_path, image_mime_type FROM ${ACCOUNTS_TABLE} WHERE id = ? LIMIT 1`,
    [accountId]
  )[0];
  if (!row?.image_path) {
    throw new Error("This account has no image.");
  }

  const absolutePath = resolveAccountImageAbsolutePath(row.image_path);
  if (!existsSync(absolutePath)) {
    throw new Error("Image file is missing on disk.");
  }

  return {
    mimeType: row.image_mime_type || "image/jpeg",
    buffer: readFileSync(absolutePath),
  };
};

const deleteAccountImage = (accountId, userId = null) => {
  const row = all(`SELECT image_path FROM ${ACCOUNTS_TABLE} WHERE id = ? LIMIT 1`, [accountId])[0];
  if (!row) {
    throw new Error("Account not found.");
  }

  updateAuditedRow(
    ACCOUNTS_TABLE,
    { image_path: null, image_mime_type: null },
    "id = ?",
    [accountId],
    userId
  );

  deleteAccountImageFile(row.image_path);

  return { ok: true };
};

const listTransactionAttachments = (transactionId) =>
  all(
    `
      SELECT id, transaction_id, filename, mime_type, size_bytes, source, created_on, created_by
      FROM ${TRANSACTION_ATTACHMENTS_TABLE}
      WHERE transaction_id = ?
      ORDER BY id ASC
    `,
    [transactionId]
  );

const getTransactionAttachmentRow = (transactionId, attachmentId) =>
  all(
    `
      SELECT *
      FROM ${TRANSACTION_ATTACHMENTS_TABLE}
      WHERE id = ? AND transaction_id = ?
      LIMIT 1
    `,
    [attachmentId, transactionId]
  )[0] ?? null;

const createTransactionAttachment = (
  transactionId,
  { file_base64, mime_type, filename, source = "upload" } = {},
  userId = null
) => {
  const transaction = getTransactionById(transactionId);
  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const { data, mimeType, sizeBytes } = normalizeAttachmentFilePayload(file_base64, mime_type, {
    allowPdf: true,
  });
  const safeName = sanitizeAttachmentFilename(filename, mimeType);
  const uniqueName = `${randomBytes(8).toString("hex")}_${safeName}`;
  const relativePath = path.join(String(transactionId), uniqueName);
  const absoluteDir = path.join(ATTACHMENTS_DIR, String(transactionId));
  const absolutePath = resolveAttachmentAbsolutePath(relativePath);

  ensureAttachmentsDir();
  if (!existsSync(absoluteDir)) {
    mkdirSync(absoluteDir, { recursive: true });
  }

  writeFileSync(absolutePath, Buffer.from(data, "base64"));

  const normalizedSource =
    source === "receipt_scan" || source === "upload" ? source : "upload";

  try {
    const result = insertAuditedRow(
      TRANSACTION_ATTACHMENTS_TABLE,
      {
        transaction_id: Number(transactionId),
        filename: safeName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        storage_path: relativePath.replace(/\\/g, "/"),
        source: normalizedSource,
      },
      userId
    );

    const row = getTransactionAttachmentRow(transactionId, result.lastID);
    return {
      attachment: {
        id: row.id,
        transaction_id: row.transaction_id,
        filename: row.filename,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        source: row.source,
        created_on: row.created_on,
        created_by: row.created_by,
      },
    };
  } catch (error) {
    try {
      if (existsSync(absolutePath)) {
        unlinkSync(absolutePath);
      }
    } catch {
      // Ignore cleanup failures.
    }
    throw error;
  }
};

const readTransactionAttachmentFile = (transactionId, attachmentId) => {
  const row = getTransactionAttachmentRow(transactionId, attachmentId);
  if (!row) {
    throw new Error("Attachment not found.");
  }

  const absolutePath = resolveAttachmentAbsolutePath(row.storage_path);
  if (!existsSync(absolutePath)) {
    throw new Error("Attachment file is missing on disk.");
  }

  return {
    row,
    buffer: readFileSync(absolutePath),
  };
};

const deleteTransactionAttachment = (transactionId, attachmentId) => {
  const row = getTransactionAttachmentRow(transactionId, attachmentId);
  if (!row) {
    throw new Error("Attachment not found.");
  }

  run(`DELETE FROM ${TRANSACTION_ATTACHMENTS_TABLE} WHERE id = ? AND transaction_id = ?`, [
    attachmentId,
    transactionId,
  ]);

  try {
    const absolutePath = resolveAttachmentAbsolutePath(row.storage_path);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  } catch {
    // Keep DB row deleted even if file cleanup fails.
  }

  return { ok: true };
};

const deleteTransactionAttachments = (transactionId) => {
  const rows = all(
    `SELECT id, storage_path FROM ${TRANSACTION_ATTACHMENTS_TABLE} WHERE transaction_id = ?`,
    [transactionId]
  );
  run(`DELETE FROM ${TRANSACTION_ATTACHMENTS_TABLE} WHERE transaction_id = ?`, [transactionId]);

  for (const row of rows) {
    try {
      const absolutePath = resolveAttachmentAbsolutePath(row.storage_path);
      if (existsSync(absolutePath)) {
        unlinkSync(absolutePath);
      }
    } catch {
      // Ignore cleanup failures.
    }
  }
};

const validateSplitLines = (splits, totalAmount) => {
  if (!Array.isArray(splits) || splits.length === 0) {
    return null;
  }

  if (splits.length < 2) {
    throw new Error("Split transactions need at least two category lines.");
  }

  let sum = 0;
  const normalized = splits.map((split, index) => {
    const categoryId = Number(split.category_id);
    const amount = Number(split.amount);
    const lineNumber = index + 1;

    if (!categoryId) {
      throw new Error(`Split line ${lineNumber}: category is required.`);
    }
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error(`Split line ${lineNumber}: amount cannot be zero.`);
    }

    const categoryType = getCategoryType(categoryId);
    if (categoryType === "income" && amount < 0) {
      throw new Error(`Split line ${lineNumber}: income amounts must be positive.`);
    }
    if (categoryType === "expense" && amount > 0) {
      throw new Error(`Split line ${lineNumber}: expense amounts must be negative.`);
    }

    sum += amount;
    return {
      category_id: categoryId,
      amount,
      description: split.description?.trim() || null,
    };
  });

  if (Math.abs(sum - totalAmount) > 0.005) {
    throw new Error(
      `Split lines must sum to the transaction amount (${totalAmount}). Current sum: ${sum}.`
    );
  }

  return normalized;
};

const applyPayeeRules = (description, accountId = null) => {
  const normalizedDescription = description?.trim().toLowerCase();
  if (!normalizedDescription) {
    return null;
  }

  const rules = all(
    `
      SELECT r.category_id, r.payee_id, r.pattern, r.account_id
      FROM ${PAYEE_RULES_TABLE} r
      WHERE r.is_active = 1
      ORDER BY r.priority DESC, r.id ASC
    `
  );

  for (const rule of rules) {
    if (rule.account_id && Number(rule.account_id) !== Number(accountId)) {
      continue;
    }
    if (normalizedDescription.includes(String(rule.pattern).trim().toLowerCase())) {
      return {
        category_id: Number(rule.category_id),
        payee_id: rule.payee_id ? Number(rule.payee_id) : null,
      };
    }
  }

  return null;
};

const resolvePayeeId = (payload, userId = null) => {
  if (payload.payee_id) {
    return Number(payload.payee_id);
  }

  const payeeName = payload.payee_name?.trim();
  if (!payeeName) {
    return null;
  }

  const existing = all(
    `SELECT id FROM ${PAYEES_TABLE} WHERE name = ? COLLATE NOCASE LIMIT 1`,
    [payeeName]
  )[0];

  if (existing) {
    return existing.id;
  }

  const defaultCategoryId = payload.category_id ? Number(payload.category_id) : null;
  return insertAuditedRow(
    PAYEES_TABLE,
    {
      name: payeeName,
      default_category_id: defaultCategoryId,
      notes: null,
    },
    userId
  ).lastID;
};

const enrichTransactionPayload = (payload, userId = null) => {
  const nextPayload = { ...payload };
  const description = nextPayload.description?.trim() || "";
  const ruleAccountId = nextPayload.account_id || nextPayload.from_account_id || null;

  if (!nextPayload.category_id && description) {
    const ruleMatch = applyPayeeRules(description, ruleAccountId);
    if (ruleMatch) {
      nextPayload.category_id = ruleMatch.category_id;
      if (!nextPayload.payee_id && ruleMatch.payee_id) {
        nextPayload.payee_id = ruleMatch.payee_id;
      }
    }
  }

  if (!nextPayload.payee_id && nextPayload.payee_name) {
    nextPayload.payee_id = resolvePayeeId(nextPayload, userId);
  } else if (nextPayload.payee_id && !nextPayload.payee_name) {
    const payee = all(
      `SELECT name, description FROM ${PAYEES_TABLE} WHERE id = ? LIMIT 1`,
      [nextPayload.payee_id]
    )[0];
    if (!description) {
      const payeeDescription = String(payee?.description || "").trim();
      if (payeeDescription) {
        nextPayload.description = payeeDescription;
      } else if (payee?.name) {
        nextPayload.description = payee.name;
      }
    }
  }

  return nextPayload;
};

const addFrequencyToDate = (dateValue, frequency) => {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return date.toISOString().slice(0, 10);
};

const applyMonthlyDay = (dateValue, dayOfMonth) => {
  if (!dayOfMonth) {
    return dateValue;
  }

  const date = new Date(`${dateValue}T12:00:00`);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(Number(dayOfMonth), daysInMonth));
  return date.toISOString().slice(0, 10);
};

const computeNextDueDate = (recurring, fromDate = null) => {
  const baseDate = fromDate || recurring.next_due_date || recurring.start_date;
  let nextDate = addFrequencyToDate(baseDate, recurring.frequency);
  if (recurring.frequency === "monthly") {
    nextDate = applyMonthlyDay(nextDate, recurring.day_of_month);
  }
  if (recurring.end_date && nextDate > recurring.end_date) {
    return null;
  }
  return nextDate;
};

const getRecurringById = (id) =>
  all(`SELECT * FROM ${RECURRING_TRANSACTIONS_TABLE} WHERE id = ? LIMIT 1`, [id])[0] ?? null;

const validateRecurringPayload = (payload) => {
  const accountId = Number(payload.account_id);
  const categoryId = Number(payload.category_id);
  const userId = Number(payload.user_id);
  const amount = Number(payload.amount);
  const frequency = payload.frequency?.trim();
  const startDate = payload.start_date?.trim();
  const nextDueDate = payload.next_due_date?.trim() || startDate;
  const endDate = payload.end_date?.trim() || null;

  if (!accountId) throw new Error("Account is required.");
  if (!categoryId) throw new Error("Category is required.");
  if (!userId) throw new Error("User is required.");
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Amount cannot be zero.");
  }
  if (!RECURRING_FREQUENCIES.includes(frequency)) {
    throw new Error("Frequency must be weekly, biweekly, monthly, quarterly, or yearly.");
  }
  if (!startDate) throw new Error("Start date is required.");
  if (!nextDueDate) throw new Error("Next due date is required.");

  const categoryType = getCategoryType(categoryId);
  if (categoryType === "income" && amount < 0) {
    throw new Error("Income recurring items must use a positive amount.");
  }
  if (categoryType === "expense" && amount > 0) {
    throw new Error("Expense recurring items must use a negative amount.");
  }

  return {
    user_id: userId,
    account_id: accountId,
    payee_id: payload.payee_id ? Number(payload.payee_id) : null,
    category_id: categoryId,
    amount,
    description: payload.description?.trim() || null,
    frequency,
    day_of_month: payload.day_of_month ? Number(payload.day_of_month) : null,
    start_date: startDate,
    end_date: endDate,
    next_due_date: nextDueDate,
    is_active: payload.is_active === false || payload.is_active === 0 ? 0 : 1,
  };
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsvText = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    row.__rowNumber = index + 2;
    return row;
  });
};

const csvEscape = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const rowsToCsv = (rows, columns) => {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => csvEscape(row[column.key])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
};

const resolveImportReference = (table, value, labelColumn = "name") => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const row = all(
    `SELECT id FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(labelColumn)} = ? COLLATE NOCASE LIMIT 1`,
    [trimmed]
  )[0];
  if (!row) {
    throw new Error(`${formatLabel(table)} "${trimmed}" was not found.`);
  }
  return row.id;
};

const transactionDuplicateExists = (accountId, transactionDate, amount, description) => {
  const existing = all(
    `
      SELECT id
      FROM ${TRANSACTIONS_TABLE}
      WHERE account_id = ?
        AND transaction_date = ?
        AND amount = ?
        AND COALESCE(description, '') = COALESCE(?, '')
      LIMIT 1
    `,
    [accountId, transactionDate, amount, description ?? null]
  )[0];
  return Boolean(existing);
};

const validateTransactionPayload = ({
  account_id,
  category_id,
  amount,
  transaction_date,
  source_account_id,
  user_id,
}, options = {}) => {
  const { hasSplits = false } = options;

  if (!account_id) {
    throw new Error("Account is required.");
  }
  if (!category_id) {
    throw new Error("Category is required.");
  }
  if (!transaction_date) {
    throw new Error("Transaction date is required.");
  }
  if (!user_id) {
    throw new Error("User is required.");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    throw new Error("Amount cannot be zero. Use positive for deposits and negative for withdrawals.");
  }

  if (
    source_account_id &&
    Number(source_account_id) === Number(account_id)
  ) {
    throw new Error("Pay-from account must be different from the bill account.");
  }

  if (!source_account_id && !hasSplits) {
    const categoryType = getCategoryType(category_id);
    const accountTypeName = getAccountTypeNameForAccountId(account_id);

    if (!isLiabilityAccountTypeName(accountTypeName)) {
      if (categoryType === "income" && numericAmount < 0) {
        throw new Error("Income must be entered as a positive amount (deposit).");
      }
      if (categoryType === "expense" && numericAmount > 0) {
        throw new Error("Expenses must be entered as a negative amount (withdrawal).");
      }
    }
  }

  assertValidTable(TRANSACTIONS_TABLE);
  assertValidTable(ACCOUNTS_TABLE);
  assertValidTable("categories");

  return {
    account_id: Number(account_id),
    category_id: Number(category_id),
    user_id: Number(user_id),
    amount: numericAmount,
    description: null,
    transaction_date,
    source_account_id: source_account_id ? Number(source_account_id) : null,
  };
};

const insertBudgetTransactionRecord = (data, payload, userId, transactionKind, linkedTransactionId = null) =>
  insertAuditedRow(
    TRANSACTIONS_TABLE,
    {
      account_id: data.account_id,
      category_id: data.category_id,
      user_id: data.user_id,
      payee_id: payload.payee_id ? Number(payload.payee_id) : null,
      amount: data.amount,
      description: payload.description?.trim() || null,
      transaction_date: data.transaction_date,
      transaction_kind: transactionKind,
      linked_transaction_id: linkedTransactionId,
    },
    userId
  );

const createBudgetTransaction = (payload, userId = null) =>
  runInTransaction(() => {
    const enrichedPayload = enrichTransactionPayload(payload, userId);

    if (enrichedPayload.from_account_id && enrichedPayload.to_account_id) {
      const data = validateFromToTransferPayload(enrichedPayload);
      const description = enrichedPayload.description?.trim() || null;
      const payeeId = enrichedPayload.payee_id ? Number(enrichedPayload.payee_id) : null;

      const fromResult = insertAuditedRow(
        TRANSACTIONS_TABLE,
        {
          account_id: data.from_account_id,
          category_id: data.category_id,
          user_id: data.user_id,
          payee_id: payeeId,
          amount: data.from_amount,
          description,
          transaction_date: data.transaction_date,
          transaction_kind: "transfer",
          linked_transaction_id: null,
        },
        userId
      );

      const toResult = insertAuditedRow(
        TRANSACTIONS_TABLE,
        {
          account_id: data.to_account_id,
          category_id: data.category_id,
          user_id: data.user_id,
          payee_id: payeeId,
          amount: data.to_amount,
          description,
          transaction_date: data.transaction_date,
          transaction_kind: "transfer",
          linked_transaction_id: fromResult.lastID,
        },
        userId
      );

      updateAuditedRow(
        TRANSACTIONS_TABLE,
        { linked_transaction_id: toResult.lastID },
        "id = ?",
        [fromResult.lastID],
        userId
      );

      refreshAccountBalances([data.from_account_id, data.to_account_id], userId);
      return formatTransferApiResult(fromResult.lastID, toResult.lastID, data);
    }

    const splitLines = validateSplitLines(enrichedPayload.splits, Number(enrichedPayload.amount));
    const data = validateTransactionPayload(enrichedPayload, { hasSplits: Boolean(splitLines) });
    if (splitLines && data.source_account_id) {
      throw new Error("Split transactions cannot be used with pay-from another account.");
    }
    if (splitLines) {
      data.category_id = splitLines[0].category_id;
    }

    let result;

    if (data.source_account_id) {
      const billResult = insertBudgetTransactionRecord(
        data,
        enrichedPayload,
        userId,
        "transfer"
      );

      const sourceAmount = getTransferPartnerAmount(
        data.account_id,
        data.source_account_id,
        data.amount
      );

      const sourceResult = insertAuditedRow(
        TRANSACTIONS_TABLE,
        {
          account_id: data.source_account_id,
          category_id: data.category_id,
          user_id: data.user_id,
          payee_id: enrichedPayload.payee_id ? Number(enrichedPayload.payee_id) : null,
          amount: sourceAmount,
          description: enrichedPayload.description?.trim() || null,
          transaction_date: data.transaction_date,
          transaction_kind: "transfer",
          linked_transaction_id: billResult.lastID,
        },
        userId
      );

      updateAuditedRow(
        TRANSACTIONS_TABLE,
        { linked_transaction_id: sourceResult.lastID },
        "id = ?",
        [billResult.lastID],
        userId
      );

      result = {
        id: billResult.lastID,
        linked_transaction_id: sourceResult.lastID,
        transaction_kind: "transfer",
      };
    } else {
      const insertResult = insertBudgetTransactionRecord(
        data,
        enrichedPayload,
        userId,
        splitLines ? "split" : "standard"
      );

      if (splitLines) {
        saveTransactionSplits(insertResult.lastID, splitLines, userId);
      }

      result = {
        id: insertResult.lastID,
        linked_transaction_id: null,
        transaction_kind: splitLines ? "split" : "standard",
      };
    }

    refreshAccountBalances([data.account_id, data.source_account_id], userId);
    return result;
  });

const updateBudgetTransaction = (id, payload, userId = null) =>
  runInTransaction(() => {
    const existing = getTransactionById(id);
    if (!existing) {
      throw new Error("Transaction not found.");
    }

    const enrichedPayload = enrichTransactionPayload(payload, userId);
    const partner = existing.linked_transaction_id
      ? getTransactionById(existing.linked_transaction_id)
      : null;

    if (enrichedPayload.from_account_id && enrichedPayload.to_account_id) {
      const data = validateFromToTransferPayload(enrichedPayload);
      const description = enrichedPayload.description?.trim() || null;
      const payeeId = enrichedPayload.payee_id ? Number(enrichedPayload.payee_id) : null;
      const affectedAccountIds = new Set([
        existing.account_id,
        data.from_account_id,
        data.to_account_id,
      ]);
      if (partner) {
        affectedAccountIds.add(partner.account_id);
      }

      deleteTransactionSplits(existing.id);
      if (partner) {
        deleteTransactionSplits(partner.id);
      }

      let fromRowId;
      let toRowId;

      if (partner) {
        const typeA = getAccountTypeNameForAccountId(existing.account_id);
        const typeB = getAccountTypeNameForAccountId(partner.account_id);
        const roles = resolveTransferRoles(existing, typeA, partner, typeB);
        fromRowId = roles.from.id;
        toRowId = roles.to.id;

        updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: data.from_account_id,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: data.from_amount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: toRowId,
          },
          "id = ?",
          [fromRowId],
          userId
        );
        updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: data.to_account_id,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: data.to_amount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: fromRowId,
          },
          "id = ?",
          [toRowId],
          userId
        );
      } else {
        fromRowId = existing.id;
        updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: data.from_account_id,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: data.from_amount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: null,
          },
          "id = ?",
          [fromRowId],
          userId
        );

        const toResult = insertAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: data.to_account_id,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: data.to_amount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: fromRowId,
          },
          userId
        );
        toRowId = toResult.lastID;

        updateAuditedRow(
          TRANSACTIONS_TABLE,
          { linked_transaction_id: toRowId },
          "id = ?",
          [fromRowId],
          userId
        );
      }

      refreshAccountBalances([...affectedAccountIds], userId);
      return formatTransferApiResult(fromRowId, toRowId, data);
    }

    const splitLines = validateSplitLines(enrichedPayload.splits, Number(enrichedPayload.amount));
    const data = validateTransactionPayload(enrichedPayload, { hasSplits: Boolean(splitLines) });
    if (splitLines && data.source_account_id) {
      throw new Error("Split transactions cannot be used with pay-from another account.");
    }
    if (splitLines) {
      data.category_id = splitLines[0].category_id;
    }

    const description = enrichedPayload.description?.trim() || null;
    const payeeId = enrichedPayload.payee_id ? Number(enrichedPayload.payee_id) : null;
    const affectedAccountIds = new Set([existing.account_id, data.account_id]);
    if (partner) {
      affectedAccountIds.add(partner.account_id);
    }
    if (data.source_account_id) {
      affectedAccountIds.add(data.source_account_id);
    }

    let result;

    if (data.source_account_id) {
      deleteTransactionSplits(existing.id);
      const billAccountId = data.account_id;
      const sourceAccountId = data.source_account_id;
      const billAmount = data.amount;
      const sourceAmount = getTransferPartnerAmount(
        billAccountId,
        sourceAccountId,
        billAmount
      );

      if (partner) {
        const billRow = existing.id < partner.id ? existing : partner;
        const sourceRow = existing.id < partner.id ? partner : existing;

        updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: billAccountId,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: billAmount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
          },
          "id = ?",
          [billRow.id],
          userId
        );
        updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: sourceAccountId,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: sourceAmount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
          },
          "id = ?",
          [sourceRow.id],
          userId
        );

        if (!billRow.linked_transaction_id || !sourceRow.linked_transaction_id) {
          updateAuditedRow(
            TRANSACTIONS_TABLE,
            { linked_transaction_id: sourceRow.id },
            "id = ?",
            [billRow.id],
            userId
          );
          updateAuditedRow(
            TRANSACTIONS_TABLE,
            { linked_transaction_id: billRow.id },
            "id = ?",
            [sourceRow.id],
            userId
          );
        }

        result = { id: billRow.id, linked_transaction_id: sourceRow.id, transaction_kind: "transfer" };
      } else {
        const billResult = updateAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: billAccountId,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: billAmount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: null,
          },
          "id = ?",
          [existing.id],
          userId
        );

        if (billResult.changes === 0) {
          throw new Error("Unable to update transaction.");
        }

        const sourceResult = insertAuditedRow(
          TRANSACTIONS_TABLE,
          {
            account_id: sourceAccountId,
            category_id: data.category_id,
            user_id: data.user_id,
            payee_id: payeeId,
            amount: sourceAmount,
            description,
            transaction_date: data.transaction_date,
            transaction_kind: "transfer",
            linked_transaction_id: existing.id,
          },
          userId
        );

        updateAuditedRow(
          TRANSACTIONS_TABLE,
          { linked_transaction_id: sourceResult.lastID },
          "id = ?",
          [existing.id],
          userId
        );

        result = {
          id: existing.id,
          linked_transaction_id: sourceResult.lastID,
          transaction_kind: "transfer",
        };
      }
    } else {
      if (partner) {
        run(`DELETE FROM ${TRANSACTIONS_TABLE} WHERE id = ?`, [partner.id]);
      }

      updateAuditedRow(
        TRANSACTIONS_TABLE,
        {
          account_id: data.account_id,
          category_id: data.category_id,
          user_id: data.user_id,
          payee_id: payeeId,
          amount: data.amount,
          description,
          transaction_date: data.transaction_date,
          transaction_kind: splitLines ? "split" : "standard",
          linked_transaction_id: null,
        },
        "id = ?",
        [existing.id],
        userId
      );

      if (splitLines) {
        saveTransactionSplits(existing.id, splitLines, userId);
      } else {
        deleteTransactionSplits(existing.id);
      }

      result = {
        id: existing.id,
        linked_transaction_id: null,
        transaction_kind: splitLines ? "split" : "standard",
      };
    }

    refreshAccountBalances([...affectedAccountIds], userId);
    return result;
  });

const deleteBudgetTransaction = (id, userId = null) =>
  runInTransaction(() => {
    const existing = getTransactionById(id);
    if (!existing) {
      throw new Error("Transaction not found.");
    }

    const partner = existing.linked_transaction_id
      ? getTransactionById(existing.linked_transaction_id)
      : null;
    const affectedAccountIds = [existing.account_id];
    if (partner) {
      affectedAccountIds.push(partner.account_id);
    }

    const transactionIds = prepareDeleteDependents(TRANSACTIONS_TABLE, [id], userId);
    if (transactionIds.length > 0) {
      const placeholders = transactionIds.map(() => "?").join(", ");
      archiveAndDeleteRowsInternal(
        TRANSACTIONS_TABLE,
        `id IN (${placeholders})`,
        transactionIds,
        userId
      );
    }

    refreshAccountBalances(affectedAccountIds, userId);
    return { ok: true };
  });

const getAccountTypeNameForAccountId = (accountId) => {
  const row = all(
    `
      SELECT at.name AS account_type_name
      FROM ${ACCOUNTS_TABLE} a
      JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [accountId]
  )[0];

  return row?.account_type_name ?? null;
};

const getTransferPartnerAmount = (primaryAccountId, sourceAccountId, primaryAmount) => {
  const numeric = Number(primaryAmount);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return numeric;
  }

  const primaryType = getAccountTypeNameForAccountId(primaryAccountId);
  const sourceType = getAccountTypeNameForAccountId(sourceAccountId);
  const primaryLiability = isLiabilityAccountTypeName(primaryType);
  const sourceLiability = isLiabilityAccountTypeName(sourceType);

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
};

/** From→To signed legs from a positive amount and account type names. */
const buildTransferLegAmounts = (fromType, toType, absoluteAmount) => {
  const abs = Math.abs(Number(absoluteAmount));
  if (!Number.isFinite(abs) || abs === 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const fromLiability = isLiabilityAccountTypeName(fromType);
  const toLiability = isLiabilityAccountTypeName(toType);

  if (isLineOfCreditAccountTypeName(fromType) && toLiability) {
    return {
      fromAmount: abs,
      toAmount: -abs,
      absoluteAmount: abs,
      kind: "loc_draw",
    };
  }

  if (isLineOfCreditAccountTypeName(fromType) && !toLiability) {
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
};

/** Infer From/To roles from a linked transfer pair (not by lower row id). */
const resolveTransferRoles = (rowA, typeA, rowB, typeB) => {
  const aLiability = isLiabilityAccountTypeName(typeA);
  const bLiability = isLiabilityAccountTypeName(typeB);
  const aAmount = Number(rowA.amount);
  const bAmount = Number(rowB.amount);

  if (aLiability && bLiability) {
    if (aAmount > 0 && bAmount < 0 && isLineOfCreditAccountTypeName(typeA)) {
      return {
        from: rowA,
        to: rowB,
        absoluteAmount: Math.abs(aAmount),
        kind: "loc_draw",
      };
    }
    if (bAmount > 0 && aAmount < 0 && isLineOfCreditAccountTypeName(typeB)) {
      return {
        from: rowB,
        to: rowA,
        absoluteAmount: Math.abs(bAmount),
        kind: "loc_draw",
      };
    }

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
        kind: isLineOfCreditAccountTypeName(typeA) ? "loc_draw" : "advance",
      };
    }
    if (!aLiability && bLiability) {
      return {
        from: rowB,
        to: rowA,
        absoluteAmount: Math.abs(bAmount),
        kind: isLineOfCreditAccountTypeName(typeB) ? "loc_draw" : "advance",
      };
    }
  }

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
};

const validateFromToTransferPayload = (payload) => {
  const fromAccountId = Number(payload.from_account_id);
  const toAccountId = Number(payload.to_account_id);
  const abs = Math.abs(Number(payload.amount));

  if (!fromAccountId || !toAccountId) {
    throw new Error("From and To accounts are required.");
  }
  if (fromAccountId === toAccountId) {
    throw new Error("From and To accounts must be different.");
  }
  if (!Number.isFinite(abs) || abs === 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (!payload.category_id) {
    throw new Error("Category is required.");
  }
  if (!payload.transaction_date) {
    throw new Error("Transaction date is required.");
  }
  if (!payload.user_id) {
    throw new Error("User is required.");
  }
  if (Array.isArray(payload.splits) && payload.splits.length > 0) {
    throw new Error("Transfers cannot use split lines.");
  }

  assertValidTable(TRANSACTIONS_TABLE);
  assertValidTable(ACCOUNTS_TABLE);
  assertValidTable("categories");

  const fromType = getAccountTypeNameForAccountId(fromAccountId);
  const toType = getAccountTypeNameForAccountId(toAccountId);
  if (!fromType) {
    throw new Error("From account was not found.");
  }
  if (!toType) {
    throw new Error("To account was not found.");
  }

  const legs = buildTransferLegAmounts(fromType, toType, abs);

  return {
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    category_id: Number(payload.category_id),
    user_id: Number(payload.user_id),
    transaction_date: payload.transaction_date,
    from_amount: legs.fromAmount,
    to_amount: legs.toAmount,
    absolute_amount: legs.absoluteAmount,
    transfer_kind: legs.kind,
  };
};

const formatTransferApiResult = (fromRowId, toRowId, data) => ({
  id: fromRowId,
  linked_transaction_id: toRowId,
  transaction_kind: "transfer",
  from_account_id: data.from_account_id,
  to_account_id: data.to_account_id,
  amount: data.absolute_amount,
  transfer_kind: data.transfer_kind,
});

const getAvailableCreditForAccount = (account) => {
  const limit = Number(account?.credit_limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  const owed = Math.max(Number(account?.balance) || 0, 0);
  return Math.max(limit - owed, 0);
};

const getAccountById = (id) =>
  all(
    `
      SELECT a.id, a.name, a.balance, COALESCE(a.opening_balance, 0) AS opening_balance,
             a.credit_limit, a.user_id, at.name AS account_type_name
      FROM ${ACCOUNTS_TABLE} a
      JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [id]
  )[0] ?? null;

const getAccountLedgerBalance = (accountId) => {
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error("Account not found.");
  }

  const totals = all(
    `
      SELECT COALESCE(SUM(amount), 0) AS transaction_total
      FROM ${TRANSACTIONS_TABLE}
      WHERE account_id = ?
    `,
    [accountId]
  )[0];

  return Number(account.opening_balance) + Number(totals?.transaction_total ?? 0);
};

const getBudgetVsActual = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("month must use YYYY-MM format.");
  }

  return all(
    `
      SELECT
        b.id AS budget_id,
        b.category_id,
        c.name AS category_name,
        b.amount AS budget_amount,
        COALESCE((
          SELECT SUM(ABS(line.amount))
          FROM (
            SELECT ts.category_id, ts.amount, t.transaction_date
            FROM ${TRANSACTIONS_TABLE} t
            JOIN ${TRANSACTION_SPLITS_TABLE} ts ON ts.transaction_id = t.id
            WHERE t.transaction_kind = 'split'
            UNION ALL
            SELECT t.category_id, t.amount, t.transaction_date
            FROM ${TRANSACTIONS_TABLE} t
            WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
          ) line
          JOIN ${CATEGORIES_TABLE} c2 ON c2.id = line.category_id
          JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c2.type_id
          WHERE line.category_id = b.category_id
            AND LOWER(ct.name) NOT IN ('income', 'transfer')
            AND strftime('%Y-%m', line.transaction_date) = b.month
        ), 0) AS spent_amount
      FROM ${BUDGETS_TABLE} b
      JOIN ${CATEGORIES_TABLE} c ON c.id = b.category_id
      WHERE b.month = ?
      ORDER BY c.name
    `,
    [month]
  ).map((row) => {
    const budgetAmount = Number(row.budget_amount) || 0;
    const spentAmount = Number(row.spent_amount) || 0;
    const remainingAmount = budgetAmount - spentAmount;
    const percentUsed = budgetAmount > 0 ? spentAmount / budgetAmount : 0;

    return {
      ...row,
      budget_amount: budgetAmount,
      spent_amount: spentAmount,
      remaining_amount: remainingAmount,
      percent_used: percentUsed,
      over_budget: spentAmount > budgetAmount,
    };
  });
};

// Columns exposed by the register_rows subquery below — used to validate
// caller-supplied orderBy/filter column names before interpolating them into
// SQL text.
const ACCOUNT_REGISTER_COLUMNS = new Set([
  "id",
  "transaction_date",
  "created_on",
  "description",
  "amount",
  "cleared",
  "transaction_kind",
  "category_id",
  "category_name",
  "running_balance",
]);

const buildAccountRegisterWhere = (where, whereParams) => {
  const trimmed = String(where || "").trim();
  if (!trimmed) {
    return { clause: "", params: [] };
  }

  // The filter text is built client-side (see utils/tableFilter.js) using
  // quoted, allow-listed column names, mirroring how the generic table CRUD
  // endpoint already trusts caller-built WHERE text for this single-tenant
  // admin app. We additionally verify every quoted identifier that appears
  // resolves to a known register column before running the query.
  const referenced = [...trimmed.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  for (const column of referenced) {
    if (!ACCOUNT_REGISTER_COLUMNS.has(column)) {
      throw new Error(`Unknown filter column: ${column}`);
    }
  }

  return { clause: ` AND ${trimmed}`, params: Array.isArray(whereParams) ? whereParams : [] };
};

const getAccountRegister = (
  accountId,
  { page = 1, limit = 20, orderBy = null, orderDirection = null, where = "", whereParams = [] } = {}
) => {
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error("Account not found.");
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (pageNum - 1) * pageSize;

  const sortColumn = orderBy && ACCOUNT_REGISTER_COLUMNS.has(orderBy) ? orderBy : "transaction_date";
  const sortDirection = String(orderDirection ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const secondarySort = sortColumn === "id" ? "" : `, id ${sortDirection}`;

  const { clause: filterClause, params: filterParams } = buildAccountRegisterWhere(
    where,
    whereParams
  );

  const registerRowsSql = `
    SELECT
      t.id,
      t.transaction_date,
      t.created_on,
      t.description,
      t.amount,
      t.cleared,
      t.transaction_kind,
      t.category_id,
      c.name AS category_name,
      COALESCE(a.opening_balance, 0) + SUM(t.amount) OVER (
        ORDER BY t.transaction_date ASC, t.id ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance
    FROM ${TRANSACTIONS_TABLE} t
    JOIN ${ACCOUNTS_TABLE} a ON a.id = t.account_id
    LEFT JOIN ${CATEGORIES_TABLE} c ON c.id = t.category_id
    WHERE t.account_id = ?
  `;

  const total =
    all(
      `SELECT COUNT(*) AS total FROM (${registerRowsSql}) register_rows WHERE 1=1${filterClause}`,
      [accountId, ...filterParams]
    )[0]?.total ?? 0;

  const transactions = all(
    `
      SELECT *
      FROM (${registerRowsSql}) register_rows
      WHERE 1=1${filterClause}
      ORDER BY ${quoteIdentifier(sortColumn)} ${sortDirection}${secondarySort}
      LIMIT ? OFFSET ?
    `,
    [accountId, ...filterParams, pageSize, offset]
  );

  const ledgerBalance = getAccountLedgerBalance(accountId);
  const clearedBalance = all(
    `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM ${TRANSACTIONS_TABLE}
      WHERE account_id = ? AND cleared = 1
    `,
    [accountId]
  )[0]?.total ?? 0;

  const unclearedCount =
    all(
      `
        SELECT COUNT(*) AS total
        FROM ${TRANSACTIONS_TABLE}
        WHERE account_id = ? AND cleared != 1
      `,
      [accountId]
    )[0]?.total ?? 0;

  const availableCredit = getAvailableCreditForAccount({
    balance: ledgerBalance,
    credit_limit: account.credit_limit,
  });

  return {
    account: {
      ...account,
      ledger_balance: ledgerBalance,
      cleared_balance: Number(account.opening_balance) + Number(clearedBalance),
      available_credit: availableCredit,
      uncleared_count: unclearedCount,
    },
    transactions,
    sort: { column: sortColumn, direction: sortDirection.toLowerCase() },
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
    },
  };
};

const setTransactionCleared = (transactionId, cleared, userId = null) => {
  const existing = getTransactionById(transactionId);
  if (!existing) {
    throw new Error("Transaction not found.");
  }

  updateAuditedRow(
    TRANSACTIONS_TABLE,
    { cleared: cleared ? 1 : 0 },
    "id = ?",
    [transactionId],
    userId
  );

  return { ok: true, cleared: Boolean(cleared) };
};

const syncAccountBalanceFromLedger = (accountId, userId = null) => {
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error("Account not found.");
  }

  const ledgerBalance = getAccountLedgerBalance(accountId);
  updateAuditedRow(
    ACCOUNTS_TABLE,
    { balance: ledgerBalance },
    "id = ?",
    [accountId],
    userId
  );

  return { ok: true, balance: ledgerBalance };
};

const getAccountJointUserIds = (accountId) =>
  all(
    `SELECT user_id FROM ${ACCOUNT_JOINT_USERS_TABLE} WHERE account_id = ? ORDER BY user_id`,
    [accountId]
  ).map((row) => Number(row.user_id));

const setAccountJointUsers = (accountId, userIds = []) => {
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error("Account not found.");
  }

  const ownerId =
    account.owner_user_id != null && account.owner_user_id !== ""
      ? Number(account.owner_user_id)
      : null;
  const isJoint = Number(account.is_joint) === 1;

  run(`DELETE FROM ${ACCOUNT_JOINT_USERS_TABLE} WHERE account_id = ?`, [accountId]);

  if (!isJoint) {
    return { ok: true, user_ids: [] };
  }

  const uniqueIds = [
    ...new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0 && value !== ownerId)
    ),
  ];

  for (const userId of uniqueIds) {
    const exists = all(`SELECT id FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`, [userId])[0];
    if (!exists) {
      continue;
    }
    run(
      `INSERT INTO ${ACCOUNT_JOINT_USERS_TABLE} (account_id, user_id) VALUES (?, ?)`,
      [accountId, userId]
    );
  }

  return { ok: true, user_ids: getAccountJointUserIds(accountId) };
};

const getUpcomingBills = (days = 30) => {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + Number(days || 30));
  const horizonDate = horizon.toISOString().slice(0, 10);

  return all(
    `
      SELECT
        r.id,
        r.account_id,
        r.category_id,
        r.payee_id,
        r.amount,
        r.description,
        r.frequency,
        r.next_due_date,
        r.is_active,
        a.name AS account_name,
        c.name AS category_name,
        p.name AS payee_name
      FROM ${RECURRING_TRANSACTIONS_TABLE} r
      JOIN ${ACCOUNTS_TABLE} a ON a.id = r.account_id
      JOIN ${CATEGORIES_TABLE} c ON c.id = r.category_id
      LEFT JOIN ${PAYEES_TABLE} p ON p.id = r.payee_id
      WHERE r.is_active = 1
        AND r.next_due_date <= ?
      ORDER BY r.next_due_date ASC, r.id ASC
    `,
    [horizonDate]
  );
};

const postRecurringTransaction = (recurringId, userId, postDate = null) => {
  const recurring = getRecurringById(recurringId);
  if (!recurring) {
    throw new Error("Recurring transaction not found.");
  }
  if (!recurring.is_active) {
    throw new Error("Recurring transaction is inactive.");
  }

  const dueDate = postDate || recurring.next_due_date;
  const payee = recurring.payee_id
    ? all(`SELECT name FROM ${PAYEES_TABLE} WHERE id = ? LIMIT 1`, [recurring.payee_id])[0]
    : null;

  const transactionResult = createBudgetTransaction(
    {
      user_id: recurring.user_id,
      account_id: recurring.account_id,
      category_id: recurring.category_id,
      payee_id: recurring.payee_id,
      amount: recurring.amount,
      description: recurring.description || payee?.name || null,
      transaction_date: dueDate,
    },
    userId
  );

  const nextDueDate = computeNextDueDate(recurring, dueDate);
  updateAuditedRow(
    RECURRING_TRANSACTIONS_TABLE,
    {
      next_due_date: nextDueDate || recurring.next_due_date,
      last_posted_date: dueDate,
      is_active: nextDueDate ? 1 : 0,
    },
    "id = ?",
    [recurringId],
    userId
  );

  return {
    recurring_id: recurringId,
    transaction_id: transactionResult.id,
    posted_date: dueDate,
    next_due_date: nextDueDate,
  };
};

const postDueRecurringTransactions = (userId, asOfDate = null) => {
  const today = asOfDate || new Date().toISOString().slice(0, 10);
  const posted = [];
  const maxIterations = 500;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const dueItems = all(
      `
        SELECT id
        FROM ${RECURRING_TRANSACTIONS_TABLE}
        WHERE is_active = 1
          AND next_due_date <= ?
        ORDER BY next_due_date ASC, id ASC
        LIMIT 25
      `,
      [today]
    );

    if (dueItems.length === 0) {
      break;
    }

    for (const item of dueItems) {
      const recurring = getRecurringById(item.id);
      if (!recurring || !recurring.is_active || recurring.next_due_date > today) {
        continue;
      }
      posted.push(postRecurringTransaction(recurring.id, userId, recurring.next_due_date));
    }
  }

  return { posted_count: posted.length, posted };
};

const exportTransactionsCsv = ({ from = null, to = null, accountId = null } = {}) => {
  let where = "1 = 1";
  const params = [];

  if (from) {
    where += " AND t.transaction_date >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND t.transaction_date <= ?";
    params.push(to);
  }
  if (accountId) {
    where += " AND t.account_id = ?";
    params.push(Number(accountId));
  }

  const rows = all(
    `
      SELECT
        t.transaction_date,
        a.name AS account,
        p.name AS payee,
        c.name AS category,
        t.amount,
        t.description,
        t.cleared,
        t.transaction_kind
      FROM ${TRANSACTIONS_TABLE} t
      JOIN ${ACCOUNTS_TABLE} a ON a.id = t.account_id
      LEFT JOIN ${PAYEES_TABLE} p ON p.id = t.payee_id
      JOIN ${CATEGORIES_TABLE} c ON c.id = t.category_id
      WHERE ${where}
      ORDER BY t.transaction_date ASC, t.id ASC
    `,
    params
  );

  return rowsToCsv(rows, [
    { key: "transaction_date", label: "date" },
    { key: "account", label: "account" },
    { key: "payee", label: "payee" },
    { key: "category", label: "category" },
    { key: "amount", label: "amount" },
    { key: "description", label: "description" },
    { key: "cleared", label: "cleared" },
    { key: "transaction_kind", label: "kind" },
  ]);
};

const importTransactionsFromCsv = (csvText, userId, options = {}) => {
  const rows = parseCsvText(csvText);
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const accountValue = row.account || row.account_name;
      const accountId = resolveImportReference(ACCOUNTS_TABLE, accountValue);
      const transactionDate = row.date || row.transaction_date;
      const amount = Number(row.amount);
      const description = row.description?.trim() || row.payee?.trim() || row.payee_name?.trim() || "";
      const payeeName = row.payee?.trim() || row.payee_name?.trim() || "";
      let categoryId = null;

      const categoryValue = row.category || row.category_name;
      if (categoryValue) {
        categoryId = resolveImportReference(CATEGORIES_TABLE, categoryValue);
      }

      if (!transactionDate) {
        throw new Error("Date is required.");
      }
      if (!Number.isFinite(amount) || amount === 0) {
        throw new Error("Amount is required.");
      }

      if (!categoryId && description) {
        const ruleMatch = applyPayeeRules(description, accountId);
        if (ruleMatch) {
          categoryId = ruleMatch.category_id;
        }
      }
      if (!categoryId) {
        throw new Error("Category is required.");
      }

      let resolvedUserId = userId;
      const userValue = row.user || row.user_id || row.username;
      if (userValue) {
        if (/^\d+$/.test(String(userValue).trim())) {
          resolvedUserId = Number(userValue);
        } else {
          const userRow = all(
            `SELECT id FROM ${USERS_TABLE} WHERE username = ? COLLATE NOCASE LIMIT 1`,
            [String(userValue).trim()]
          )[0];
          if (userRow) {
            resolvedUserId = userRow.id;
          }
        }
      }

      if (
        options.skip_duplicates !== false &&
        transactionDuplicateExists(accountId, transactionDate, amount, description)
      ) {
        skipped += 1;
        continue;
      }

      const result = createBudgetTransaction(
        {
          user_id: resolvedUserId,
          account_id: accountId,
          category_id: categoryId,
          amount,
          description,
          transaction_date: transactionDate,
          payee_name: payeeName || undefined,
        },
        userId
      );

      const clearedValue = String(row.cleared ?? "").trim().toLowerCase();
      if (["1", "true", "yes"].includes(clearedValue)) {
        setTransactionCleared(result.id, true, userId);
      }

      created += 1;
    } catch (error) {
      errors.push({ row: row.__rowNumber, error: error.message });
    }
  }

  return { created, skipped, errors };
};

const addDaysToDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const getNetWorthTotals = () => {
  const row = all(
    `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN at.name IN (${LIABILITY_ACCOUNT_TYPE_SQL}) THEN 0
            ELSE COALESCE(a.balance, 0)
          END
        ), 0) AS assets_total,
        COALESCE(SUM(
          CASE
            WHEN at.name IN (${LIABILITY_ACCOUNT_TYPE_SQL}) THEN COALESCE(a.balance, 0)
            ELSE 0
          END
        ), 0) AS liabilities_total
      FROM ${ACCOUNTS_TABLE} a
      JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
    `
  )[0];

  const assetsTotal = Number(row?.assets_total) || 0;
  const liabilitiesTotal = Number(row?.liabilities_total) || 0;

  return {
    assets_total: assetsTotal,
    liabilities_total: liabilitiesTotal,
    net_worth: assetsTotal - liabilitiesTotal,
  };
};

const captureNetWorthSnapshot = (month = null, userId = null) => {
  const snapshotMonth = month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(snapshotMonth)) {
    throw new Error("snapshot month must use YYYY-MM format.");
  }

  const totals = getNetWorthTotals();
  const existing = all(
    `SELECT id FROM ${NET_WORTH_SNAPSHOTS_TABLE} WHERE snapshot_month = ? LIMIT 1`,
    [snapshotMonth]
  )[0];

  const payload = {
    snapshot_month: snapshotMonth,
    assets_total: totals.assets_total,
    liabilities_total: totals.liabilities_total,
    net_worth: totals.net_worth,
    captured_on: auditTimestamp(),
  };

  if (existing) {
    updateAuditedRow(
      NET_WORTH_SNAPSHOTS_TABLE,
      payload,
      "id = ?",
      [existing.id],
      userId
    );
    return { id: existing.id, ...payload };
  }

  const result = insertAuditedRow(NET_WORTH_SNAPSHOTS_TABLE, payload, userId);
  return { id: result.lastID, ...payload };
};

const getNetWorthHistory = () =>
  all(
    `
      SELECT snapshot_month, assets_total, liabilities_total, net_worth, captured_on
      FROM ${NET_WORTH_SNAPSHOTS_TABLE}
      ORDER BY snapshot_month ASC
    `
  ).map((row) => ({
    ...row,
    assets_total: Number(row.assets_total) || 0,
    liabilities_total: Number(row.liabilities_total) || 0,
    net_worth: Number(row.net_worth) || 0,
  }));

const getGoalById = (goalId) =>
  all(`SELECT * FROM ${GOALS_TABLE} WHERE id = ? LIMIT 1`, [goalId])[0] ?? null;

const getGoalCurrentAmount = (goal) => {
  if (goal.account_id) {
    const account = getAccountById(goal.account_id);
    return Number(account?.balance) || 0;
  }
  return Number(goal.current_amount) || 0;
};

const mapGoalWithProgress = (goal) => {
  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Math.max(getGoalCurrentAmount(goal), 0);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const percentComplete = targetAmount > 0 ? currentAmount / targetAmount : 0;

  return {
    ...goal,
    target_amount: targetAmount,
    current_amount: currentAmount,
    remaining_amount: remainingAmount,
    percent_complete: percentComplete,
    is_complete: currentAmount >= targetAmount,
  };
};

const getGoalsWithProgress = () =>
  all(
    `
      SELECT g.*, a.name AS account_name
      FROM ${GOALS_TABLE} g
      LEFT JOIN ${ACCOUNTS_TABLE} a ON a.id = g.account_id
      WHERE g.is_active = 1
      ORDER BY g.target_date IS NULL, g.target_date, g.name
    `
  ).map(mapGoalWithProgress);

const syncGoalFromAccount = (goalId, userId = null) => {
  const goal = getGoalById(goalId);
  if (!goal) {
    throw new Error("Goal not found.");
  }
  if (!goal.account_id) {
    throw new Error("This goal is not linked to an account.");
  }

  const currentAmount = getGoalCurrentAmount(goal);
  updateAuditedRow(
    GOALS_TABLE,
    { current_amount: currentAmount },
    "id = ?",
    [goalId],
    userId
  );

  return mapGoalWithProgress({ ...goal, current_amount: currentAmount });
};

const generateRecurringOccurrences = (recurring, startDate, endDate) => {
  const occurrences = [];
  if (!recurring.is_active) {
    return occurrences;
  }

  let dueDate = recurring.next_due_date;
  let safety = 0;

  while (dueDate && dueDate <= endDate && safety < 500) {
    safety += 1;
    if (dueDate >= startDate) {
      occurrences.push({
        date: dueDate,
        amount: Number(recurring.amount),
        description: recurring.description,
        account_id: recurring.account_id,
        recurring_id: recurring.id,
      });
    }

    const nextDate = computeNextDueDate(recurring, dueDate);
    if (!nextDate || nextDate === dueDate) {
      break;
    }
    dueDate = nextDate;
  }

  return occurrences;
};

const getCashFlowForecast = (days = 90) => {
  const horizonDays = Math.min(Math.max(Number(days) || 90, 7), 365);
  const today = new Date().toISOString().slice(0, 10);
  const endDate = addDaysToDate(today, horizonDays);

  const liquidAccountIds = new Set(
    all(
      `
        SELECT a.id
        FROM ${ACCOUNTS_TABLE} a
        JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
        WHERE at.name NOT IN (${LIABILITY_ACCOUNT_TYPE_SQL})
      `
    ).map((row) => row.id)
  );

  const startingBalance = Number(
    all(
      `
        SELECT COALESCE(SUM(a.balance), 0) AS total
        FROM ${ACCOUNTS_TABLE} a
        JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
        WHERE at.name NOT IN (${LIABILITY_ACCOUNT_TYPE_SQL})
      `
    )[0]?.total ?? 0
  );

  const recurringItems = all(
    `SELECT * FROM ${RECURRING_TRANSACTIONS_TABLE} WHERE is_active = 1`
  );
  const dailyChanges = {};

  for (const recurring of recurringItems) {
    if (!liquidAccountIds.has(recurring.account_id)) {
      continue;
    }
    const occurrences = generateRecurringOccurrences(recurring, today, endDate);
    for (const occurrence of occurrences) {
      dailyChanges[occurrence.date] = (dailyChanges[occurrence.date] || 0) + occurrence.amount;
    }
  }

  const points = [];
  let balance = startingBalance;
  let lowestBalance = startingBalance;
  let lowestDate = today;

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const date = addDaysToDate(today, offset);
    const change = dailyChanges[date] || 0;
    balance += change;
    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestDate = date;
    }
    points.push({ date, balance, change });
  }

  return {
    days: horizonDays,
    starting_balance: startingBalance,
    ending_balance: balance,
    lowest_balance: lowestBalance,
    lowest_date: lowestDate,
    points,
  };
};

const calculateDebtPayoff = ({ strategy = "avalanche", extra_payment = 0 } = {}) => {
  const normalizedStrategy = strategy === "snowball" ? "snowball" : "avalanche";
  const extraPayment = Math.max(Number(extra_payment) || 0, 0);

  const debts = all(
    `
      SELECT
        a.id,
        a.name,
        COALESCE(a.balance, 0) AS balance,
        COALESCE(a.apr, 0) AS apr,
        COALESCE(a.minimum_payment, 0) AS minimum_payment
      FROM ${ACCOUNTS_TABLE} a
      JOIN ${ACCOUNT_TYPES_TABLE} at ON at.id = a.account_type_id
      WHERE at.name IN (${LIABILITY_ACCOUNT_TYPE_SQL})
        AND COALESCE(a.balance, 0) > 0.005
      ORDER BY a.name
    `
  ).map((debt) => ({
    id: debt.id,
    name: debt.name,
    starting_balance: Number(debt.balance) || 0,
    apr: Number(debt.apr) || 0,
    minimum_payment: Math.max(Number(debt.minimum_payment) || 25, 0),
  }));

  if (debts.length === 0) {
    return {
      strategy: normalizedStrategy,
      extra_payment: extraPayment,
      months: 0,
      total_interest: 0,
      debts: [],
      schedule: [],
    };
  }

  const payoffOrder = [...debts];
  if (normalizedStrategy === "snowball") {
    payoffOrder.sort((left, right) => left.starting_balance - right.starting_balance);
  } else {
    payoffOrder.sort(
      (left, right) => right.apr - left.apr || right.starting_balance - left.starting_balance
    );
  }

  const workingDebts = debts.map((debt) => ({
    ...debt,
    current: debt.starting_balance,
  }));

  let month = 0;
  let totalInterest = 0;
  const schedule = [];
  const maxMonths = 600;

  while (workingDebts.some((debt) => debt.current > 0.005) && month < maxMonths) {
    month += 1;
    let availableExtra = extraPayment;

    for (const debt of workingDebts) {
      if (debt.current <= 0.005) {
        continue;
      }
      const interest = debt.current * (debt.apr / 100 / 12);
      debt.current += interest;
      totalInterest += interest;
    }

    for (const debt of workingDebts) {
      if (debt.current <= 0.005) {
        continue;
      }
      const payment = Math.min(debt.minimum_payment, debt.current);
      debt.current -= payment;
    }

    for (const priority of payoffOrder) {
      const debt = workingDebts.find((entry) => entry.id === priority.id);
      if (!debt || debt.current <= 0.005) {
        continue;
      }
      const payment = Math.min(availableExtra, debt.current);
      debt.current -= payment;
      availableExtra -= payment;
      if (availableExtra <= 0.005) {
        break;
      }
    }

    if (month <= 12) {
      schedule.push({
        month,
        balances: workingDebts.map((debt) => ({
          id: debt.id,
          name: debt.name,
          balance: Math.max(debt.current, 0),
        })),
      });
    }
  }

  return {
    strategy: normalizedStrategy,
    extra_payment: extraPayment,
    months: month,
    total_interest: totalInterest,
    debts: payoffOrder,
    schedule,
  };
};

const EXPENSE_LINES_SQL = `
  SELECT
    line.category_id,
    line.category_name,
    line.amount,
    line.transaction_date,
    line.account_id,
    line.tax_deductible
  FROM (
    SELECT
      ts.category_id,
      c.name AS category_name,
      ts.amount,
      t.transaction_date,
      t.account_id,
      COALESCE(c.tax_deductible, 0) AS tax_deductible
    FROM ${TRANSACTIONS_TABLE} t
    JOIN ${TRANSACTION_SPLITS_TABLE} ts ON ts.transaction_id = t.id
    JOIN ${CATEGORIES_TABLE} c ON c.id = ts.category_id
    JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c.type_id
    WHERE t.transaction_kind = 'split'
      AND LOWER(ct.name) NOT IN ('income', 'transfer')
    UNION ALL
    SELECT
      t.category_id,
      c.name AS category_name,
      t.amount,
      t.transaction_date,
      t.account_id,
      COALESCE(c.tax_deductible, 0) AS tax_deductible
    FROM ${TRANSACTIONS_TABLE} t
    JOIN ${CATEGORIES_TABLE} c ON c.id = t.category_id
    JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c.type_id
    WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
      AND LOWER(ct.name) NOT IN ('income', 'transfer')
  ) line
`;

const INCOME_LINES_SQL = `
  SELECT
    line.category_id,
    line.category_name,
    line.amount,
    line.transaction_date,
    line.account_id
  FROM (
    SELECT
      ts.category_id,
      c.name AS category_name,
      ts.amount,
      t.transaction_date,
      t.account_id
    FROM ${TRANSACTIONS_TABLE} t
    JOIN ${TRANSACTION_SPLITS_TABLE} ts ON ts.transaction_id = t.id
    JOIN ${CATEGORIES_TABLE} c ON c.id = ts.category_id
    JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c.type_id
    WHERE t.transaction_kind = 'split'
      AND LOWER(ct.name) = 'income'
    UNION ALL
    SELECT
      t.category_id,
      c.name AS category_name,
      t.amount,
      t.transaction_date,
      t.account_id
    FROM ${TRANSACTIONS_TABLE} t
    JOIN ${CATEGORIES_TABLE} c ON c.id = t.category_id
    JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c.type_id
    WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
      AND LOWER(ct.name) = 'income'
  ) line
`;

const getSpendingTrends = (months = 12) => {
  const monthCount = Math.min(Math.max(Number(months) || 12, 3), 36);
  const rows = all(
    `
      SELECT
        strftime('%Y-%m', transaction_date) AS month,
        COALESCE(SUM(ABS(amount)), 0) AS spent
      FROM (${EXPENSE_LINES_SQL})
      WHERE transaction_date >= date('now', ?)
      GROUP BY month
      ORDER BY month ASC
    `,
    [`-${monthCount} months`]
  );

  return rows.map((row) => ({
    month: row.month,
    spent: Number(row.spent) || 0,
  }));
};

const getIncomeVsExpenseTrends = (months = 12) => {
  const monthCount = Math.min(Math.max(Number(months) || 12, 3), 36);
  const expenseRows = all(
    `
      SELECT
        strftime('%Y-%m', transaction_date) AS month,
        COALESCE(SUM(ABS(amount)), 0) AS expense
      FROM (${EXPENSE_LINES_SQL})
      WHERE transaction_date >= date('now', ?)
      GROUP BY month
    `,
    [`-${monthCount} months`]
  );
  const incomeRows = all(
    `
      SELECT
        strftime('%Y-%m', transaction_date) AS month,
        COALESCE(SUM(amount), 0) AS income
      FROM (${INCOME_LINES_SQL})
      WHERE transaction_date >= date('now', ?)
      GROUP BY month
    `,
    [`-${monthCount} months`]
  );

  const monthMap = new Map();
  for (const row of expenseRows) {
    monthMap.set(row.month, { month: row.month, income: 0, expense: Number(row.expense) || 0 });
  }
  for (const row of incomeRows) {
    const existing = monthMap.get(row.month) ?? { month: row.month, income: 0, expense: 0 };
    existing.income = Number(row.income) || 0;
    monthMap.set(row.month, existing);
  }

  return [...monthMap.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((row) => ({
      ...row,
      net: row.income - row.expense,
    }));
};

const getYearOverYearReport = (monthNumber = null) => {
  const month = Math.min(Math.max(Number(monthNumber) || new Date().getMonth() + 1, 1), 12);
  const monthKey = String(month).padStart(2, "0");

  const spending = all(
    `
      SELECT
        strftime('%Y', transaction_date) AS year,
        COALESCE(SUM(ABS(amount)), 0) AS spent
      FROM (${EXPENSE_LINES_SQL})
      WHERE strftime('%m', transaction_date) = ?
      GROUP BY year
      ORDER BY year ASC
    `,
    [monthKey]
  ).map((row) => ({
    year: row.year,
    spent: Number(row.spent) || 0,
  }));

  const income = all(
    `
      SELECT
        strftime('%Y', transaction_date) AS year,
        COALESCE(SUM(amount), 0) AS income
      FROM (${INCOME_LINES_SQL})
      WHERE strftime('%m', transaction_date) = ?
      GROUP BY year
      ORDER BY year ASC
    `,
    [monthKey]
  ).map((row) => ({
    year: row.year,
    income: Number(row.income) || 0,
  }));

  const yearMap = new Map();
  for (const row of spending) {
    yearMap.set(row.year, { year: row.year, spent: row.spent, income: 0 });
  }
  for (const row of income) {
    const existing = yearMap.get(row.year) ?? { year: row.year, spent: 0, income: 0 };
    existing.income = row.income;
    yearMap.set(row.year, existing);
  }

  return {
    month,
    month_key: monthKey,
    rows: [...yearMap.values()].sort((left, right) => left.year.localeCompare(right.year)),
  };
};

const getTaxCategorySummary = (year = null) => {
  const targetYear = year?.trim() || String(new Date().getFullYear());
  if (!/^\d{4}$/.test(targetYear)) {
    throw new Error("year must use YYYY format.");
  }

  const rows = all(
    `
      SELECT
        category_id,
        category_name,
        COALESCE(SUM(ABS(amount)), 0) AS total
      FROM (${EXPENSE_LINES_SQL})
      WHERE tax_deductible = 1
        AND strftime('%Y', transaction_date) = ?
      GROUP BY category_id, category_name
      ORDER BY total DESC, category_name ASC
    `,
    [targetYear]
  ).map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    total: Number(row.total) || 0,
  }));

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return {
    year: targetYear,
    rows,
    grand_total: grandTotal,
  };
};

const getCashFlowSankey = (month, accountId = null) => {
  const targetMonth = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw new Error("month must use YYYY-MM format.");
  }

  const resolvedAccountId =
    accountId === null || accountId === undefined || accountId === ""
      ? null
      : Number(accountId);
  if (resolvedAccountId !== null && !Number.isFinite(resolvedAccountId)) {
    throw new Error("account_id must be a number.");
  }

  const accountClause = resolvedAccountId !== null ? "AND account_id = ?" : "";
  const incomeParams =
    resolvedAccountId !== null ? [targetMonth, resolvedAccountId] : [targetMonth];
  const expenseParams =
    resolvedAccountId !== null ? [targetMonth, resolvedAccountId] : [targetMonth];

  const income = all(
    `
      SELECT
        category_id,
        category_name,
        COALESCE(SUM(amount), 0) AS total
      FROM (${INCOME_LINES_SQL})
      WHERE strftime('%Y-%m', transaction_date) = ?
        ${accountClause}
      GROUP BY category_id, category_name
      HAVING total > 0
      ORDER BY total DESC, category_name ASC
    `,
    incomeParams
  ).map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    total: Number(row.total) || 0,
  }));

  const expenses = all(
    `
      SELECT
        category_id,
        category_name,
        COALESCE(SUM(ABS(amount)), 0) AS total
      FROM (${EXPENSE_LINES_SQL})
      WHERE strftime('%Y-%m', transaction_date) = ?
        ${accountClause}
      GROUP BY category_id, category_name
      HAVING total > 0
      ORDER BY total DESC, category_name ASC
    `,
    expenseParams
  ).map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    total: Number(row.total) || 0,
  }));

  return {
    month: targetMonth,
    account_id: resolvedAccountId,
    income,
    expenses,
    income_total: income.reduce((sum, row) => sum + row.total, 0),
    expense_total: expenses.reduce((sum, row) => sum + row.total, 0),
  };
};

const GEMINI_RECEIPT_MODEL = "gemini-3.1-flash-lite";

const normalizeReceiptImagePayload = (imageBase64, mimeType) => {
  let data = String(imageBase64 || "").trim();
  let mime = String(mimeType || "").trim().toLowerCase();

  const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase();
    data = dataUrlMatch[2];
  }

  data = data.replace(/\s+/g, "");
  if (!data) {
    throw new Error("image_base64 is required.");
  }

  if (!mime) {
    mime = "image/jpeg";
  }

  if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(mime)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }

  // Rough size guard (~8MB decoded).
  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes > 8 * 1024 * 1024) {
    throw new Error("Receipt image is too large. Please use a photo under 8MB.");
  }

  return { data, mimeType: mime };
};

const findExpenseCategoryByName = (suggestedName) => {
  const needle = String(suggestedName || "").trim().toLowerCase();
  if (!needle) {
    return null;
  }

  const categories = all(
    `
      SELECT c.id, c.name
      FROM ${CATEGORIES_TABLE} c
      JOIN ${CATEGORY_TYPES_TABLE} ct ON ct.id = c.type_id
      WHERE LOWER(ct.name) NOT IN ('income', 'transfer')
      ORDER BY c.name ASC
    `
  );

  const exact = categories.find((row) => String(row.name).toLowerCase() === needle);
  if (exact) {
    return exact;
  }

  const partial = categories.find(
    (row) =>
      String(row.name).toLowerCase().includes(needle) ||
      needle.includes(String(row.name).toLowerCase())
  );
  return partial ?? null;
};

const scanReceiptFromImage = async ({ image_base64, mime_type } = {}) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Receipt scanning is not configured. Add GEMINI_API_KEY to your .env file and restart the server."
    );
  }

  const { data, mimeType } = normalizeReceiptImagePayload(image_base64, mime_type);

  const prompt = [
    "You are extracting data from a purchase receipt photo for a personal budget app.",
    "Return ONLY valid JSON with these keys:",
    '{',
    '  "merchant": string,',
    '  "date": "YYYY-MM-DD" or null,',
    '  "total": number (positive grand total paid),',
    '  "currency": string (e.g. USD),',
    '  "suggested_category": string (short expense category guess like Groceries, Dining, Gas, Shopping),',
    '  "confidence": number between 0 and 1,',
    '  "notes": string',
    "}",
    "Use the receipt total including tax if shown. If the date is missing, use null.",
    "Do not invent a total; if unreadable set total to null and lower confidence.",
  ].join("\n");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_RECEIPT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.status ||
      `Gemini request failed (${response.status}).`;
    throw new Error(message);
  }

  const text =
    payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty receipt response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const fenced = text.match(/\{[\s\S]*\}/);
    if (!fenced) {
      throw new Error("Could not parse receipt data from Gemini.");
    }
    parsed = JSON.parse(fenced[0]);
  }

  const merchant = String(parsed.merchant || "").trim();
  const notes = String(parsed.notes || "").trim();
  const suggestedCategory = String(parsed.suggested_category || "").trim();
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1);

  let transactionDate = String(parsed.date || "").trim();
  if (transactionDate && !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    const asDate = new Date(transactionDate);
    transactionDate = Number.isNaN(asDate.getTime())
      ? ""
      : asDate.toISOString().slice(0, 10);
  }
  if (!transactionDate) {
    transactionDate = new Date().toISOString().slice(0, 10);
  }

  const total = Number(parsed.total);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Could not read a valid total from this receipt. Try a clearer photo.");
  }

  const matchedCategory = findExpenseCategoryByName(suggestedCategory);
  const description = merchant || notes || "Receipt purchase";

  return {
    draft: {
      amount: Number((-Math.abs(total)).toFixed(2)),
      description,
      transaction_date: transactionDate,
      category_id: matchedCategory ? String(matchedCategory.id) : null,
      category_name: matchedCategory?.name ?? suggestedCategory ?? null,
      merchant: merchant || null,
      confidence,
      currency: String(parsed.currency || "USD").trim() || "USD",
      notes: notes || null,
    },
  };
};

const refreshAccountBalances = (accountIds, userId = null) => {
  const uniqueIds = [
    ...new Set(
      accountIds
        .filter((accountId) => accountId !== null && accountId !== undefined && accountId !== "")
        .map(Number)
        .filter((accountId) => Number.isFinite(accountId))
    ),
  ];

  for (const accountId of uniqueIds) {
    syncAccountBalanceFromLedger(accountId, userId);
  }
};

const TASK_STATUSES = ["inbox", "todo", "in_progress", "done"];

const assertTaskAccess = (user) => {
  if (!user) {
    throw new Error("Unauthorized.");
  }
  if (!userCanAccessApp(user, "tasks")) {
    throw new Error("You do not have access to Tasks.");
  }
};

const assertBudgetAccess = (user) => {
  if (!user) {
    throw new Error("Unauthorized.");
  }
  if (!userCanAccessApp(user, "budget")) {
    throw new Error("You do not have access to Budget.");
  }
};

const getTaskTagsForTaskIds = (taskIds) => {
  if (!taskIds.length) {
    return new Map();
  }

  const placeholders = taskIds.map(() => "?").join(", ");
  const rows = all(
    `
      SELECT l.task_id, t.id, t.name, t.color
      FROM ${TASK_TAG_LINKS_TABLE} l
      JOIN ${TASK_TAGS_TABLE} t ON t.id = l.tag_id
      WHERE l.task_id IN (${placeholders})
      ORDER BY t.name ASC
    `,
    taskIds
  );

  const map = new Map();
  for (const row of rows) {
    const current = map.get(row.task_id) ?? [];
    current.push({ id: row.id, name: row.name, color: row.color });
    map.set(row.task_id, current);
  }
  return map;
};

const getSubtasksForTaskIds = (taskIds) => {
  if (!taskIds.length) {
    return new Map();
  }

  const placeholders = taskIds.map(() => "?").join(", ");
  const rows = all(
    `
      SELECT id, task_id, title, completed, sort_order
      FROM ${TASK_SUBTASKS_TABLE}
      WHERE task_id IN (${placeholders})
      ORDER BY sort_order ASC, id ASC
    `,
    taskIds
  );

  const map = new Map();
  for (const row of rows) {
    const current = map.get(row.task_id) ?? [];
    current.push({
      id: row.id,
      title: row.title,
      completed: Boolean(row.completed),
      sort_order: row.sort_order,
    });
    map.set(row.task_id, current);
  }
  return map;
};

const getPomodoroCountsForTaskIds = (taskIds, userId) => {
  if (!taskIds.length) {
    return new Map();
  }

  const placeholders = taskIds.map(() => "?").join(", ");
  const rows = all(
    `
      SELECT task_id, COUNT(*) AS count, COALESCE(SUM(duration_seconds), 0) AS total_seconds
      FROM ${POMODORO_SESSIONS_TABLE}
      WHERE user_id = ?
        AND task_id IN (${placeholders})
        AND session_type = 'work'
        AND completed = 1
      GROUP BY task_id
    `,
    [userId, ...taskIds]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(row.task_id, {
      pomodoro_count: Number(row.count) || 0,
      focus_seconds: Number(row.total_seconds) || 0,
    });
  }
  return map;
};

const enrichTasks = (rows, userId) => {
  const taskIds = rows.map((row) => row.id);
  const tagsByTask = getTaskTagsForTaskIds(taskIds);
  const subtasksByTask = getSubtasksForTaskIds(taskIds);
  const pomodorosByTask = getPomodoroCountsForTaskIds(taskIds, userId);

  return rows.map((row) => {
    const pomodoro = pomodorosByTask.get(row.id) ?? { pomodoro_count: 0, focus_seconds: 0 };
    return {
      ...row,
      priority: Number(row.priority) || 0,
      project_id: row.project_id ?? null,
      tags: tagsByTask.get(row.id) ?? [],
      subtasks: subtasksByTask.get(row.id) ?? [],
      pomodoro_count: pomodoro.pomodoro_count,
      focus_seconds: pomodoro.focus_seconds,
    };
  });
};

const getOwnedTask = (taskId, userId) => {
  const row = all(
    `SELECT * FROM ${TASKS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
    [taskId, userId]
  )[0];
  if (!row) {
    throw new Error("Task not found.");
  }
  return row;
};

const replaceTaskTags = (taskId, tagIds, userId) => {
  run(`DELETE FROM ${TASK_TAG_LINKS_TABLE} WHERE task_id = ?`, [taskId]);
  for (const tagId of tagIds) {
    const tag = all(
      `SELECT id FROM ${TASK_TAGS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
      [tagId, userId]
    )[0];
    if (tag) {
      run(`INSERT OR IGNORE INTO ${TASK_TAG_LINKS_TABLE} (task_id, tag_id) VALUES (?, ?)`, [
        taskId,
        tagId,
      ]);
    }
  }
};

const replaceTaskSubtasks = (taskId, subtasks) => {
  run(`DELETE FROM ${TASK_SUBTASKS_TABLE} WHERE task_id = ?`, [taskId]);
  subtasks.forEach((subtask, index) => {
    const title = String(subtask.title ?? "").trim();
    if (!title) return;
    insertAuditedRow(
      TASK_SUBTASKS_TABLE,
      {
        task_id: taskId,
        title,
        completed: subtask.completed ? 1 : 0,
        sort_order: subtask.sort_order ?? index,
      },
      null
    );
  });
};

const buildTaskListQuery = (userId, filters = {}) => {
  const clauses = ["t.user_id = ?"];
  const params = [userId];
  const view = filters.view ?? "all";

  if (view === "today") {
    const today = new Date().toISOString().slice(0, 10);
    clauses.push("(t.due_date <= ? AND t.status != 'done') OR t.status = 'in_progress'");
    params.push(today);
  } else if (view === "upcoming") {
    const today = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    clauses.push("t.due_date BETWEEN ? AND ? AND t.status != 'done'");
    params.push(today, weekAhead);
  } else if (view === "inbox") {
    clauses.push("t.status = 'inbox'");
  } else if (view === "done") {
    clauses.push("t.status = 'done'");
  } else if (view === "all") {
    clauses.push("t.status != 'done'");
  }

  if (filters.project_id) {
    clauses.push("t.project_id = ?");
    params.push(Number(filters.project_id));
  }

  if (filters.status && TASK_STATUSES.includes(filters.status)) {
    clauses.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters.priority !== undefined && filters.priority !== null && filters.priority !== "") {
    clauses.push("t.priority = ?");
    params.push(Number(filters.priority));
  }

  if (filters.tag_id) {
    clauses.push(
      `EXISTS (SELECT 1 FROM ${TASK_TAG_LINKS_TABLE} l WHERE l.task_id = t.id AND l.tag_id = ?)`
    );
    params.push(Number(filters.tag_id));
  }

  const search = filters.search?.trim();
  if (search) {
    clauses.push("(t.title LIKE ? OR t.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = all(
    `
      SELECT
        t.*,
        p.name AS project_name,
        p.color AS project_color
      FROM ${TASKS_TABLE} t
      LEFT JOIN ${TASK_PROJECTS_TABLE} p ON p.id = t.project_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY
        CASE t.status
          WHEN 'in_progress' THEN 0
          WHEN 'todo' THEN 1
          WHEN 'inbox' THEN 2
          WHEN 'done' THEN 3
          ELSE 4
        END,
        t.priority DESC,
        COALESCE(t.due_date, '9999-12-31') ASC,
        t.sort_order ASC,
        t.id DESC
    `,
    params
  );

  return enrichTasks(rows, userId);
};

const getTaskSummary = (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  const counts = all(
    `
      SELECT
        SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
        SUM(CASE WHEN due_date = ? AND status != 'done' THEN 1 ELSE 0 END) AS due_today_count,
        SUM(CASE WHEN due_date < ? AND status != 'done' THEN 1 ELSE 0 END) AS overdue_count
      FROM ${TASKS_TABLE}
      WHERE user_id = ?
    `,
    [today, today, userId]
  )[0];

  const focusToday = all(
    `
      SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds
      FROM ${POMODORO_SESSIONS_TABLE}
      WHERE user_id = ?
        AND session_type = 'work'
        AND completed = 1
        AND substr(started_at, 1, 10) = ?
    `,
    [userId, today]
  )[0];

  const projectCount = all(
    `SELECT COUNT(*) AS count FROM ${TASK_PROJECTS_TABLE} WHERE user_id = ? AND is_archived = 0`,
    [userId]
  )[0];

  return {
    open_count: Number(counts.open_count) || 0,
    done_count: Number(counts.done_count) || 0,
    in_progress_count: Number(counts.in_progress_count) || 0,
    due_today_count: Number(counts.due_today_count) || 0,
    overdue_count: Number(counts.overdue_count) || 0,
    focus_seconds_today: Number(focusToday.total_seconds) || 0,
    project_count: Number(projectCount.count) || 0,
  };
};

const getTaskProjects = (userId) =>
  all(
    `
      SELECT
        p.*,
        (
          SELECT COUNT(*)
          FROM ${TASKS_TABLE} t
          WHERE t.project_id = p.id AND t.status != 'done'
        ) AS open_task_count
      FROM ${TASK_PROJECTS_TABLE} p
      WHERE p.user_id = ?
      ORDER BY p.is_archived ASC, p.sort_order ASC, p.name ASC
    `,
    [userId]
  );

const getTaskTags = (userId) =>
  all(
    `
      SELECT t.*, (
        SELECT COUNT(*)
        FROM ${TASK_TAG_LINKS_TABLE} l
        JOIN ${TASKS_TABLE} tk ON tk.id = l.task_id
        WHERE l.tag_id = t.id AND tk.user_id = ?
      ) AS task_count
      FROM ${TASK_TAGS_TABLE} t
      WHERE t.user_id = ?
      ORDER BY t.name ASC
    `,
    [userId, userId]
  );

const getTaskById = (taskId, userId) => {
  const row = all(
    `
      SELECT
        t.*,
        p.name AS project_name,
        p.color AS project_color
      FROM ${TASKS_TABLE} t
      LEFT JOIN ${TASK_PROJECTS_TABLE} p ON p.id = t.project_id
      WHERE t.id = ? AND t.user_id = ?
      LIMIT 1
    `,
    [taskId, userId]
  )[0];

  if (!row) {
    throw new Error("Task not found.");
  }

  return enrichTasks([row], userId)[0];
};

const createTaskRecord = (payload, userId) => {
  const title = String(payload.title ?? "").trim();
  if (!title) {
    throw new Error("Task title is required.");
  }

  const status = TASK_STATUSES.includes(payload.status) ? payload.status : "todo";
  const priority = Number(payload.priority);
  const normalizedPriority = Number.isFinite(priority) ? Math.max(0, Math.min(4, priority)) : 0;

  const result = insertAuditedRow(
    TASKS_TABLE,
    {
      user_id: userId,
      project_id: payload.project_id ? Number(payload.project_id) : null,
      title,
      description: payload.description?.trim() || null,
      status,
      priority: normalizedPriority,
      due_date: payload.due_date || null,
      due_time: payload.due_time || null,
      estimated_minutes: payload.estimated_minutes ? Number(payload.estimated_minutes) : null,
      completed_at: status === "done" ? auditTimestamp() : null,
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
      recurrence_rule: payload.recurrence_rule?.trim() || null,
    },
    userId
  );

  const taskId = result.lastID;
  if (Array.isArray(payload.tag_ids)) {
    replaceTaskTags(taskId, payload.tag_ids.map(Number), userId);
  }
  if (Array.isArray(payload.subtasks)) {
    replaceTaskSubtasks(taskId, payload.subtasks);
  }

  return getTaskById(taskId, userId);
};

const updateTaskRecord = (taskId, payload, userId) => {
  getOwnedTask(taskId, userId);

  const updates = {};
  if (payload.title !== undefined) {
    const title = String(payload.title ?? "").trim();
    if (!title) throw new Error("Task title is required.");
    updates.title = title;
  }
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.project_id !== undefined) {
    updates.project_id = payload.project_id ? Number(payload.project_id) : null;
  }
  if (payload.status !== undefined) {
    if (!TASK_STATUSES.includes(payload.status)) {
      throw new Error("Invalid task status.");
    }
    updates.status = payload.status;
    updates.completed_at = payload.status === "done" ? auditTimestamp() : null;
  }
  if (payload.priority !== undefined) {
    const priority = Number(payload.priority);
    updates.priority = Number.isFinite(priority) ? Math.max(0, Math.min(4, priority)) : 0;
  }
  if (payload.due_date !== undefined) updates.due_date = payload.due_date || null;
  if (payload.due_time !== undefined) updates.due_time = payload.due_time || null;
  if (payload.estimated_minutes !== undefined) {
    updates.estimated_minutes = payload.estimated_minutes ? Number(payload.estimated_minutes) : null;
  }
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order) || 0;
  if (payload.recurrence_rule !== undefined) {
    updates.recurrence_rule = payload.recurrence_rule?.trim() || null;
  }

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(TASKS_TABLE, updates, "id = ?", [taskId], userId);
  }

  if (payload.tag_ids !== undefined && Array.isArray(payload.tag_ids)) {
    replaceTaskTags(taskId, payload.tag_ids.map(Number), userId);
  }
  if (payload.subtasks !== undefined && Array.isArray(payload.subtasks)) {
    replaceTaskSubtasks(taskId, payload.subtasks);
  }

  return getTaskById(taskId, userId);
};

const deleteTaskRecord = (taskId, userId) => {
  getOwnedTask(taskId, userId);
  run(`DELETE FROM ${TASK_TAG_LINKS_TABLE} WHERE task_id = ?`, [taskId]);
  run(`DELETE FROM ${TASK_SUBTASKS_TABLE} WHERE task_id = ?`, [taskId]);
  run(`DELETE FROM ${TASKS_TABLE} WHERE id = ? AND user_id = ?`, [taskId, userId]);
  return { ok: true };
};

const createTaskProject = (payload, userId) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Project name is required.");

  const result = insertAuditedRow(
    TASK_PROJECTS_TABLE,
    {
      user_id: userId,
      name,
      description: payload.description?.trim() || null,
      color: payload.color?.trim() || "#6366f1",
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
      is_archived: payload.is_archived ? 1 : 0,
    },
    userId
  );

  return all(`SELECT * FROM ${TASK_PROJECTS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const updateTaskProject = (projectId, payload, userId) => {
  const project = all(
    `SELECT * FROM ${TASK_PROJECTS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
    [projectId, userId]
  )[0];
  if (!project) throw new Error("Project not found.");

  const updates = {};
  if (payload.name !== undefined) {
    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("Project name is required.");
    updates.name = name;
  }
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.color !== undefined) updates.color = payload.color?.trim() || "#6366f1";
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order) || 0;
  if (payload.is_archived !== undefined) updates.is_archived = payload.is_archived ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(TASK_PROJECTS_TABLE, updates, "id = ?", [projectId], userId);
  }

  return all(`SELECT * FROM ${TASK_PROJECTS_TABLE} WHERE id = ? LIMIT 1`, [projectId])[0];
};

const createTaskTag = (payload, userId) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Tag name is required.");

  const result = insertAuditedRow(
    TASK_TAGS_TABLE,
    {
      user_id: userId,
      name,
      color: payload.color?.trim() || "#64748b",
    },
    userId
  );

  return all(`SELECT * FROM ${TASK_TAGS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const getActivePomodoroSession = (userId) => {
  const row = all(
    `
      SELECT s.*, t.title AS task_title
      FROM ${POMODORO_SESSIONS_TABLE} s
      LEFT JOIN ${TASKS_TABLE} t ON t.id = s.task_id
      WHERE s.user_id = ? AND s.completed = 0
      ORDER BY s.id DESC
      LIMIT 1
    `,
    [userId]
  )[0];

  return row ?? null;
};

const startPomodoroSession = (payload, userId) => {
  const active = getActivePomodoroSession(userId);
  if (active) {
    throw new Error("A focus session is already in progress.");
  }

  const sessionType = payload.session_type === "break" ? "break" : "work";
  const taskId = payload.task_id ? Number(payload.task_id) : null;
  if (taskId) {
    getOwnedTask(taskId, userId);
  }

  const result = insertAuditedRow(
    POMODORO_SESSIONS_TABLE,
    {
      user_id: userId,
      task_id: taskId,
      session_type: sessionType,
      started_at: auditTimestamp(),
      completed: 0,
    },
    userId
  );

  return all(`SELECT * FROM ${POMODORO_SESSIONS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const completePomodoroSession = (sessionId, payload, userId) => {
  const session = all(
    `SELECT * FROM ${POMODORO_SESSIONS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
    [sessionId, userId]
  )[0];
  if (!session) throw new Error("Focus session not found.");
  if (session.completed) throw new Error("Focus session is already completed.");

  const endedAt = auditTimestamp();
  const startedMs = Date.parse(session.started_at);
  const endedMs = Date.parse(endedAt);
  const durationSeconds =
    payload.duration_seconds !== undefined
      ? Number(payload.duration_seconds)
      : Number.isFinite(startedMs) && Number.isFinite(endedMs)
        ? Math.max(0, Math.round((endedMs - startedMs) / 1000))
        : null;

  updateAuditedRow(
    POMODORO_SESSIONS_TABLE,
    {
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      completed: 1,
    },
    "id = ?",
    [sessionId],
    userId
  );

  return all(`SELECT * FROM ${POMODORO_SESSIONS_TABLE} WHERE id = ? LIMIT 1`, [sessionId])[0];
};

const cancelPomodoroSession = (sessionId, userId) => {
  const session = all(
    `SELECT * FROM ${POMODORO_SESSIONS_TABLE} WHERE id = ? AND user_id = ? AND completed = 0 LIMIT 1`,
    [sessionId, userId]
  )[0];
  if (!session) throw new Error("Active focus session not found.");

  run(`DELETE FROM ${POMODORO_SESSIONS_TABLE} WHERE id = ?`, [sessionId]);
  return { ok: true };
};

const getPomodoroStats = (userId, days = 7) => {
  const windowDays = Math.max(1, Math.min(90, Number(days) || 7));
  const startDate = new Date(Date.now() - (windowDays - 1) * 86400000)
    .toISOString()
    .slice(0, 10);

  const daily = all(
    `
      SELECT
        substr(started_at, 1, 10) AS day,
        COUNT(*) AS session_count,
        COALESCE(SUM(duration_seconds), 0) AS focus_seconds
      FROM ${POMODORO_SESSIONS_TABLE}
      WHERE user_id = ?
        AND session_type = 'work'
        AND completed = 1
        AND substr(started_at, 1, 10) >= ?
      GROUP BY substr(started_at, 1, 10)
      ORDER BY day ASC
    `,
    [userId, startDate]
  );

  const byTask = all(
    `
      SELECT
        s.task_id,
        t.title AS task_title,
        COUNT(*) AS session_count,
        COALESCE(SUM(s.duration_seconds), 0) AS focus_seconds
      FROM ${POMODORO_SESSIONS_TABLE} s
      LEFT JOIN ${TASKS_TABLE} t ON t.id = s.task_id
      WHERE s.user_id = ?
        AND s.session_type = 'work'
        AND s.completed = 1
        AND substr(s.started_at, 1, 10) >= ?
      GROUP BY s.task_id, t.title
      ORDER BY focus_seconds DESC, session_count DESC
      LIMIT 10
    `,
    [userId, startDate]
  );

  const totals = all(
    `
      SELECT
        COUNT(*) AS session_count,
        COALESCE(SUM(duration_seconds), 0) AS focus_seconds
      FROM ${POMODORO_SESSIONS_TABLE}
      WHERE user_id = ?
        AND session_type = 'work'
        AND completed = 1
        AND substr(started_at, 1, 10) >= ?
    `,
    [userId, startDate]
  )[0];

  return {
    days: windowDays,
    session_count: Number(totals.session_count) || 0,
    focus_seconds: Number(totals.focus_seconds) || 0,
    daily,
    by_task: byTask,
  };
};

const NOTE_TYPES = ["general", "meeting", "idea", "reference", "journal", "checklist"];

const stripHtmlPlain = (html = "") =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const assertNotesAccess = (user) => {
  if (!user) {
    throw new Error("Unauthorized.");
  }
  if (!userCanAccessApp(user, "notes")) {
    throw new Error("You do not have access to Notes.");
  }
};

const buildTopicTree = (topics, parentId = null) =>
  topics
    .filter((topic) => (topic.parent_topic_id ?? null) === parentId)
    .map((topic) => ({
      ...topic,
      subtopics: buildTopicTree(topics, topic.id),
    }));

const buildNoteOutlineTree = (allNotes, parentNoteId = null) =>
  allNotes
    .filter((note) => (note.parent_note_id ?? null) === parentNoteId)
    .sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        Number(a.sort_order) - Number(b.sort_order) ||
        a.title.localeCompare(b.title)
    )
    .map((note) => ({
      id: note.id,
      title: note.title,
      note_type: note.note_type,
      is_pinned: Boolean(note.is_pinned),
      notes: buildNoteOutlineTree(allNotes, note.id),
    }));

const attachNotesToTopics = (topics, allNotes) =>
  topics.map((topic) => ({
    ...topic,
    subtopics: attachNotesToTopics(topic.subtopics ?? [], allNotes),
    notes: buildNoteOutlineTree(
      allNotes.filter(
        (note) => note.topic_id === topic.id && (note.parent_note_id ?? null) === null
      )
    ),
  }));

const resolveNotePlacement = ({ topic_id, subject_id, notebook_id, userId }) => {
  if (topic_id) {
    const topic = all(
      `
        SELECT t.id, t.subject_id, s.notebook_id, nb.user_id
        FROM ${NOTE_TOPICS_TABLE} t
        JOIN ${NOTE_SUBJECTS_TABLE} s ON s.id = t.subject_id
        JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = s.notebook_id
        WHERE t.id = ?
        LIMIT 1
      `,
      [topic_id]
    )[0];
    if (!topic || topic.user_id !== userId) {
      throw new Error("Topic not found.");
    }
    return {
      topic_id: topic.id,
      subject_id: topic.subject_id,
      notebook_id: topic.notebook_id,
    };
  }

  if (subject_id) {
    const subject = all(
      `
        SELECT s.id, s.notebook_id, nb.user_id
        FROM ${NOTE_SUBJECTS_TABLE} s
        JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = s.notebook_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [subject_id]
    )[0];
    if (!subject || subject.user_id !== userId) {
      throw new Error("Subject not found.");
    }
    return { topic_id: null, subject_id: subject.id, notebook_id: subject.notebook_id };
  }

  if (notebook_id) {
    const notebook = all(
      `SELECT id, user_id FROM ${NOTEBOOKS_TABLE} WHERE id = ? LIMIT 1`,
      [notebook_id]
    )[0];
    if (!notebook || notebook.user_id !== userId) {
      throw new Error("Notebook not found.");
    }
    return { topic_id: null, subject_id: null, notebook_id: notebook.id };
  }

  return { topic_id: null, subject_id: null, notebook_id: null };
};

const getNotesTree = (userId) => {
  const allNotes = all(
    `
      SELECT id, notebook_id, subject_id, topic_id, parent_note_id, title, note_type, is_pinned, sort_order
      FROM ${NOTES_TABLE}
      WHERE user_id = ?
    `,
    [userId]
  );

  const notebooks = all(
    `
      SELECT *
      FROM ${NOTEBOOKS_TABLE}
      WHERE user_id = ? AND is_archived = 0
      ORDER BY sort_order ASC, name ASC
    `,
    [userId]
  );

  return notebooks.map((notebook) => {
    const subjects = all(
      `
        SELECT *
        FROM ${NOTE_SUBJECTS_TABLE}
        WHERE notebook_id = ?
        ORDER BY sort_order ASC, name ASC
      `,
      [notebook.id]
    );

    return {
      ...notebook,
      notes: buildNoteOutlineTree(
        allNotes.filter(
          (note) =>
            note.notebook_id === notebook.id &&
            (note.subject_id ?? null) === null &&
            (note.topic_id ?? null) === null &&
            (note.parent_note_id ?? null) === null
        )
      ),
      subjects: subjects.map((subject) => {
        const topics = all(
          `
            SELECT *
            FROM ${NOTE_TOPICS_TABLE}
            WHERE subject_id = ?
            ORDER BY sort_order ASC, name ASC
          `,
          [subject.id]
        );
        return {
          ...subject,
          notes: buildNoteOutlineTree(
            allNotes.filter(
              (note) =>
                note.subject_id === subject.id &&
                (note.topic_id ?? null) === null &&
                (note.parent_note_id ?? null) === null
            )
          ),
          topics: attachNotesToTopics(buildTopicTree(topics), allNotes),
        };
      }),
    };
  });
};

const enrichNotes = (rows, userId) => {
  if (!rows.length) return [];

  const noteIds = rows.map((row) => row.id);
  const subNoteCounts = all(
    `
      SELECT parent_note_id, COUNT(*) AS count
      FROM ${NOTES_TABLE}
      WHERE parent_note_id IN (${noteIds.map(() => "?").join(", ")})
      GROUP BY parent_note_id
    `,
    noteIds
  );
  const subCountMap = new Map(subNoteCounts.map((row) => [row.parent_note_id, Number(row.count)]));

  return rows.map((row) => ({
    ...row,
    is_pinned: Boolean(row.is_pinned),
    sub_note_count: subCountMap.get(row.id) ?? 0,
    task_title: row.task_id
      ? all(`SELECT title FROM ${TASKS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
          row.task_id,
          userId,
        ])[0]?.title ?? null
      : null,
    parent_note_title: row.parent_note_id
      ? all(`SELECT title FROM ${NOTES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
          row.parent_note_id,
          userId,
        ])[0]?.title ?? null
      : null,
  }));
};

const buildNotesListQuery = (userId, filters = {}) => {
  const clauses = ["n.user_id = ?"];
  const params = [userId];

  if (filters.notebook_id) {
    clauses.push("n.notebook_id = ?");
    params.push(Number(filters.notebook_id));
  }
  if (filters.subject_id) {
    clauses.push("n.subject_id = ?");
    params.push(Number(filters.subject_id));
  }
  if (filters.topic_id) {
    clauses.push("n.topic_id = ?");
    params.push(Number(filters.topic_id));
  }
  if (filters.parent_note_id) {
    clauses.push("n.parent_note_id = ?");
    params.push(Number(filters.parent_note_id));
  } else if (filters.top_level_only !== "0") {
    clauses.push("n.parent_note_id IS NULL");
  }
  if (filters.note_type && NOTE_TYPES.includes(filters.note_type)) {
    clauses.push("n.note_type = ?");
    params.push(filters.note_type);
  }
  if (filters.task_id) {
    clauses.push("n.task_id = ?");
    params.push(Number(filters.task_id));
  }
  if (filters.pinned === "1") {
    clauses.push("n.is_pinned = 1");
  }

  const search = filters.search?.trim();
  if (search) {
    clauses.push("(n.title LIKE ? OR n.content_plain LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const limit = filters.recent ? "LIMIT 30" : "";

  const rows = all(
    `
      SELECT
        n.*,
        nb.name AS notebook_name,
        ns.name AS subject_name,
        nt.name AS topic_name
      FROM ${NOTES_TABLE} n
      LEFT JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = n.notebook_id
      LEFT JOIN ${NOTE_SUBJECTS_TABLE} ns ON ns.id = n.subject_id
      LEFT JOIN ${NOTE_TOPICS_TABLE} nt ON nt.id = n.topic_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY n.is_pinned DESC, n.updated_on DESC, n.sort_order ASC, n.id DESC
      ${limit}
    `,
    params
  );

  return enrichNotes(rows, userId);
};

const getNoteById = (noteId, userId) => {
  const row = all(
    `
      SELECT
        n.*,
        nb.name AS notebook_name,
        ns.name AS subject_name,
        nt.name AS topic_name
      FROM ${NOTES_TABLE} n
      LEFT JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = n.notebook_id
      LEFT JOIN ${NOTE_SUBJECTS_TABLE} ns ON ns.id = n.subject_id
      LEFT JOIN ${NOTE_TOPICS_TABLE} nt ON nt.id = n.topic_id
      WHERE n.id = ? AND n.user_id = ?
      LIMIT 1
    `,
    [noteId, userId]
  )[0];

  if (!row) {
    throw new Error("Note not found.");
  }

  const note = enrichNotes([row], userId)[0];
  note.sub_notes = buildNotesListQuery(userId, {
    parent_note_id: noteId,
    top_level_only: "0",
  });
  return note;
};

const validateTaskLink = (taskId, userId) => {
  if (!taskId) return null;
  const task = all(`SELECT id FROM ${TASKS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
    taskId,
    userId,
  ])[0];
  if (!task) {
    throw new Error("Linked task not found.");
  }
  return task.id;
};

const validateParentNote = (parentNoteId, userId, currentNoteId = null) => {
  if (!parentNoteId) return null;
  if (currentNoteId && Number(parentNoteId) === Number(currentNoteId)) {
    throw new Error("A note cannot be its own parent.");
  }
  const parent = all(`SELECT id FROM ${NOTES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
    parentNoteId,
    userId,
  ])[0];
  if (!parent) {
    throw new Error("Parent note not found.");
  }
  return parent.id;
};

const createNoteRecord = (payload, userId) => {
  const title = String(payload.title ?? "").trim();
  if (!title) {
    throw new Error("Note title is required.");
  }

  const noteType = NOTE_TYPES.includes(payload.note_type) ? payload.note_type : "general";
  const placement = resolveNotePlacement({
    topic_id: payload.topic_id ? Number(payload.topic_id) : null,
    subject_id: payload.subject_id ? Number(payload.subject_id) : null,
    notebook_id: payload.notebook_id ? Number(payload.notebook_id) : null,
    userId,
  });
  const parentNoteId = validateParentNote(payload.parent_note_id, userId);
  const taskId = validateTaskLink(payload.task_id ? Number(payload.task_id) : null, userId);
  const contentHtml = payload.content_html ?? "";
  const contentPlain = stripHtmlPlain(contentHtml);
  const contentMode =
    payload.content_mode === "draw" || payload.content_mode === "text"
      ? payload.content_mode
      : "mixed";

  const result = insertAuditedRow(
    NOTES_TABLE,
    {
      user_id: userId,
      ...placement,
      parent_note_id: parentNoteId,
      task_id: taskId,
      note_type: noteType,
      title,
      content_html: contentHtml,
      content_plain: contentPlain,
      content_mode: contentMode,
      content_drawing: payload.content_drawing ?? null,
      show_grid: payload.show_grid ? 1 : 0,
      is_pinned: payload.is_pinned ? 1 : 0,
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
    },
    userId
  );

  return getNoteById(result.lastID, userId);
};

const updateNoteRecord = (noteId, payload, userId) => {
  const existing = all(`SELECT * FROM ${NOTES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
    noteId,
    userId,
  ])[0];
  if (!existing) {
    throw new Error("Note not found.");
  }

  const updates = {};
  if (payload.title !== undefined) {
    const title = String(payload.title ?? "").trim();
    if (!title) throw new Error("Note title is required.");
    updates.title = title;
  }
  if (payload.note_type !== undefined) {
    if (!NOTE_TYPES.includes(payload.note_type)) {
      throw new Error("Invalid note type.");
    }
    updates.note_type = payload.note_type;
  }
  if (
    payload.topic_id !== undefined ||
    payload.subject_id !== undefined ||
    payload.notebook_id !== undefined
  ) {
    const placement = resolveNotePlacement({
      topic_id:
        payload.topic_id !== undefined
          ? payload.topic_id
            ? Number(payload.topic_id)
            : null
          : existing.topic_id,
      subject_id:
        payload.subject_id !== undefined
          ? payload.subject_id
            ? Number(payload.subject_id)
            : null
          : existing.subject_id,
      notebook_id:
        payload.notebook_id !== undefined
          ? payload.notebook_id
            ? Number(payload.notebook_id)
            : null
          : existing.notebook_id,
      userId,
    });
    Object.assign(updates, placement);
  }
  if (payload.parent_note_id !== undefined) {
    updates.parent_note_id = validateParentNote(payload.parent_note_id, userId, noteId);
  }
  if (payload.task_id !== undefined) {
    updates.task_id = validateTaskLink(payload.task_id ? Number(payload.task_id) : null, userId);
  }
  if (payload.content_html !== undefined) {
    updates.content_html = payload.content_html ?? "";
    updates.content_plain = stripHtmlPlain(updates.content_html);
  }
  if (payload.content_mode !== undefined) {
    updates.content_mode =
      payload.content_mode === "draw" || payload.content_mode === "text"
        ? payload.content_mode
        : "mixed";
  }
  if (payload.content_drawing !== undefined) {
    updates.content_drawing = payload.content_drawing ?? null;
  }
  if (payload.show_grid !== undefined) {
    updates.show_grid = payload.show_grid ? 1 : 0;
  }
  if (payload.is_pinned !== undefined) {
    updates.is_pinned = payload.is_pinned ? 1 : 0;
  }
  if (payload.sort_order !== undefined) {
    updates.sort_order = Number(payload.sort_order) || 0;
  }

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(NOTES_TABLE, updates, "id = ?", [noteId], userId);
  }

  return getNoteById(noteId, userId);
};

const deleteNoteRecord = (noteId, userId) => {
  const note = all(`SELECT id FROM ${NOTES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`, [
    noteId,
    userId,
  ])[0];
  if (!note) throw new Error("Note not found.");

  const childIds = all(`SELECT id FROM ${NOTES_TABLE} WHERE parent_note_id = ?`, [noteId]).map(
    (row) => row.id
  );
  for (const childId of childIds) {
    deleteNoteRecord(childId, userId);
  }

  run(`DELETE FROM ${NOTES_TABLE} WHERE id = ? AND user_id = ?`, [noteId, userId]);
  return { ok: true };
};

const createNotebookRecord = (payload, userId) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Notebook name is required.");

  const result = insertAuditedRow(
    NOTEBOOKS_TABLE,
    {
      user_id: userId,
      name,
      description: payload.description?.trim() || null,
      color: payload.color?.trim() || "#0f766e",
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
      is_archived: payload.is_archived ? 1 : 0,
    },
    userId
  );

  return all(`SELECT * FROM ${NOTEBOOKS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const updateNotebookRecord = (notebookId, payload, userId) => {
  const notebook = all(
    `SELECT * FROM ${NOTEBOOKS_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
    [notebookId, userId]
  )[0];
  if (!notebook) throw new Error("Notebook not found.");

  const updates = {};
  if (payload.name !== undefined) {
    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("Notebook name is required.");
    updates.name = name;
  }
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.color !== undefined) updates.color = payload.color?.trim() || "#0f766e";
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order) || 0;
  if (payload.is_archived !== undefined) updates.is_archived = payload.is_archived ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(NOTEBOOKS_TABLE, updates, "id = ?", [notebookId], userId);
  }

  return all(`SELECT * FROM ${NOTEBOOKS_TABLE} WHERE id = ? LIMIT 1`, [notebookId])[0];
};

const createSubjectRecord = (payload, userId) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Subject name is required.");
  if (!payload.notebook_id) throw new Error("notebook_id is required.");

  resolveNotePlacement({
    notebook_id: Number(payload.notebook_id),
    userId,
  });

  const result = insertAuditedRow(
    NOTE_SUBJECTS_TABLE,
    {
      notebook_id: Number(payload.notebook_id),
      name,
      description: payload.description?.trim() || null,
      color: payload.color?.trim() || "#14b8a6",
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
    },
    userId
  );

  return all(`SELECT * FROM ${NOTE_SUBJECTS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const updateSubjectRecord = (subjectId, payload, userId) => {
  const subject = all(
    `
      SELECT s.*, nb.user_id
      FROM ${NOTE_SUBJECTS_TABLE} s
      JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = s.notebook_id
      WHERE s.id = ?
      LIMIT 1
    `,
    [subjectId]
  )[0];
  if (!subject || subject.user_id !== userId) throw new Error("Subject not found.");

  const updates = {};
  if (payload.name !== undefined) {
    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("Subject name is required.");
    updates.name = name;
  }
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.color !== undefined) updates.color = payload.color?.trim() || "#14b8a6";
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order) || 0;

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(NOTE_SUBJECTS_TABLE, updates, "id = ?", [subjectId], userId);
  }

  return all(`SELECT * FROM ${NOTE_SUBJECTS_TABLE} WHERE id = ? LIMIT 1`, [subjectId])[0];
};

const createTopicRecord = (payload, userId) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Topic name is required.");
  if (!payload.subject_id) throw new Error("subject_id is required.");

  resolveNotePlacement({
    subject_id: Number(payload.subject_id),
    userId,
  });

  if (payload.parent_topic_id) {
    const parentTopic = all(
      `
        SELECT t.id, s.notebook_id, nb.user_id
        FROM ${NOTE_TOPICS_TABLE} t
        JOIN ${NOTE_SUBJECTS_TABLE} s ON s.id = t.subject_id
        JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = s.notebook_id
        WHERE t.id = ? AND t.subject_id = ?
        LIMIT 1
      `,
      [payload.parent_topic_id, payload.subject_id]
    )[0];
    if (!parentTopic || parentTopic.user_id !== userId) {
      throw new Error("Parent topic not found.");
    }
  }

  const result = insertAuditedRow(
    NOTE_TOPICS_TABLE,
    {
      subject_id: Number(payload.subject_id),
      parent_topic_id: payload.parent_topic_id ? Number(payload.parent_topic_id) : null,
      name,
      description: payload.description?.trim() || null,
      sort_order: payload.sort_order ? Number(payload.sort_order) : 0,
    },
    userId
  );

  return all(`SELECT * FROM ${NOTE_TOPICS_TABLE} WHERE id = ? LIMIT 1`, [result.lastID])[0];
};

const updateTopicRecord = (topicId, payload, userId) => {
  const topic = all(
    `
      SELECT t.*, nb.user_id
      FROM ${NOTE_TOPICS_TABLE} t
      JOIN ${NOTE_SUBJECTS_TABLE} s ON s.id = t.subject_id
      JOIN ${NOTEBOOKS_TABLE} nb ON nb.id = s.notebook_id
      WHERE t.id = ?
      LIMIT 1
    `,
    [topicId]
  )[0];
  if (!topic || topic.user_id !== userId) throw new Error("Topic not found.");

  const updates = {};
  if (payload.name !== undefined) {
    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("Topic name is required.");
    updates.name = name;
  }
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order) || 0;

  if (Object.keys(updates).length > 0) {
    updateAuditedRow(NOTE_TOPICS_TABLE, updates, "id = ?", [topicId], userId);
  }

  return all(`SELECT * FROM ${NOTE_TOPICS_TABLE} WHERE id = ? LIMIT 1`, [topicId])[0];
};

const getNotesSummary = (userId) => {
  const counts = all(
    `
      SELECT
        (SELECT COUNT(*) FROM ${NOTEBOOKS_TABLE} WHERE user_id = ? AND is_archived = 0) AS notebook_count,
        (SELECT COUNT(*) FROM ${NOTES_TABLE} WHERE user_id = ?) AS note_count,
        (SELECT COUNT(*) FROM ${NOTES_TABLE} WHERE user_id = ? AND is_pinned = 1) AS pinned_count
    `,
    [userId, userId, userId]
  )[0];

  return {
    notebook_count: Number(counts.notebook_count) || 0,
    note_count: Number(counts.note_count) || 0,
    pinned_count: Number(counts.pinned_count) || 0,
  };
};

seedNavigation();
seedCategoryFinance();
captureNetWorthSnapshot();

export function sqliteApiPlugin() {
  return {
    name: "sqlite-api-plugin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }

        try {
          const requestPath = (req.url || "").split("?")[0];
          const isPublicApi =
            (req.method === "GET" && requestPath === "/api/health") ||
            (req.method === "GET" && requestPath === "/api/version") ||
            (req.method === "POST" && requestPath === "/api/auth/login") ||
            (req.method === "POST" && requestPath === "/api/auth/logout") ||
            (req.method === "POST" && requestPath === "/api/logs");

          if (req.method === "GET" && requestPath === "/api/health") {
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "GET" && requestPath === "/api/version") {
            const url = new URL(req.url || "/api/version", "http://localhost");
            const force = url.searchParams.get("refresh") === "1";
            const result = await fetchLatestGitHubRelease({ force });
            json(res, 200, result.payload);
            return;
          }

          // ── Auth endpoints ──────────────────────────────────────────────
          if (req.method === "POST" && requestPath === "/api/auth/login") {
            try {
              assertLoginNotRateLimited(req);
            } catch (rateError) {
              sendApiError(res, req, 429, rateError, {
                code: "RATE_LIMITED",
                function_name: "assertLoginNotRateLimited",
              });
              return;
            }

            const { username, password } = await readBody(req);
            if (!username || !password) {
              sendApiError(res, req, 400, "Username and password are required.", {
                function_name: "login",
                data: { username: username || null },
              });
              return;
            }
            const user = all(
              `SELECT id, username, password, display_name, role FROM ${USERS_TABLE} WHERE username = ? LIMIT 1`,
              [username]
            )[0];
            if (!user || !verifyPassword(password, user.password)) {
              recordLoginFailure(req);
              sendApiError(res, req, 401, "Invalid username or password.", {
                function_name: "login",
                data: { username: String(username).slice(0, 100), user_found: Boolean(user) },
              });
              return;
            }

            clearLoginFailures(req);

            // Upgrade legacy SHA-256 hashes to scrypt on successful login.
            if (!String(user.password).startsWith("scrypt$")) {
              updateAuditedRow(
                USERS_TABLE,
                { password: hashPassword(password) },
                "id = ?",
                [user.id],
                user.id
              );
            }

            const roles = getUserRoles(user.id);
            const sessionUser = {
              id: user.id,
              username: user.username,
              display_name: user.display_name,
              roles,
            };
            const mustChangePassword =
              user.username === "admin" && String(password) === "admin";
            const token = createSession(sessionUser, { mustChangePassword });
            json(res, 200, {
              token,
              user: { ...sessionUser, must_change_password: mustChangePassword },
            });
            return;
          }

          if (!isPublicApi) {
            const session = requireAuthUser(req, res);
            if (!session) return;

            if (session.mustChangePassword) {
              const allowedWhileForced =
                requestPath === "/api/auth/me" ||
                requestPath === "/api/auth/change-password";
              if (!allowedWhileForced) {
                sendApiError(res, req, 403, "You must change the default admin password before continuing.", {
                  code: "MUST_CHANGE_PASSWORD",
                  function_name: "mustChangePasswordGate",
                  user: session.user,
                });
                return;
              }
            }
          }

          if (req.method === "GET" && requestPath === "/api/auth/me") {
            const session = getSessionRecord(req);
            if (!session) {
              json(res, 401, {
                error: "Session expired. Please sign in again.",
                code: "SESSION_EXPIRED",
              });
              return;
            }
            const stored = sessions.get(session.token);
            json(res, 200, {
              user: {
                ...session.user,
                must_change_password: Boolean(session.mustChangePassword),
                ide_elevated_until: getIdeElevatedUntil(stored),
              },
            });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/auth/logout") {
            const token = getTokenFromHeader(req);
            if (token) sessions.delete(token);
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/auth/change-password") {
            const session = requireAuthUser(req, res);
            if (!session) return;

            const { currentPassword, newPassword } = await readBody(req);
            if (!currentPassword || !newPassword) {
              json(res, 400, { error: "Current and new passwords are required." });
              return;
            }
            if (String(newPassword).length < 8) {
              json(res, 400, { error: "New password must be at least 8 characters." });
              return;
            }
            if (String(newPassword) === "admin") {
              json(res, 400, { error: "Choose a password other than the default." });
              return;
            }

            const row = all(
              `SELECT id, password FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
              [session.user.id]
            )[0];
            if (!row || !verifyPassword(currentPassword, row.password)) {
              json(res, 400, { error: "Current password is incorrect." });
              return;
            }

            updateAuditedRow(
              USERS_TABLE,
              { password: hashPassword(newPassword) },
              "id = ?",
              [session.user.id],
              session.user.id
            );

            session.mustChangePassword = false;
            sessions.set(session.token, session);
            json(res, 200, { ok: true });
            return;
          }

          // ── User management endpoints ───────────────────────────────────
          if (req.method === "GET" && requestPath === "/api/auth/users") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const rows = all(`SELECT id, username, display_name FROM ${USERS_TABLE} ORDER BY id`);
            const users = rows.map((u) => ({ ...u, roles: getUserRoles(u.id) }));
            json(res, 200, { users });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/auth/users") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const { username, password, display_name } = await readBody(req);
            if (!username || !password) {
              json(res, 400, { error: "Username and password are required." });
              return;
            }
            if (String(password).length < 8) {
              json(res, 400, { error: "Password must be at least 8 characters." });
              return;
            }
            const result = insertAuditedRow(
              USERS_TABLE,
              {
                username: username.trim(),
                password: hashPassword(password),
                display_name: display_name?.trim() || null,
              },
              actingUser.id
            );
            json(res, 200, { id: result.lastID });
            return;
          }

          if (req.method === "PUT" && req.url.match(/^\/api\/auth\/users\/\d+\/roles$/)) {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const id = Number(req.url.split("/")[4]);
            const { roles } = await readBody(req);
            try {
              setUserRoles(id, roles, actingUser.id);
            } catch (roleError) {
              sendApiError(res, req, 400, roleError, { function_name: "setUserRoles" });
              return;
            }
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "GET" && req.url.match(/^\/api\/auth\/users\/\d+\/roles$/)) {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const id = Number(req.url.split("/")[4]);
            json(res, 200, { roles: getUserRoles(id) });
            return;
          }

          if (req.method === "PUT" && req.url.match(/^\/api\/auth\/users\/\d+$/)) {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const id = Number(req.url.split("/").pop());
            const { username, password, display_name } = await readBody(req);
            if (!username) { json(res, 400, { error: "Username is required." }); return; }
            if (password && String(password).length < 8) {
              json(res, 400, { error: "Password must be at least 8 characters." });
              return;
            }
            if (password) {
              updateAuditedRow(
                USERS_TABLE,
                {
                  username: username.trim(),
                  display_name: display_name?.trim() || null,
                  password: hashPassword(password),
                },
                "id = ?",
                [id],
                actingUser.id
              );
            } else {
              updateAuditedRow(
                USERS_TABLE,
                {
                  username: username.trim(),
                  display_name: display_name?.trim() || null,
                },
                "id = ?",
                [id],
                actingUser.id
              );
            }
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "DELETE" && req.url.match(/^\/api\/auth\/users\/\d+$/)) {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const id = Number(req.url.split("/").pop());
            run(`DELETE FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [id]);
            run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [id]);
            json(res, 200, { ok: true });
            return;
          }

          // ── DB endpoints ────────────────────────────────────────────────
          if (req.method === "GET" && requestPath === "/api/db/tables") {
            const user = getSessionUser(req);
            json(res, 200, { tables: getTablesForUser(user) });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/db/query") {
            const user = getSessionUser(req);
            const body = await readBody(req);
            if (body.table) {
              assertUserCanAccessTable(user, body.table, { forWrite: false });
            } else if (!isSessionAdmin(user)) {
              json(res, 403, { error: "Admin access required for ad-hoc queries." });
              return;
            }
            json(res, 200, queryDb(body));
            return;
          }

          if (req.method === "POST" && requestPath === "/api/db/crud") {
            const body = await readBody(req);
            const user = getSessionUser(req);
            assertUserCanAccessTable(user, body.table, {
              forWrite: body.action !== "select",
            });
            json(res, 200, crudDb(body, user?.id));
            return;
          }

          if (req.method === "POST" && requestPath === "/api/db/reference-labels") {
            const body = await readBody(req);
            const user = getSessionUser(req);
            if (!user) {
              throw new Error("Unauthorized.");
            }
            json(res, 200, getReferenceLabelMaps(body?.refs ?? [], user));
            return;
          }

          if (req.method === "GET" && requestPath === "/api/navigation") {
            const user = getSessionUser(req);
            json(res, 200, { items: getNavigationForUser(user) });
            return;
          }

          if (req.method === "POST" && req.url === "/api/admin/navigation/reseed") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;

            json(res, 200, seedNavigation(actingUser.id));
            return;
          }

          if (req.method === "POST" && requestPath === "/api/admin/reseed-dictionary") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const before = getDictionaryCounts();
            ensureAuditColumns();
            ensureSystemDictionary();
            ensureAuditDictionaryLabels();
            ensureAccountDictionaryLabels();
            ensureTransactionDictionaryLabels();
            const after = getDictionaryCounts();
            json(res, 200, {
              before,
              after,
              inserted: {
                collection: after.collection - before.collection,
                field: after.field - before.field,
              },
            });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/admin/zero-boot") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const body = await readBody(req);
            try {
              json(res, 200, performZeroBoot(actingUser, body));
            } catch (zeroBootError) {
              sendApiError(res, req, 400, zeroBootError, { function_name: "performZeroBoot" });
            }
            return;
          }

          if (req.method === "POST" && requestPath === "/api/admin/ide/escalate") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const session = getSessionRecord(req);
            if (!session) {
              json(res, 401, {
                error: "Session expired. Please sign in again.",
                code: "SESSION_EXPIRED",
              });
              return;
            }

            const body = await readBody(req);
            const password = body?.password;
            if (!password) {
              json(res, 400, { error: "Password is required to escalate IDE access." });
              return;
            }

            const row = all(
              `SELECT id, password FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
              [actingUser.id]
            )[0];
            if (!row || !verifyPassword(password, row.password)) {
              logRequestError(req, "IDE elevation password rejected.", {
                level: "warning",
                function_name: "ideEscalate",
                status_code: 403,
                user: actingUser,
                data: { reason: "invalid_password" },
              });
              json(res, 403, { error: "Password is incorrect." });
              return;
            }

            const elevatedUntil = Date.now() + IDE_ELEVATION_MS;
            const stored = sessions.get(session.token);
            if (stored) {
              stored.ideElevatedUntil = elevatedUntil;
            }

            writeSystemLog({
              level: "info",
              source: "admin_ide",
              message: "IDE access elevated for emergency SQL.",
              function_name: "ideEscalate",
              user_id: actingUser.id,
              username: actingUser.username,
              url: requestPath,
              method: req.method,
              data: { elevated_until: elevatedUntil, duration_ms: IDE_ELEVATION_MS },
            });

            json(res, 200, { elevated_until: elevatedUntil });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/admin/ide/deescalate") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const session = getSessionRecord(req);
            if (!session) {
              json(res, 401, {
                error: "Session expired. Please sign in again.",
                code: "SESSION_EXPIRED",
              });
              return;
            }

            clearIdeElevation(sessions.get(session.token));
            writeSystemLog({
              level: "info",
              source: "admin_ide",
              message: "IDE elevated access ended.",
              function_name: "ideDeescalate",
              user_id: actingUser.id,
              username: actingUser.username,
              url: requestPath,
              method: req.method,
            });
            json(res, 200, { ok: true, elevated_until: null });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/admin/ide/sql") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;
            const session = getSessionRecord(req);
            if (!session) {
              json(res, 401, {
                error: "Session expired. Please sign in again.",
                code: "SESSION_EXPIRED",
              });
              return;
            }

            const stored = sessions.get(session.token);
            if (!isIdeElevated(stored)) {
              json(res, 403, {
                error: "Elevate IDE access first (re-enter your password) to run write SQL.",
                code: "IDE_ELEVATION_REQUIRED",
              });
              return;
            }

            const body = await readBody(req);
            try {
              json(res, 200, executeElevatedIdeSql(body, actingUser));
            } catch (ideSqlError) {
              logRequestError(req, ideSqlError, {
                function_name: "executeElevatedIdeSql",
                status_code: 400,
                user: actingUser,
                data: { sql: String(body?.sql || "").slice(0, 500) },
              });
              json(res, 400, { error: ideSqlError.message || "Unable to run elevated SQL." });
            }
            return;
          }

          if (req.method === "GET" && req.url === "/api/admin/system-deletes") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;

            const records = all(
              `
                SELECT id, source_table, record_id, record_data, created_by, created_on
                FROM ${SYSTEM_DELETES_TABLE}
                ORDER BY created_on DESC, id DESC
              `
            );
            json(res, 200, { records });
            return;
          }

          if (req.method === "GET" && requestPath === "/api/admin/system-logs") {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;

            const logsUrl = new URL(req.url, "http://localhost");
            const limit = Math.min(Math.max(Number(logsUrl.searchParams.get("limit")) || 200, 1), 1000);
            const records = all(
              `
                SELECT
                  id, level, source, message, stack, function_name, url, method,
                  status_code, user_id, username, user_agent, ip_address, data,
                  created_by, created_on
                FROM ${SYSTEM_LOGS_TABLE}
                ORDER BY created_on DESC, id DESC
                LIMIT ?
              `,
              [limit]
            );
            json(res, 200, { records });
            return;
          }

          if (req.method === "POST" && requestPath === "/api/logs") {
            const body = await readBody(req);
            const sessionUser = getSessionUser(req);
            const message = String(body?.message || "").trim() || "Client error.";
            writeSystemLog({
              level: body?.level || "error",
              source: body?.source || "client",
              message,
              stack: body?.stack || null,
              function_name: body?.function_name || body?.functionName || null,
              url: body?.url || req.headers?.referer || null,
              method: body?.method || "CLIENT",
              status_code: body?.status_code ?? body?.statusCode ?? null,
              user_id: sessionUser?.id ?? body?.user_id ?? null,
              username: sessionUser?.username ?? body?.username ?? null,
              user_agent: req.headers?.["user-agent"] || body?.user_agent || null,
              ip_address: getClientIp(req),
              data: {
                ...(body?.data && typeof body.data === "object" ? body.data : { data: body?.data }),
                component_stack: body?.component_stack || body?.componentStack || null,
                client_timestamp: body?.timestamp || null,
                client_href: body?.href || null,
                client_user_agent: body?.user_agent || null,
              },
            });
            json(res, 200, { ok: true });
            return;
          }

          const restoreMatch = req.url.match(/^\/api\/admin\/system-deletes\/(\d+)\/restore$/);
          if (req.method === "POST" && restoreMatch) {
            const actingUser = requireAdmin(req, res);
            if (!actingUser) return;

            const archiveId = Number(restoreMatch[1]);
            json(res, 200, restoreArchivedRecord(archiveId, actingUser.id));
            return;
          }

          // ── Dashboard (multi-dashboard) endpoints ───────────────────────
          if (req.url.startsWith("/api/dashboards")) {
            const dashUrl = new URL(req.url, "http://localhost");
            const sessionUser = getSessionUser(req);
            if (!sessionUser) {
              json(res, 401, { error: "Unauthorized." });
              return;
            }

            if (req.method === "GET" && dashUrl.pathname === "/api/dashboards") {
              const application = dashUrl.searchParams.get("application")?.trim() || "budget";
              if (!userCanAccessApp(sessionUser, application)) {
                json(res, 403, { error: `You do not have access to the ${application} app.` });
                return;
              }
              json(res, 200, { dashboards: listUserDashboards(sessionUser.id, application) });
              return;
            }

            if (req.method === "POST" && dashUrl.pathname === "/api/dashboards") {
              const body = await readBody(req);
              const application = body.application?.trim() || "budget";
              if (!userCanAccessApp(sessionUser, application)) {
                json(res, 403, { error: `You do not have access to the ${application} app.` });
                return;
              }
              const name = body.name?.trim();
              if (!name) {
                json(res, 400, { error: "Dashboard name is required." });
                return;
              }

              const existing = all(
                `SELECT COUNT(*) AS count FROM ${DASHBOARDS_TABLE} WHERE user_id = ? AND application = ?`,
                [sessionUser.id, application]
              )[0];
              const isFirst = Number(existing?.count) === 0;

              const result = insertAuditedRow(
                DASHBOARDS_TABLE,
                {
                  application,
                  user_id: sessionUser.id,
                  name,
                  is_default: isFirst ? 1 : 0,
                  sort_order: Number(existing?.count) || 0,
                },
                sessionUser.id
              );
              const dashboardId = result.lastID;
              if (Array.isArray(body.items)) {
                replaceDashboardLayoutItems(dashboardId, body.items);
              }
              json(res, 200, {
                dashboard: listUserDashboards(sessionUser.id, application).find(
                  (dashboard) => dashboard.id === dashboardId
                ),
              });
              return;
            }

            const layoutMatch = dashUrl.pathname.match(/^\/api\/dashboards\/(\d+)\/layout$/);
            if (layoutMatch && req.method === "PUT") {
              const dashboardId = Number(layoutMatch[1]);
              const dashboard = getUserDashboard(dashboardId, sessionUser.id);
              if (!dashboard) {
                json(res, 404, { error: "Dashboard not found." });
                return;
              }
              const body = await readBody(req);
              if (!Array.isArray(body.items)) {
                json(res, 400, { error: "items must be an array." });
                return;
              }
              replaceDashboardLayoutItems(dashboardId, body.items);
              json(res, 200, { ok: true });
              return;
            }

            const dashMatch = dashUrl.pathname.match(/^\/api\/dashboards\/(\d+)$/);
            if (dashMatch) {
              const dashboardId = Number(dashMatch[1]);
              const dashboard = getUserDashboard(dashboardId, sessionUser.id);
              if (!dashboard) {
                json(res, 404, { error: "Dashboard not found." });
                return;
              }

              if (req.method === "PUT") {
                const body = await readBody(req);
                const updates = {};
                if (body.name !== undefined) {
                  const name = String(body.name).trim();
                  if (!name) {
                    json(res, 400, { error: "Dashboard name is required." });
                    return;
                  }
                  updates.name = name;
                }
                if (body.sort_order !== undefined) {
                  updates.sort_order = Number(body.sort_order) || 0;
                }
                if (body.is_default !== undefined && Number(body.is_default) === 1) {
                  run(
                    `UPDATE ${DASHBOARDS_TABLE} SET is_default = 0 WHERE user_id = ? AND application = ?`,
                    [sessionUser.id, dashboard.application]
                  );
                  updates.is_default = 1;
                }
                if (Object.keys(updates).length > 0) {
                  updateAuditedRow(
                    DASHBOARDS_TABLE,
                    updates,
                    "id = ?",
                    [dashboardId],
                    sessionUser.id
                  );
                }
                json(res, 200, { ok: true });
                return;
              }

              if (req.method === "DELETE") {
                run(`DELETE FROM ${DASHBOARD_LAYOUT_ITEMS_TABLE} WHERE dashboard_id = ?`, [
                  dashboardId,
                ]);
                run(`DELETE FROM ${DASHBOARDS_TABLE} WHERE id = ?`, [dashboardId]);
                if (Number(dashboard.is_default) === 1) {
                  const next = all(
                    `
                      SELECT id FROM ${DASHBOARDS_TABLE}
                      WHERE user_id = ? AND application = ?
                      ORDER BY sort_order, id LIMIT 1
                    `,
                    [sessionUser.id, dashboard.application]
                  )[0];
                  if (next) {
                    run(`UPDATE ${DASHBOARDS_TABLE} SET is_default = 1 WHERE id = ?`, [next.id]);
                  }
                }
                json(res, 200, { ok: true });
                return;
              }
            }
          }

          // ── User preferences endpoints ──────────────────────────────────
          if (req.url.startsWith("/api/preferences")) {
            const prefUrl = new URL(req.url, "http://localhost");
            const sessionUser = getSessionUser(req);
            if (!sessionUser) {
              json(res, 401, { error: "Unauthorized." });
              return;
            }

            if (req.method === "GET" && prefUrl.pathname === "/api/preferences") {
              const key = prefUrl.searchParams.get("key")?.trim();
              if (!key) {
                json(res, 400, { error: "key is required." });
                return;
              }
              const row = all(
                `
                  SELECT pref_key, pref_value, updated_on
                  FROM ${USER_PREFERENCES_TABLE}
                  WHERE user_id = ? AND pref_key = ?
                  LIMIT 1
                `,
                [sessionUser.id, key]
              )[0];
              if (!row) {
                json(res, 200, { preference: null });
                return;
              }
              let value = null;
              try {
                value = JSON.parse(row.pref_value);
              } catch {
                value = row.pref_value;
              }
              json(res, 200, {
                preference: {
                  key: row.pref_key,
                  value,
                  updated_on: row.updated_on,
                },
              });
              return;
            }

            if (req.method === "PUT" && prefUrl.pathname === "/api/preferences") {
              const body = await readBody(req);
              const key = String(body?.key || "").trim();
              if (!key) {
                json(res, 400, { error: "key is required." });
                return;
              }
              if (key.length > 255) {
                json(res, 400, { error: "key is too long." });
                return;
              }
              const valueJson =
                typeof body?.value === "string"
                  ? body.value
                  : JSON.stringify(body?.value ?? null);
              const existing = all(
                `
                  SELECT id FROM ${USER_PREFERENCES_TABLE}
                  WHERE user_id = ? AND pref_key = ?
                  LIMIT 1
                `,
                [sessionUser.id, key]
              )[0];

              if (existing) {
                updateAuditedRow(
                  USER_PREFERENCES_TABLE,
                  { pref_value: valueJson },
                  "id = ?",
                  [existing.id],
                  sessionUser.id
                );
              } else {
                insertAuditedRow(
                  USER_PREFERENCES_TABLE,
                  {
                    user_id: sessionUser.id,
                    pref_key: key,
                    pref_value: valueJson,
                  },
                  sessionUser.id
                );
              }

              json(res, 200, { ok: true });
              return;
            }

            json(res, 405, { error: "Method not allowed." });
            return;
          }

          // ── Favorites endpoints ─────────────────────────────────────────
          if (req.url.startsWith("/api/favorites")) {
            const favUrl = new URL(req.url, "http://localhost");
            const sessionUser = getSessionUser(req);
            if (!sessionUser) {
              json(res, 401, { error: "Unauthorized." });
              return;
            }

            if (req.method === "GET" && favUrl.pathname === "/api/favorites") {
              const favorites = all(
                `
                  SELECT id, label, path, icon, color, custom_icon_data, sort_order
                  FROM ${USER_FAVORITES_TABLE}
                  WHERE user_id = ?
                  ORDER BY sort_order, id
                `,
                [sessionUser.id]
              );
              json(res, 200, { favorites });
              return;
            }

            if (req.method === "POST" && favUrl.pathname === "/api/favorites") {
              const body = await readBody(req);
              const label = body.label?.trim();
              const path = body.path?.trim();
              if (!label || !path) {
                json(res, 400, { error: "label and path are required." });
                return;
              }
              if (!path.startsWith("/")) {
                json(res, 400, { error: "path must be an internal link starting with /." });
                return;
              }

              const existing = all(
                `SELECT id FROM ${USER_FAVORITES_TABLE} WHERE user_id = ? AND path = ? LIMIT 1`,
                [sessionUser.id, path]
              )[0];
              if (existing) {
                run(
                  `UPDATE ${USER_FAVORITES_TABLE} SET label = ?, icon = ? WHERE id = ?`,
                  [label, body.icon?.trim() || null, existing.id]
                );
                json(res, 200, { id: existing.id });
                return;
              }

              const maxSort = all(
                `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM ${USER_FAVORITES_TABLE} WHERE user_id = ?`,
                [sessionUser.id]
              )[0];
              const result = run(
                `
                  INSERT INTO ${USER_FAVORITES_TABLE} (user_id, label, path, icon, sort_order, created_on)
                  VALUES (?, ?, ?, ?, ?, datetime('now'))
                `,
                [
                  sessionUser.id,
                  label,
                  path,
                  body.icon?.trim() || null,
                  Number(maxSort?.max_sort ?? -1) + 1,
                ]
              );
              json(res, 200, { id: result.lastID });
              return;
            }

            if (req.method === "PUT" && favUrl.pathname === "/api/favorites/reorder") {
              const body = await readBody(req);
              if (!Array.isArray(body.ids)) {
                json(res, 400, { error: "ids must be an array." });
                return;
              }
              body.ids.forEach((id, index) => {
                run(
                  `UPDATE ${USER_FAVORITES_TABLE} SET sort_order = ? WHERE id = ? AND user_id = ?`,
                  [index, Number(id), sessionUser.id]
                );
              });
              json(res, 200, { ok: true });
              return;
            }

            const favEditMatch = favUrl.pathname.match(/^\/api\/favorites\/(\d+)$/);

            if (favEditMatch && req.method === "PUT") {
              const favoriteId = Number(favEditMatch[1]);
              const owned = all(
                `SELECT id FROM ${USER_FAVORITES_TABLE} WHERE id = ? AND user_id = ? LIMIT 1`,
                [favoriteId, sessionUser.id]
              )[0];
              if (!owned) {
                json(res, 404, { error: "Favorite not found." });
                return;
              }

              const body = await readBody(req);
              const label = body.label?.trim();
              if (!label) {
                json(res, 400, { error: "label is required." });
                return;
              }
              const color = body.color?.trim() || null;
              if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
                json(res, 400, { error: "color must be a hex value like #4f9cff." });
                return;
              }

              let customIconData = null;
              if (body.custom_icon_data) {
                try {
                  customIconData = normalizeFavoriteIconDataUrl(body.custom_icon_data);
                } catch (iconError) {
                  sendApiError(res, req, 400, iconError, { function_name: "updateFavoriteIcon" });
                  return;
                }
              }
              const icon = customIconData ? null : body.icon?.trim() || null;

              run(
                `
                  UPDATE ${USER_FAVORITES_TABLE}
                  SET label = ?, icon = ?, color = ?, custom_icon_data = ?
                  WHERE id = ?
                `,
                [label, icon, color, customIconData, favoriteId]
              );
              json(res, 200, { ok: true });
              return;
            }

            if (favEditMatch && req.method === "DELETE") {
              run(`DELETE FROM ${USER_FAVORITES_TABLE} WHERE id = ? AND user_id = ?`, [
                favEditMatch[1] ? Number(favEditMatch[1]) : null,
                sessionUser.id,
              ]);
              json(res, 200, { ok: true });
              return;
            }
          }

          // ── Dashboard report endpoints ──────────────────────────────────
          if (req.url.startsWith("/api/dashboard/reports")) {
            const reportUrl = new URL(req.url, "http://localhost");

            if (req.method === "GET" && reportUrl.pathname === "/api/dashboard/reports") {
              const application = reportUrl.searchParams.get("application")?.trim() || "budget";
              const sessionUser = getSessionUser(req);
              if (!userCanAccessApp(sessionUser, application)) {
                json(res, 403, { error: `You do not have access to the ${application} app.` });
                return;
              }
              const reports = all(
                `
                  SELECT id, application, name, description, widget_kind, sql,
                         label_column, value_column, chart_config, sort_order, created_at
                  FROM ${DASHBOARD_REPORTS_TABLE}
                  WHERE application = ?
                  ORDER BY sort_order, id
                `,
                [application]
              );
              json(res, 200, { reports });
              return;
            }

            if (req.method === "POST" && reportUrl.pathname === "/api/dashboard/reports") {
              const body = await readBody(req);
              const actingUser = getSessionUser(req);
              const application = body.application?.trim() || "budget";
              if (!userCanAccessApp(actingUser, application)) {
                json(res, 403, { error: `You do not have access to the ${application} app.` });
                return;
              }
              const name = body.name?.trim();
              const widgetKind = body.widget_kind;
              const sql = body.sql?.trim();

              if (!name) {
                json(res, 400, { error: "Report name is required." });
                return;
              }
              if (!DASHBOARD_WIDGET_KINDS.has(widgetKind)) {
                json(res, 400, {
                  error: `widget_kind must be one of: ${[...DASHBOARD_WIDGET_KINDS].join(", ")}.`,
                });
                return;
              }

              assertSelectSql(sql);

              const result = insertAuditedRow(
                DASHBOARD_REPORTS_TABLE,
                {
                  application,
                  name,
                  description: body.description?.trim() || null,
                  widget_kind: widgetKind,
                  sql,
                  label_column: body.label_column?.trim() || null,
                  value_column: body.value_column?.trim() || null,
                  chart_config: normalizeChartConfig(body.chart_config),
                  sort_order: Number(body.sort_order) || 0,
                },
                actingUser?.id
              );
              json(res, 200, { id: result.lastID });
              return;
            }

            const reportMatch = reportUrl.pathname.match(/^\/api\/dashboard\/reports\/(\d+)$/);
            if (reportMatch) {
              const reportId = Number(reportMatch[1]);

              if (req.method === "PUT") {
                const body = await readBody(req);
                const actingUser = getSessionUser(req);
                const name = body.name?.trim();
                const widgetKind = body.widget_kind;
                const sql = body.sql?.trim();

                if (!name) {
                  json(res, 400, { error: "Report name is required." });
                  return;
                }
                if (!DASHBOARD_WIDGET_KINDS.has(widgetKind)) {
                  json(res, 400, {
                    error: `widget_kind must be one of: ${[...DASHBOARD_WIDGET_KINDS].join(", ")}.`,
                  });
                  return;
                }

                assertSelectSql(sql);

                updateAuditedRow(
                  DASHBOARD_REPORTS_TABLE,
                  {
                    name,
                    description: body.description?.trim() || null,
                    widget_kind: widgetKind,
                    sql,
                    label_column: body.label_column?.trim() || null,
                    value_column: body.value_column?.trim() || null,
                    chart_config: normalizeChartConfig(body.chart_config),
                    sort_order: Number(body.sort_order) || 0,
                  },
                  "id = ?",
                  [reportId],
                  actingUser?.id
                );
                json(res, 200, { ok: true });
                return;
              }

              if (req.method === "DELETE") {
                run(`DELETE FROM ${DASHBOARD_REPORTS_TABLE} WHERE id = ?`, [reportId]);
                run(`DELETE FROM ${DASHBOARD_LAYOUT_ITEMS_TABLE} WHERE report_key = ?`, [
                  `custom:${reportId}`,
                ]);
                json(res, 200, { ok: true });
                return;
              }
            }
          }

          // ── Budget endpoints ────────────────────────────────────────────
          if (req.url.startsWith("/api/budget/")) {
            const actingUser = getSessionUser(req);
            assertBudgetAccess(actingUser);
            const budgetUrl = new URL(req.url, "http://localhost");

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/budget-vs-actual") {
              const month = budgetUrl.searchParams.get("month")?.trim() || new Date().toISOString().slice(0, 7);
              json(res, 200, { month, rows: getBudgetVsActual(month) });
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/upcoming-bills") {
              const days = Number(budgetUrl.searchParams.get("days")) || 30;
              json(res, 200, { days, bills: getUpcomingBills(days) });
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/goals") {
              json(res, 200, { goals: getGoalsWithProgress() });
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/net-worth") {
              json(res, 200, getNetWorthTotals());
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/net-worth/history") {
              json(res, 200, { history: getNetWorthHistory() });
              return;
            }

            if (req.method === "POST" && budgetUrl.pathname === "/api/budget/net-worth/snapshot") {
              const actingUser = getSessionUser(req);
              const body = await readBody(req);
              json(res, 200, captureNetWorthSnapshot(body.month || null, actingUser?.id));
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/cash-flow-forecast") {
              const days = Number(budgetUrl.searchParams.get("days")) || 90;
              json(res, 200, getCashFlowForecast(days));
              return;
            }

            if (req.method === "POST" && budgetUrl.pathname === "/api/budget/debt-payoff") {
              const body = await readBody(req);
              json(
                res,
                200,
                calculateDebtPayoff({
                  strategy: body.strategy,
                  extra_payment: body.extra_payment,
                })
              );
              return;
            }

            const syncGoalMatch = budgetUrl.pathname.match(/^\/api\/budget\/goals\/(\d+)\/sync$/);
            if (req.method === "POST" && syncGoalMatch) {
              const actingUser = getSessionUser(req);
              const goalId = Number(syncGoalMatch[1]);
              json(res, 200, syncGoalFromAccount(goalId, actingUser?.id));
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/reports/spending-trends") {
              const months = Number(budgetUrl.searchParams.get("months")) || 12;
              json(res, 200, { months, rows: getSpendingTrends(months) });
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/reports/income-vs-expense") {
              const months = Number(budgetUrl.searchParams.get("months")) || 12;
              json(res, 200, { months, rows: getIncomeVsExpenseTrends(months) });
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/reports/year-over-year") {
              const month = Number(budgetUrl.searchParams.get("month")) || new Date().getMonth() + 1;
              json(res, 200, getYearOverYearReport(month));
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/reports/tax-summary") {
              const year = budgetUrl.searchParams.get("year")?.trim() || null;
              json(res, 200, getTaxCategorySummary(year));
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/reports/cash-flow-sankey") {
              const now = new Date();
              const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              const month = budgetUrl.searchParams.get("month")?.trim() || defaultMonth;
              const accountId = budgetUrl.searchParams.get("account_id");
              json(
                res,
                200,
                getCashFlowSankey(month, accountId ? Number(accountId) : null)
              );
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/rules/match") {
              const description = budgetUrl.searchParams.get("description")?.trim() || "";
              const accountId = budgetUrl.searchParams.get("account_id");
              json(
                res,
                200,
                applyPayeeRules(description, accountId ? Number(accountId) : null) ?? { match: false }
              );
              return;
            }

            if (req.method === "GET" && budgetUrl.pathname === "/api/budget/export/transactions") {
              const from = budgetUrl.searchParams.get("from");
              const to = budgetUrl.searchParams.get("to");
              const accountId = budgetUrl.searchParams.get("account_id");
              const csv = exportTransactionsCsv({
                from: from || null,
                to: to || null,
                accountId: accountId ? Number(accountId) : null,
              });
              res.statusCode = 200;
              res.setHeader("Content-Type", "text/csv; charset=utf-8");
              res.setHeader(
                "Content-Disposition",
                'attachment; filename="transactions.csv"'
              );
              res.end(csv);
              return;
            }

            if (req.method === "POST" && budgetUrl.pathname === "/api/budget/import/transactions") {
              const actingUser = getSessionUser(req);
              const body = await readBody(req);
              if (!body.csv || typeof body.csv !== "string") {
                json(res, 400, { error: "csv text is required." });
                return;
              }
              json(
                res,
                200,
                importTransactionsFromCsv(body.csv, actingUser?.id, {
                  skip_duplicates: body.skip_duplicates !== false,
                })
              );
              return;
            }

            if (req.method === "POST" && budgetUrl.pathname === "/api/budget/receipts/scan") {
              const actingUser = getSessionUser(req);
              if (!actingUser) {
                json(res, 401, { error: "Unauthorized." });
                return;
              }
              const body = await readBody(req);
              try {
                json(res, 200, await scanReceiptFromImage(body));
              } catch (scanError) {
                const statusCode =
                  /not configured|GEMINI_API_KEY/i.test(scanError.message)
                    ? 503
                    : /required|Unsupported|too large|valid total|Could not/i.test(scanError.message)
                      ? 400
                      : 502;
                sendApiError(res, req, statusCode, scanError, { function_name: "scanReceipt" });
              }
              return;
            }

            if (req.method === "POST" && budgetUrl.pathname === "/api/budget/recurring/post-due") {
              const actingUser = getSessionUser(req);
              const body = await readBody(req);
              json(
                res,
                200,
                postDueRecurringTransactions(actingUser?.id, body.as_of_date || null)
              );
              return;
            }

            const postRecurringMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/recurring\/(\d+)\/post$/
            );
            if (req.method === "POST" && postRecurringMatch) {
              const actingUser = getSessionUser(req);
              const recurringId = Number(postRecurringMatch[1]);
              const body = await readBody(req);
              json(
                res,
                200,
                postRecurringTransaction(recurringId, actingUser?.id, body.post_date || null)
              );
              return;
            }

            const registerMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/accounts\/(\d+)\/register$/
            );
            if (req.method === "GET" && registerMatch) {
              const accountId = Number(registerMatch[1]);
              const page = Number(budgetUrl.searchParams.get("page")) || 1;
              const limit = Number(budgetUrl.searchParams.get("limit")) || 20;
              const orderBy = budgetUrl.searchParams.get("orderBy") || null;
              const orderDirection = budgetUrl.searchParams.get("orderDirection") || null;
              const where = budgetUrl.searchParams.get("where") || "";
              let whereParams = [];
              const rawWhereParams = budgetUrl.searchParams.get("whereParams");
              if (rawWhereParams) {
                try {
                  whereParams = JSON.parse(rawWhereParams);
                } catch {
                  json(res, 400, { error: "Invalid whereParams." });
                  return;
                }
              }
              try {
                json(
                  res,
                  200,
                  getAccountRegister(accountId, {
                    page,
                    limit,
                    orderBy,
                    orderDirection,
                    where,
                    whereParams,
                  })
                );
              } catch (registerError) {
                sendApiError(res, req, 400, registerError, { function_name: "accountRegister" });
              }
              return;
            }

            const imageMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/accounts\/(\d+)\/image$/
            );

            if (req.method === "PUT" && budgetUrl.pathname === "/api/budget/accounts/reorder") {
              const actingUser = getSessionUser(req);
              if (!actingUser) {
                json(res, 401, { error: "Unauthorized." });
                return;
              }
              const body = await readBody(req);
              if (!Array.isArray(body.ids) || body.ids.length === 0) {
                json(res, 400, { error: "ids must be a non-empty array." });
                return;
              }
              const ids = body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
              if (ids.length === 0) {
                json(res, 400, { error: "ids must include valid account ids." });
                return;
              }
              ids.forEach((id, index) => {
                run(`UPDATE ${ACCOUNTS_TABLE} SET sort_order = ? WHERE id = ?`, [index, id]);
              });
              json(res, 200, { ok: true });
              return;
            }

            if (imageMatch) {
              const actingUser = getSessionUser(req);
              const accountId = Number(imageMatch[1]);

              if (req.method === "POST") {
                const body = await readBody(req);
                try {
                  json(res, 200, setAccountImage(accountId, body, actingUser?.id));
                } catch (imageError) {
                  sendApiError(res, req, 400, imageError, { function_name: "uploadAccountImage" });
                }
                return;
              }

              if (req.method === "GET") {
                try {
                  const { mimeType, buffer } = readAccountImageFile(accountId);
                  res.writeHead(200, {
                    "Content-Type": mimeType,
                    "Content-Length": buffer.length,
                    "Cache-Control": "private, max-age=300",
                  });
                  res.end(buffer);
                } catch (imageError) {
                  sendApiError(res, req, 404, imageError, { function_name: "readAccountImage" });
                }
                return;
              }

              if (req.method === "DELETE") {
                try {
                  json(res, 200, deleteAccountImage(accountId, actingUser?.id));
                } catch (imageError) {
                  sendApiError(res, req, 400, imageError, { function_name: "deleteAccountImage" });
                }
                return;
              }
            }

            const syncMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/accounts\/(\d+)\/sync-balance$/
            );
            if (req.method === "POST" && syncMatch) {
              const actingUser = getSessionUser(req);
              const accountId = Number(syncMatch[1]);
              json(res, 200, syncAccountBalanceFromLedger(accountId, actingUser?.id));
              return;
            }

            const jointUsersMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/accounts\/(\d+)\/joint-users$/
            );
            if (jointUsersMatch) {
              const actingUser = getSessionUser(req);
              if (!actingUser) {
                json(res, 401, { error: "Unauthorized." });
                return;
              }
              const accountId = Number(jointUsersMatch[1]);
              if (req.method === "GET") {
                json(res, 200, { user_ids: getAccountJointUserIds(accountId) });
                return;
              }
              if (req.method === "PUT") {
                const body = await readBody(req);
                try {
                  json(res, 200, setAccountJointUsers(accountId, body.user_ids ?? []));
                } catch (jointError) {
                  sendApiError(res, req, 400, jointError, { function_name: "setAccountJointUsers" });
                }
                return;
              }
            }

            const clearedMatch = budgetUrl.pathname.match(
              /^\/api\/budget\/transactions\/(\d+)\/cleared$/
            );
            if (req.method === "PUT" && clearedMatch) {
              const actingUser = getSessionUser(req);
              const transactionId = Number(clearedMatch[1]);
              const body = await readBody(req);
              json(
                res,
                200,
                setTransactionCleared(transactionId, Boolean(body.cleared), actingUser?.id)
              );
              return;
            }
          }

          // ── Budget transaction endpoints ────────────────────────────────
          if (req.url.startsWith("/api/budget/transactions")) {
            const transactionUrl = new URL(req.url, "http://localhost");

            const attachmentsMatch = transactionUrl.pathname.match(
              /^\/api\/budget\/transactions\/(\d+)\/attachments(?:\/(\d+))?$/
            );
            if (attachmentsMatch) {
              const actingUser = getSessionUser(req);
              const transactionId = Number(attachmentsMatch[1]);
              const attachmentId = attachmentsMatch[2] ? Number(attachmentsMatch[2]) : null;

              if (!getTransactionById(transactionId)) {
                json(res, 404, { error: "Transaction not found." });
                return;
              }

              if (req.method === "GET" && !attachmentId) {
                json(res, 200, { attachments: listTransactionAttachments(transactionId) });
                return;
              }

              if (req.method === "POST" && !attachmentId) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  createTransactionAttachment(transactionId, body, actingUser?.id)
                );
                return;
              }

              if (req.method === "GET" && attachmentId) {
                try {
                  const { row, buffer } = readTransactionAttachmentFile(
                    transactionId,
                    attachmentId
                  );
                  const disposition = transactionUrl.searchParams.get("download") === "1"
                    ? "attachment"
                    : "inline";
                  res.statusCode = 200;
                  res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
                  res.setHeader(
                    "Content-Disposition",
                    `${disposition}; filename="${String(row.filename).replace(/"/g, "")}"`
                  );
                  res.setHeader("Content-Length", String(buffer.length));
                  res.end(buffer);
                } catch (attachmentError) {
                  sendApiError(res, req, 404, attachmentError, {
                    function_name: "readTransactionAttachment",
                  });
                }
                return;
              }

              if (req.method === "DELETE" && attachmentId) {
                json(res, 200, deleteTransactionAttachment(transactionId, attachmentId));
                return;
              }

              json(res, 405, { error: "Method not allowed." });
              return;
            }

            const transactionMatch = transactionUrl.pathname.match(
              /^\/api\/budget\/transactions(?:\/(\d+))?$/
            );

            if (transactionMatch) {
              const transactionId = transactionMatch[1] ? Number(transactionMatch[1]) : null;

              if (req.method === "GET" && transactionId) {
                const row = getTransactionById(transactionId);
                if (!row) {
                  json(res, 404, { error: "Transaction not found." });
                  return;
                }

                const splits = getTransactionSplits(transactionId);
                const attachments = listTransactionAttachments(transactionId);
                const payee = row.payee_id
                  ? all(`SELECT id, name, default_category_id FROM ${PAYEES_TABLE} WHERE id = ? LIMIT 1`, [
                      row.payee_id,
                    ])[0]
                  : null;

                if (row.linked_transaction_id) {
                  const partner = getTransactionById(row.linked_transaction_id);
                  if (partner) {
                    const typeA = getAccountTypeNameForAccountId(row.account_id);
                    const typeB = getAccountTypeNameForAccountId(partner.account_id);
                    const roles = resolveTransferRoles(row, typeA, partner, typeB);
                    const fromRow = roles.from;
                    const toRow = roles.to;
                    json(res, 200, {
                      transaction: {
                        ...row,
                        id: row.id,
                        from_account_id: fromRow.account_id,
                        to_account_id: toRow.account_id,
                        amount: roles.absoluteAmount,
                        signed_amount: Number(row.amount),
                        linked_transaction_id: partner.id,
                        source_account_id: fromRow.account_id,
                        transfer_kind: roles.kind,
                        transaction_kind: "transfer",
                        category_id: fromRow.category_id ?? row.category_id,
                        description: fromRow.description ?? row.description,
                        transaction_date: fromRow.transaction_date ?? row.transaction_date,
                        user_id: fromRow.user_id ?? row.user_id,
                        payee_id: fromRow.payee_id ?? row.payee_id,
                        splits,
                        attachments,
                        payee,
                      },
                    });
                    return;
                  }
                }

                json(res, 200, {
                  transaction: {
                    ...row,
                    source_account_id: null,
                    from_account_id: null,
                    to_account_id: null,
                    splits,
                    attachments,
                    payee,
                  },
                });
                return;
              }

              if (req.method === "POST" && !transactionId) {
                const body = await readBody(req);
                const actingUser = getSessionUser(req);
                json(res, 200, createBudgetTransaction(body, actingUser?.id));
                return;
              }

              if (req.method === "PUT" && transactionId) {
                const body = await readBody(req);
                const actingUser = getSessionUser(req);
                json(res, 200, updateBudgetTransaction(transactionId, body, actingUser?.id));
                return;
              }

              if (req.method === "DELETE" && transactionId) {
                const actingUser = getSessionUser(req);
                json(res, 200, deleteBudgetTransaction(transactionId, actingUser?.id));
                return;
              }
            }
          }

          // ── Tasks endpoints ─────────────────────────────────────────────
          {
            const tasksUrl = new URL(req.url, "http://localhost");
            const tasksPathname = tasksUrl.pathname;
            if (tasksPathname === "/api/tasks" || tasksPathname.startsWith("/api/tasks/")) {
              try {
                const actingUser = getSessionUser(req);
                assertTaskAccess(actingUser);

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/summary") {
                json(res, 200, { summary: getTaskSummary(actingUser.id) });
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/projects") {
                json(res, 200, { projects: getTaskProjects(actingUser.id) });
                return;
              }

              if (req.method === "POST" && tasksUrl.pathname === "/api/tasks/projects") {
                const body = await readBody(req);
                json(res, 200, { project: createTaskProject(body, actingUser.id) });
                return;
              }

              const projectMatch = tasksUrl.pathname.match(/^\/api\/tasks\/projects\/(\d+)$/);
              if (req.method === "PUT" && projectMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  { project: updateTaskProject(Number(projectMatch[1]), body, actingUser.id) }
                );
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/tags") {
                json(res, 200, { tags: getTaskTags(actingUser.id) });
                return;
              }

              if (req.method === "POST" && tasksUrl.pathname === "/api/tasks/tags") {
                const body = await readBody(req);
                json(res, 200, { tag: createTaskTag(body, actingUser.id) });
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/list") {
                json(res, 200, {
                  tasks: buildTaskListQuery(actingUser.id, {
                    view: tasksUrl.searchParams.get("view"),
                    project_id: tasksUrl.searchParams.get("project_id"),
                    status: tasksUrl.searchParams.get("status"),
                    priority: tasksUrl.searchParams.get("priority"),
                    tag_id: tasksUrl.searchParams.get("tag_id"),
                    search: tasksUrl.searchParams.get("search"),
                  }),
                });
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/board") {
                const projectId = tasksUrl.searchParams.get("project_id");
                const tasks = buildTaskListQuery(actingUser.id, {
                  view: "all",
                  project_id: projectId,
                }).filter((task) => task.status !== "done" || tasksUrl.searchParams.get("include_done") === "1");

                const columns = TASK_STATUSES.map((status) => ({
                  status,
                  tasks: tasks.filter((task) => task.status === status),
                }));

                json(res, 200, { columns });
                return;
              }

              if (req.method === "POST" && tasksUrl.pathname === "/api/tasks") {
                const body = await readBody(req);
                json(res, 200, { task: createTaskRecord(body, actingUser.id) });
                return;
              }

              const taskMatch = tasksUrl.pathname.match(/^\/api\/tasks\/(\d+)$/);
              if (req.method === "GET" && taskMatch) {
                json(res, 200, { task: getTaskById(Number(taskMatch[1]), actingUser.id) });
                return;
              }

              if (req.method === "PUT" && taskMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  { task: updateTaskRecord(Number(taskMatch[1]), body, actingUser.id) }
                );
                return;
              }

              if (req.method === "DELETE" && taskMatch) {
                json(res, 200, deleteTaskRecord(Number(taskMatch[1]), actingUser.id));
                return;
              }

              const statusMatch = tasksUrl.pathname.match(/^\/api\/tasks\/(\d+)\/status$/);
              if (req.method === "PUT" && statusMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  {
                    task: updateTaskRecord(
                      Number(statusMatch[1]),
                      { status: body.status },
                      actingUser.id
                    ),
                  }
                );
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/pomodoro/active") {
                json(res, 200, { session: getActivePomodoroSession(actingUser.id) });
                return;
              }

              if (req.method === "GET" && tasksUrl.pathname === "/api/tasks/pomodoro/stats") {
                const days = Number(tasksUrl.searchParams.get("days")) || 7;
                json(res, 200, getPomodoroStats(actingUser.id, days));
                return;
              }

              if (req.method === "POST" && tasksUrl.pathname === "/api/tasks/pomodoro/start") {
                const body = await readBody(req);
                json(res, 200, { session: startPomodoroSession(body, actingUser.id) });
                return;
              }

              const completePomodoroMatch = tasksUrl.pathname.match(
                /^\/api\/tasks\/pomodoro\/(\d+)\/complete$/
              );
              if (req.method === "POST" && completePomodoroMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  {
                    session: completePomodoroSession(
                      Number(completePomodoroMatch[1]),
                      body,
                      actingUser.id
                    ),
                  }
                );
                return;
              }

              const cancelPomodoroMatch = tasksUrl.pathname.match(
                /^\/api\/tasks\/pomodoro\/(\d+)\/cancel$/
              );
              if (req.method === "POST" && cancelPomodoroMatch) {
                json(
                  res,
                  200,
                  cancelPomodoroSession(Number(cancelPomodoroMatch[1]), actingUser.id)
                );
                return;
              }
            } catch (taskError) {
              const statusCode =
                taskError.message === "Unauthorized."
                  ? 401
                  : taskError.message.includes("access")
                    ? 403
                    : 400;
              sendApiError(res, req, statusCode, taskError, { function_name: "tasksApi" });
              return;
            }
            }
          }

          // ── Notes endpoints ─────────────────────────────────────────────
          const notesPathname = new URL(req.url, "http://localhost").pathname;
          if (notesPathname === "/api/notes" || notesPathname.startsWith("/api/notes/")) {
            const notesUrl = new URL(req.url, "http://localhost");

            try {
              const actingUser = getSessionUser(req);
              assertNotesAccess(actingUser);

              if (req.method === "GET" && notesUrl.pathname === "/api/notes/summary") {
                json(res, 200, { summary: getNotesSummary(actingUser.id) });
                return;
              }

              if (req.method === "GET" && notesUrl.pathname === "/api/notes/tree") {
                json(res, 200, { tree: getNotesTree(actingUser.id), note_types: NOTE_TYPES });
                return;
              }

              if (req.method === "GET" && notesUrl.pathname === "/api/notes/list") {
                json(res, 200, {
                  notes: buildNotesListQuery(actingUser.id, {
                    notebook_id: notesUrl.searchParams.get("notebook_id"),
                    subject_id: notesUrl.searchParams.get("subject_id"),
                    topic_id: notesUrl.searchParams.get("topic_id"),
                    parent_note_id: notesUrl.searchParams.get("parent_note_id"),
                    top_level_only: notesUrl.searchParams.get("top_level_only"),
                    note_type: notesUrl.searchParams.get("note_type"),
                    task_id: notesUrl.searchParams.get("task_id"),
                    pinned: notesUrl.searchParams.get("pinned"),
                    search: notesUrl.searchParams.get("search"),
                    recent: notesUrl.searchParams.get("recent") === "1",
                  }),
                });
                return;
              }

              if (req.method === "POST" && notesUrl.pathname === "/api/notes/notebooks") {
                const body = await readBody(req);
                json(res, 200, { notebook: createNotebookRecord(body, actingUser.id) });
                return;
              }

              const notebookMatch = notesUrl.pathname.match(/^\/api\/notes\/notebooks\/(\d+)$/);
              if (req.method === "PUT" && notebookMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  { notebook: updateNotebookRecord(Number(notebookMatch[1]), body, actingUser.id) }
                );
                return;
              }

              if (req.method === "POST" && notesUrl.pathname === "/api/notes/subjects") {
                const body = await readBody(req);
                json(res, 200, { subject: createSubjectRecord(body, actingUser.id) });
                return;
              }

              const subjectMatch = notesUrl.pathname.match(/^\/api\/notes\/subjects\/(\d+)$/);
              if (req.method === "PUT" && subjectMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  { subject: updateSubjectRecord(Number(subjectMatch[1]), body, actingUser.id) }
                );
                return;
              }

              if (req.method === "POST" && notesUrl.pathname === "/api/notes/topics") {
                const body = await readBody(req);
                json(res, 200, { topic: createTopicRecord(body, actingUser.id) });
                return;
              }

              const topicMatch = notesUrl.pathname.match(/^\/api\/notes\/topics\/(\d+)$/);
              if (req.method === "PUT" && topicMatch) {
                const body = await readBody(req);
                json(
                  res,
                  200,
                  { topic: updateTopicRecord(Number(topicMatch[1]), body, actingUser.id) }
                );
                return;
              }

              if (req.method === "POST" && notesUrl.pathname === "/api/notes") {
                const body = await readBody(req);
                json(res, 200, { note: createNoteRecord(body, actingUser.id) });
                return;
              }

              const noteMatch = notesUrl.pathname.match(/^\/api\/notes\/(\d+)$/);
              if (req.method === "GET" && noteMatch) {
                json(res, 200, { note: getNoteById(Number(noteMatch[1]), actingUser.id) });
                return;
              }

              if (req.method === "PUT" && noteMatch) {
                const body = await readBody(req);
                json(res, 200, { note: updateNoteRecord(Number(noteMatch[1]), body, actingUser.id) });
                return;
              }

              if (req.method === "DELETE" && noteMatch) {
                json(res, 200, deleteNoteRecord(Number(noteMatch[1]), actingUser.id));
                return;
              }
            } catch (notesError) {
              const statusCode =
                notesError.message === "Unauthorized."
                  ? 401
                  : notesError.message.includes("access")
                    ? 403
                    : 400;
              sendApiError(res, req, statusCode, notesError, { function_name: "notesApi" });
              return;
            }
          }

          sendApiError(res, req, 404, "API route not found.", { function_name: "sqliteApiPlugin" });
        } catch (error) {
          const message = error.message || "Request failed.";
          const statusCode =
            message === "Unauthorized." || message.includes("Session expired")
              ? 401
              : /access required|do not have access/i.test(message)
                ? 403
                : 400;
          sendApiError(res, req, statusCode, error, { function_name: "sqliteApiPlugin" });
        }
      });
    },
  };
}
