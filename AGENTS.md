# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
`TwitApps` (package `my-first-react-app`, repo `twitlabs`) is a single React 19 + Vite 8 single-page app that bundles several mini-apps (Tasks, Notes, Training, Calendar, Decision Picker, Home Inventory, Budget/Site Tracker, TroubleHub) plus an Admin area. There is **one service**: the Vite dev server. The backend API is not a separate process — it is implemented as Vite dev-server plugins (`vite.sqlite-api.js` and the other `vite.*-api.js` files) that serve `/api/*` from the same port. Data is stored in a local SQLite database at `data/mydb.db` using Node's experimental `node:sqlite` (Node 22 required).

### Running (the only service)
- Dev (frontend + API): `npm run dev` → serves on `http://localhost:5173` (host `0.0.0.0`, strict port). See `package.json` scripts for `lint`, `build`, `preview`, `serve`, `migrate`.
- Default login: username `admin`, password `admin`. The first login forces a password change.

### CRITICAL startup caveat: the schema migration is NOT idempotent
The SQLite schema is (re)built on every import of `vite.sqlite-api.js` (so on `npm run dev` startup, on `npm install` via `postinstall`, and on `npm run build` via `prebuild`). There is a pre-existing bug: `ensureAccountsSchema` references a `transactions` table that **is never created** by the migration. Because of this:
- Against a **fresh** DB (no `accounts` table yet) the migration succeeds — the `accounts` step creates the table and returns early, skipping the `transactions`-referencing UPDATE.
- Against **any already-migrated** DB (an `accounts` table exists but no `transactions` table) the migration **crashes** with `Error: no such table: transactions`, which prevents the dev server from starting.

Practical consequences and the fix:
- To start (or restart) the dev server, start from a clean DB: `rm -f data/mydb.db* && npm run dev`. The `data/` DB file is gitignored/ephemeral and is recreated on startup.
- This means the local DB does **not** survive a dev-server restart. Treat local data as throwaway; reset with `rm -f data/mydb.db*` whenever you see the `no such table: transactions` error.
- `npm run build` currently fails at the `prebuild` migrate step for the same reason. Dev mode (`npm run dev`) is the supported/working flow; do not treat the build failure as an environment/setup problem.
- Do not "fix" this by editing the migration unless that is the actual task — it is app source, not environment setup.

### Other non-obvious notes
- `npm run lint` runs but currently reports ~100 pre-existing errors (mostly `no-undef`/`no-unused-vars` in the `vite.*-api.js` files). This is the repo's current state, not a setup failure.
- After the forced first-login password change, the app can briefly show a `403 Access denied` page ("You must change the default admin password before continuing"); navigate to `/` to reach the "Your workspaces" home. Logging in again with the new password goes straight into the app.
- Optional env vars live in `.env.example` (e.g. `SQLITE_DATA_DIR`, `SQLITE_DB_PATH`, `GEMINI_API_KEY` for receipt scanning). None are required to run the app.
