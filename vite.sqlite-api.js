import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.resolve(process.cwd(), "data", "mydb.db");
const db = new DatabaseSync(dbPath);
const SYSTEM_DICTIONARY_TABLE = "system_dictionary";
const APPLICATIONS_TABLE = "applications";
const USERS_TABLE = "users";
const USER_ROLES_TABLE = "user_roles";

// Tables excluded from auto-discovery in the dictionary
const SYSTEM_TABLES = new Set(["system_dictionary", "applications", "users", "user_roles"]);

// In-memory sessions: token → user object (cleared on server restart)
const sessions = new Map();

const hashPassword = (pwd) => createHash("sha256").update(pwd).digest("hex");
const generateToken = () => randomBytes(32).toString("hex");

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
};

const getUserRoles = (userId) =>
  all(`SELECT application, role FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [userId]);

const setUserRoles = (userId, roles) => {
  run(`DELETE FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [userId]);
  for (const { application, role } of roles) {
    run(
      `INSERT INTO ${USER_ROLES_TABLE} (user_id, application, role) VALUES (?, ?, ?)`,
      [userId, application, role]
    );
  }
  // Update any active sessions for this user so role changes take effect immediately
  for (const [token, sessionUser] of sessions.entries()) {
    if (sessionUser.id === userId) {
      sessions.set(token, { ...sessionUser, roles: getUserRoles(userId) });
    }
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
      run(
        `
          INSERT OR IGNORE INTO ${SYSTEM_DICTIONARY_TABLE}
          ("table", application, application_id, name, label, type, data_type, ref_table, required, sort_order)
          VALUES (?, ?, ?, ?, ?, 'field', ?, ?, ?, ?)
        `,
        [
          tableName,
          defaultApplicationName,
          defaultApplicationId,
          column.name,
          formatLabel(column.name),
          column.type || null,
          foreignKeyMap[column.name] ?? null,
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
};

ensureApplications();
ensureUsers();
ensureUserRoles();
ensureSystemDictionary();

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

  if (readStatements.has(statementType)) {
    return { rows: all(sql, params) };
  }

  return run(sql, params);
};

const crudDb = ({
  action,
  table,
  data = {},
  where = "",
  whereParams = [],
  columns = ["*"],
  limit,
}) => {
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
      const limitClause =
        Number.isInteger(limit) && limit > 0 ? ` LIMIT ${limit}` : "";
      return {
        rows: all(
          `SELECT ${safeColumns} FROM ${safeTable}${whereClause}${limitClause}`,
          whereParams
        ),
      };
    }
    case "insert": {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        throw new Error("data is required for insert.");
      }

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
    }
    case "update": {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        throw new Error("data is required for update.");
      }
      if (!where) {
        throw new Error("where is required for update.");
      }

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
    }
    case "delete": {
      if (!where) {
        throw new Error("where is required for delete.");
      }

      return run(`DELETE FROM ${safeTable} WHERE ${where}`, whereParams);
    }
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
};

