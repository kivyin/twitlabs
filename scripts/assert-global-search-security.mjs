import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptPath = fileURLToPath(import.meta.url);

if (process.env.GLOBAL_SEARCH_ASSERT_CHILD !== "1") {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "twitlabs-search-"));
  const dbPath = path.join(tempRoot, "search-security.db");
  // The application has a legacy base table that predates the additive schema
  // ensure functions. Recreate only that base table in the disposable database.
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
      GLOBAL_SEARCH_ASSERT_CHILD: "1",
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
const {
  GLOBAL_SEARCH_ALLOWLIST,
  runGlobalSearch,
} = await import(`${pathToFileURL(path.join(root, "vite.sqlite-api.js")).href}?search-assert=1`);
const db = new DatabaseSync(process.env.SQLITE_DB_PATH);

const exec = (sql, params = []) => db.prepare(sql).run(...params);
const one = (sql, params = []) => db.prepare(sql).get(...params);
const roles = (...entries) =>
  entries.map(([application, role]) => ({ application, role }));

try {
  exec(
    "INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, 'user')",
    ["search-alice", "unused-test-hash", "Search Alice"]
  );
  exec(
    "INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, 'user')",
    ["search-bob", "unused-test-hash", "Search Bob"]
  );
  const aliceId = Number(one("SELECT id FROM users WHERE username = ?", ["search-alice"]).id);
  const bobId = Number(one("SELECT id FROM users WHERE username = ?", ["search-bob"]).id);
  const alice = {
    id: aliceId,
    roles: roles(
      ["budget", "budget_user"],
      ["site-tracker", "site_tracker_user"],
      ["tasks", "task_user"],
      ["notes", "note_user"],
      ["calendar", "calendar_user"]
    ),
  };
  const bob = {
    id: bobId,
    roles: roles(
      ["budget", "budget_user"],
      ["site-tracker", "site_tracker_user"],
      ["tasks", "task_user"],
      ["notes", "note_user"],
      ["calendar", "calendar_user"]
    ),
  };
  const noAccess = { id: aliceId, roles: [] };

  const bankTypeId = Number(
    one("SELECT id FROM account_types WHERE name != 'Site account' ORDER BY id LIMIT 1").id
  );
  const siteTypeId = Number(
    one("SELECT id FROM account_types WHERE name = 'Site account' LIMIT 1").id
  );

  exec(
    `INSERT INTO accounts
      (user_id, owner_user_id, name, account_type_id, notes, site_password)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [aliceId, aliceId, "ScopeProbe Budget", bankTypeId, "alice-budget", null]
  );
  const aliceBudgetId = Number(one("SELECT last_insert_rowid() AS id").id);
  exec(
    `INSERT INTO accounts
      (user_id, owner_user_id, name, account_type_id, login_url, site_username, notes, site_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      aliceId,
      aliceId,
      "ScopeProbe Site",
      siteTypeId,
      "https://scopeprobe.test",
      "safe-user",
      "alice-site",
      "NeverReturnSecretProbe",
    ]
  );
  exec(
    `INSERT INTO accounts
      (user_id, owner_user_id, name, account_type_id, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [bobId, bobId, "CrossUserProbe Account", bankTypeId, "bob-only"]
  );
  exec(
    `INSERT INTO transactions
      (user_id, account_id, amount, description, transaction_date)
     VALUES (?, ?, ?, ?, ?)`,
    [aliceId, aliceBudgetId, -12.34, "ScopeProbe Transaction", "2026-08-20"]
  );

  exec("INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)", [
    aliceId,
    "RankProbe",
    "exact",
  ]);
  exec("INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)", [
    aliceId,
    "RankProbe prefix",
    "prefix",
  ]);
  exec("INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)", [
    aliceId,
    "Other title",
    "contains RankProbe in context",
  ]);
  exec("INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)", [
    bobId,
    "CrossUserProbe Task",
    "bob-only",
  ]);
  exec("INSERT INTO notes (user_id, title, content_plain) VALUES (?, ?, ?)", [
    bobId,
    "CrossUserProbe Note",
    "bob-only",
  ]);

  exec(
    `INSERT INTO calendar_events
      (title, start_at, end_at, notes, is_private, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "PrivacyProbe Public",
      "2026-08-20T10:00:00",
      "2026-08-20T11:00:00",
      "shared",
      0,
      bobId,
    ]
  );
  exec("INSERT INTO calendar_shopping_lists (name, created_by) VALUES (?, ?)", [
    "DeepLinkProbe List",
    aliceId,
  ]);
  const shoppingListId = Number(one("SELECT last_insert_rowid() AS id").id);
  exec(
    "INSERT INTO calendar_shopping_items (list_id, name, created_by) VALUES (?, ?, ?)",
    [shoppingListId, "DeepLinkProbe Item", aliceId]
  );
  const shoppingItemId = Number(one("SELECT last_insert_rowid() AS id").id);
  exec(
    `INSERT INTO calendar_events
      (title, start_at, end_at, notes, is_private, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "PrivacyProbe Bob Private",
      "2026-08-20T12:00:00",
      "2026-08-20T13:00:00",
      "bob-only",
      1,
      bobId,
    ]
  );
  exec(
    `INSERT INTO calendar_events
      (title, start_at, end_at, notes, is_private, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "PrivacyProbe Alice Private",
      "2026-08-20T14:00:00",
      "2026-08-20T15:00:00",
      "alice-only",
      1,
      aliceId,
    ]
  );

  exec(
    `INSERT INTO dashboard_reports
      (application, name, description, widget_kind, sql)
     VALUES ('budget', ?, ?, 'table', ?)`,
    ["ExcludedProbe Report", "must not search", "SELECT 'RawSqlProbe'"]
  );
  exec(
    "INSERT INTO system_logs (level, source, message) VALUES ('info', 'test', ?)",
    ["ExcludedProbe System"]
  );
  exec("CREATE TABLE troublehub_search_probe (id INTEGER PRIMARY KEY, secret TEXT)");
  exec("INSERT INTO troublehub_search_probe (secret) VALUES (?)", ["ExcludedProbe TroubleHub"]);

  assert.deepEqual(runGlobalSearch(null, { query: "ScopeProbe" }).results, []);
  assert.deepEqual(runGlobalSearch(noAccess, { query: "ScopeProbe" }).results, []);

  exec("UPDATE applications SET is_enabled = 0 WHERE name = 'tasks'");
  assert.deepEqual(runGlobalSearch(alice, { query: "RankProbe" }).results, []);
  exec("UPDATE applications SET is_enabled = 1 WHERE name = 'tasks'");

  assert.equal(runGlobalSearch(alice, { query: "CrossUserProbe" }).total, 0);
  assert.equal(runGlobalSearch(bob, { query: "CrossUserProbe" }).total, 3);

  const alicePrivacy = runGlobalSearch(alice, { query: "PrivacyProbe" }).results;
  assert.deepEqual(
    alicePrivacy.map((hit) => hit.title).sort(),
    ["PrivacyProbe Alice Private", "PrivacyProbe Public"]
  );
  const shoppingHit = runGlobalSearch(alice, { query: "DeepLinkProbe Item" }).results[0];
  assert.equal(
    shoppingHit.url,
    `/app/calendar?shopping=1&list=${shoppingListId}&item=${shoppingItemId}`
  );

  const budgetOnly = { id: aliceId, roles: roles(["budget", "budget_user"]) };
  const siteOnly = {
    id: aliceId,
    roles: roles(["site-tracker", "site_tracker_user"]),
  };
  assert.deepEqual(
    [...new Set(runGlobalSearch(budgetOnly, { query: "ScopeProbe" }).results.map((hit) => hit.app))],
    ["budget"]
  );
  assert.deepEqual(
    [...new Set(runGlobalSearch(siteOnly, { query: "ScopeProbe" }).results.map((hit) => hit.app))],
    ["site-tracker"]
  );

  assert.equal(runGlobalSearch(alice, { query: "NeverReturnSecretProbe" }).total, 0);
  const safeSiteResult = runGlobalSearch(alice, { query: "ScopeProbe Site" }).results[0];
  assert.ok(safeSiteResult);
  assert.equal(JSON.stringify(safeSiteResult).includes("NeverReturnSecretProbe"), false);
  assert.equal(Object.hasOwn(safeSiteResult, "sql"), false);
  assert.equal(Object.hasOwn(safeSiteResult, "password"), false);

  const firstPage = runGlobalSearch(alice, { query: "RankProbe", limit: 1, offset: 0 });
  const secondPage = runGlobalSearch(alice, { query: "RankProbe", limit: 1, offset: 1 });
  assert.equal(firstPage.total, 3);
  assert.equal(firstPage.has_more, true);
  assert.equal(firstPage.results[0].title, "RankProbe");
  assert.equal(secondPage.results[0].title, "RankProbe prefix");
  assert.ok(firstPage.results[0].rank > secondPage.results[0].rank);

  for (const forbiddenApp of ["troublehub", "system", "admin", "reports"]) {
    assert.equal(Object.hasOwn(GLOBAL_SEARCH_ALLOWLIST, forbiddenApp), false);
  }
  const excluded = runGlobalSearch(alice, { query: "ExcludedProbe" });
  assert.equal(excluded.total, 0);
  assert.equal(JSON.stringify(excluded).includes("RawSqlProbe"), false);

  console.log("Global search security assertions passed.");
} finally {
  db.close();
}
