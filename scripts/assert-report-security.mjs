import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptPath = fileURLToPath(import.meta.url);

if (process.env.REPORT_SECURITY_ASSERT_CHILD !== "1") {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "twitlabs-reports-"));
  const dbPath = path.join(tempRoot, "report-security.db");
  const bootstrapDb = new DatabaseSync(dbPath);
  bootstrapDb.exec(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER,
      payee_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      transaction_date TEXT NOT NULL
    )
  `);
  bootstrapDb.close();
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(path.dirname(scriptPath), ".."),
    env: {
      ...process.env,
      REPORT_SECURITY_ASSERT_CHILD: "1",
      SQLITE_DB_PATH: dbPath,
      SQLITE_DATA_DIR: tempRoot,
    },
    encoding: "utf8",
  });
  rmSync(tempRoot, { recursive: true, force: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const root = path.resolve(path.dirname(scriptPath), "..");
const { runReportSql } = await import(
  `${pathToFileURL(path.join(root, "vite.sqlite-api.js")).href}?report-security-assert=1`
);
const db = new DatabaseSync(process.env.SQLITE_DB_PATH);
const budgetUser = {
  id: 9001,
  roles: [{ application: "budget", role: "budget_user" }],
};
const admin = {
  id: 1,
  roles: [{ application: "system", role: "admin" }],
};

const denied = (user, application, sql, pattern = /Access denied:/) =>
  assert.throws(() => runReportSql(user, application, sql), pattern);

try {
  const literal = runReportSql(budgetUser, "budget", "SELECT 'ok' AS label, 1 AS value");
  assert.deepEqual(literal.rows, [{ label: "ok", value: 1 }]);
  assert.deepEqual(literal.columns.map((column) => column.name), ["label", "value"]);

  runReportSql(budgetUser, "budget", "SELECT name FROM accounts LIMIT 1");
  assert.doesNotThrow(() =>
    runReportSql(
      budgetUser,
      "budget",
      `
        SELECT 'Total debt' AS label,
               COALESCE(SUM(COALESCE(a.balance, 0)), 0) AS value
        FROM accounts a
        JOIN account_types at ON at.id = a.account_type_id
        WHERE at.name IN ('Loan', 'Credit Card', 'Line of Credit')
      `
    )
  );
  denied(budgetUser, "budget", "SELECT title FROM tasks");
  denied(budgetUser, "budget", 'SELECT title FROM "tasks"');
  denied(budgetUser, "budget", "SELECT * FROM dashboard_reports");
  denied(admin, "budget", "SELECT name FROM sqlite_master");
  denied(admin, "budget", "SELECT * FROM pragma_database_list");
  denied(admin, "site-tracker", "SELECT site_password AS exposed FROM accounts");
  denied(budgetUser, "tasks", "SELECT 1", /Access denied: tasks application access is required/);
  assert.throws(
    () => runReportSql(budgetUser, "budget", "WITH x AS (SELECT 1) DELETE FROM accounts"),
    /read-only|Invalid report SQL/
  );
  assert.throws(
    () => runReportSql(budgetUser, "budget", "SELECT 1; SELECT 2"),
    /Only one SQL statement/
  );

  db.prepare("UPDATE applications SET is_enabled = 0 WHERE name = 'budget'").run();
  denied(budgetUser, "budget", "SELECT 1", /Access denied: budget application access is required/);

  console.log("Report security assertions passed.");
} finally {
  db.close();
}