const getTokenFromHeader = (req) => {
  const authHeader = req.headers["authorization"] ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim() || null;
};

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
          if (req.method === "GET" && req.url === "/api/health") {
            json(res, 200, { ok: true });
            return;
          }

          // ── Auth endpoints ──────────────────────────────────────────────
          if (req.method === "POST" && req.url === "/api/auth/login") {
            const { username, password } = await readBody(req);
            if (!username || !password) {
              json(res, 400, { error: "Username and password are required." });
              return;
            }
            const user = all(
              `SELECT id, username, password, display_name, role FROM ${USERS_TABLE} WHERE username = ? LIMIT 1`,
              [username]
            )[0];
            if (!user || user.password !== hashPassword(password)) {
              json(res, 401, { error: "Invalid username or password." });
              return;
            }
            const token = generateToken();
            const roles = getUserRoles(user.id);
            const sessionUser = {
              id: user.id,
              username: user.username,
              display_name: user.display_name,
              roles,
            };
            sessions.set(token, sessionUser);
            json(res, 200, { token, user: sessionUser });
            return;
          }

          if (req.method === "GET" && req.url === "/api/auth/me") {
            const token = getTokenFromHeader(req);
            const user = token ? sessions.get(token) : null;
            if (!user) {
              json(res, 401, { error: "Unauthorized." });
              return;
            }
            json(res, 200, { user });
            return;
          }

          if (req.method === "POST" && req.url === "/api/auth/logout") {
            const token = getTokenFromHeader(req);
            if (token) sessions.delete(token);
            json(res, 200, { ok: true });
            return;
          }

          // ── User management endpoints ───────────────────────────────────
          if (req.method === "GET" && req.url === "/api/auth/users") {
            const rows = all(`SELECT id, username, display_name FROM ${USERS_TABLE} ORDER BY id`);
            const users = rows.map((u) => ({ ...u, roles: getUserRoles(u.id) }));
            json(res, 200, { users });
            return;
          }

          if (req.method === "POST" && req.url === "/api/auth/users") {
            const { username, password, display_name } = await readBody(req);
            if (!username || !password) {
              json(res, 400, { error: "Username and password are required." });
              return;
            }
            const result = run(
              `INSERT INTO ${USERS_TABLE} (username, password, display_name) VALUES (?, ?, ?)`,
              [username.trim(), hashPassword(password), display_name?.trim() || null]
            );
            json(res, 200, { id: result.lastID });
            return;
          }

          if (req.method === "PUT" && req.url.match(/^\/api\/auth\/users\/\d+\/roles$/)) {
            const id = Number(req.url.split("/")[4]);
            const { roles } = await readBody(req);
            if (!Array.isArray(roles)) { json(res, 400, { error: "roles must be an array." }); return; }
            setUserRoles(id, roles);
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "GET" && req.url.match(/^\/api\/auth\/users\/\d+\/roles$/)) {
            const id = Number(req.url.split("/")[4]);
            json(res, 200, { roles: getUserRoles(id) });
            return;
          }

          if (req.method === "PUT" && req.url.match(/^\/api\/auth\/users\/\d+$/)) {
            const id = Number(req.url.split("/").pop());
            const { username, password, display_name } = await readBody(req);
            if (!username) { json(res, 400, { error: "Username is required." }); return; }
            if (password) {
              run(
                `UPDATE ${USERS_TABLE} SET username=?, display_name=?, password=? WHERE id=?`,
                [username.trim(), display_name?.trim() || null, hashPassword(password), id]
              );
            } else {
              run(
                `UPDATE ${USERS_TABLE} SET username=?, display_name=? WHERE id=?`,
                [username.trim(), display_name?.trim() || null, id]
              );
            }
            json(res, 200, { ok: true });
            return;
          }

          if (req.method === "DELETE" && req.url.match(/^\/api\/auth\/users\/\d+$/)) {
            const id = Number(req.url.split("/").pop());
            run(`DELETE FROM ${USER_ROLES_TABLE} WHERE user_id = ?`, [id]);
            run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [id]);
            json(res, 200, { ok: true });
            return;
          }

          // ── DB endpoints ────────────────────────────────────────────────
          if (req.method === "GET" && req.url === "/api/db/tables") {
            json(res, 200, { tables: getTables() });
            return;
          }

          if (req.method === "POST" && req.url === "/api/db/query") {
            const body = await readBody(req);
            json(res, 200, queryDb(body));
            return;
          }

          if (req.method === "POST" && req.url === "/api/db/crud") {
            const body = await readBody(req);
            json(res, 200, crudDb(body));
            return;
          }

          if (req.method === "POST" && req.url === "/api/admin/reseed-dictionary") {
            const before = getDictionaryCounts();
            ensureSystemDictionary();
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

          json(res, 404, { error: "API route not found." });
        } catch (error) {
          json(res, 400, { error: error.message });
        }
      });
    },
  };
}
