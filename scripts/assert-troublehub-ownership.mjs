import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TROUBLEHUB_TABLES } from "../vite.troublehub-api.js";

const scriptPath = fileURLToPath(import.meta.url);

if (process.env.TROUBLEHUB_OWNERSHIP_ASSERT_CHILD !== "1") {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "twitlabs-troublehub-"));
  const dbPath = path.join(tempRoot, "ownership.db");
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
      TROUBLEHUB_OWNERSHIP_ASSERT_CHILD: "1",
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

try {
  await import(
    `${pathToFileURL(path.resolve("vite.sqlite-api.js")).href}?troublehub-ownership-assert=1`
  );

  const db = new DatabaseSync(process.env.SQLITE_DB_PATH);
  const app = db.prepare("SELECT id FROM applications WHERE name = 'troublehub'").get();
  assert.ok(app, "TroubleHub application must exist");

  for (const tableName of TROUBLEHUB_TABLES) {
    const collection = db
      .prepare(
        `SELECT application, application_id
         FROM system_dictionary
         WHERE type = 'collection' AND name = ?`
      )
      .get(tableName);
    if (!collection) continue;
    assert.equal(collection.application, "troublehub", `${tableName} collection owner`);
    assert.equal(Number(collection.application_id), Number(app.id), `${tableName} collection app id`);

    const wrongFields = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM system_dictionary
         WHERE type = 'field' AND "table" = ?
           AND (application != 'troublehub' OR application_id != ?)`
      )
      .get(tableName, app.id);
    assert.equal(Number(wrongFields.count), 0, `${tableName} field owners`);

    const staleNav = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM system_navigation
         WHERE path LIKE ? AND application != 'troublehub'`
      )
      .get(`%/${tableName}`);
    assert.equal(Number(staleNav.count), 0, `${tableName} stale navigation owners`);
  }

  const troubleMain = db
    .prepare("SELECT id FROM system_navigation WHERE path = '/app/troublehub'")
    .get();
  assert.ok(troubleMain, "TroubleHub main navigation must exist");

  const visibleTableLinks = db
    .prepare(
      `SELECT path, application, parent_id
       FROM system_navigation
       WHERE application = 'troublehub' AND path LIKE '/app/troublehub/troublehub_%'`
    )
    .all();
  for (const item of visibleTableLinks) {
    assert.equal(Number(item.parent_id), Number(troubleMain.id), `${item.path} parent`);
  }
  db.close();
  console.log("TroubleHub ownership assertions passed.");
} finally {
  // The imported server module owns its database handle until this child exits.
}
