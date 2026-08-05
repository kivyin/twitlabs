/**
 * Run SQLite schema ensure/migration with verbose logging.
 * Used by `npm run migrate`, postinstall, and prebuild.
 */
process.env.SQLITE_SCHEMA_LOG = "1";

const started = Date.now();
console.log("[schema] Running database schema migration…");

try {
  const api = await import("../vite.sqlite-api.js");
  const dbPath = api.getSqliteDatabasePath?.() || "(unknown)";
  api.closeSqliteDatabase?.();
  const elapsedMs = Date.now() - started;
  console.log(`[schema] Migration finished successfully (${elapsedMs}ms)`);
  console.log(`[schema] Database: ${dbPath}`);
  process.exit(0);
} catch (error) {
  console.error("[schema] Migration failed.");
  console.error(error?.stack || error);
  process.exit(1);
}
