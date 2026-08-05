/**
 * Calendar app schema + HTTP handlers.
 * Installed into vite.sqlite-api.js via installCalendarApi(deps).
 */

export const CALENDAR_EVENTS_TABLE = "calendar_events";
export const CALENDAR_SHOPPING_LISTS_TABLE = "calendar_shopping_lists";
export const CALENDAR_SHOPPING_ITEMS_TABLE = "calendar_shopping_items";

const RECURRENCE_VALUES = new Set([
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
]);

const MAX_OCCURRENCES_PER_SERIES = 800;

function pad2(value) {
  return String(value).padStart(2, "0");
}

/** Normalize to `YYYY-MM-DDTHH:mm:ss` wall-clock local string (no timezone suffix). */
function normalizeDateTime(value, { endOfDay = false } = {}) {
  if (value == null || value === "") {
    return null;
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return endOfDay ? `${raw}T23:59:59` : `${raw}T00:00:00`;
  }
  const match = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) {
    throw new Error("Invalid date/time. Use YYYY-MM-DDTHH:mm or YYYY-MM-DD.");
  }
  const [, datePart, hour, minute, second = "00"] = match;
  return `${datePart}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

function parseLocalDateTime(value) {
  const normalized = normalizeDateTime(value);
  if (!normalized) return null;
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss)
  );
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function addMonthsClamped(date, months) {
  const day = date.getDate();
  const next = new Date(
    date.getFullYear(),
    date.getMonth() + months,
    1,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function advanceOccurrence(date, recurrence) {
  switch (recurrence) {
    case "daily":
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
    case "weekly":
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 7,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
    case "biweekly":
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 14,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
    case "monthly":
      return addMonthsClamped(date, 1);
    case "yearly":
      return addMonthsClamped(date, 12);
    default:
      return null;
  }
}

function normalizeRecurrence(value) {
  const raw = String(value ?? "none")
    .trim()
    .toLowerCase();
  if (!raw || raw === "null") return null;
  if (!RECURRENCE_VALUES.has(raw)) {
    throw new Error(
      "Recurrence must be none, daily, weekly, biweekly, monthly, or yearly."
    );
  }
  return raw === "none" ? null : raw;
}

function parseEventPayload(body = {}) {
  const title = String(body.title ?? "").trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const allDay = Boolean(body.all_day);
  const startAt = normalizeDateTime(body.start_at, { endOfDay: false });
  const endAt = normalizeDateTime(body.end_at, { endOfDay: allDay });
  if (!startAt || !endAt) {
    throw new Error("Start and end date/time are required.");
  }
  if (endAt <= startAt) {
    throw new Error("End must be after start.");
  }

  const assigneeRaw = body.assignee_user_id;
  const assigneeUserId =
    assigneeRaw === null || assigneeRaw === undefined || assigneeRaw === ""
      ? null
      : Number(assigneeRaw);
  if (assigneeUserId != null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
    throw new Error("Invalid assignee user.");
  }

  const notes = body.notes == null ? null : String(body.notes);
  const color = body.color == null || body.color === "" ? null : String(body.color).trim();
  const recurrence = normalizeRecurrence(body.recurrence);
  let recurrenceUntil = null;
  if (body.recurrence_until != null && String(body.recurrence_until).trim() !== "") {
    recurrenceUntil = normalizeDateTime(body.recurrence_until, { endOfDay: true });
  }
  if (recurrence && recurrenceUntil && recurrenceUntil < startAt) {
    throw new Error("Repeat until date must be on or after the start date.");
  }

  return {
    title,
    assignee_user_id: assigneeUserId,
    start_at: startAt,
    end_at: endAt,
    notes,
    color,
    all_day: allDay ? 1 : 0,
    recurrence,
    recurrence_until: recurrence ? recurrenceUntil : null,
  };
}

export function installCalendarApi(deps) {
  const {
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    isSessionAdmin,
    userCanAccessApp,
    userCanEditCalendar,
    json,
    readBody,
    sendApiError,
    USERS_TABLE,
  } = deps;

  const hasColumn = (table, column) =>
    all(`PRAGMA table_info(${table})`).some((entry) => entry.name === column);

  const ensureCalendarSchema = () => {
    run(`
      CREATE TABLE IF NOT EXISTS ${CALENDAR_EVENTS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        assignee_user_id INTEGER,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        notes TEXT,
        color TEXT,
        all_day INTEGER NOT NULL DEFAULT 0,
        recurrence TEXT,
        recurrence_until TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);
    if (!hasColumn(CALENDAR_EVENTS_TABLE, "recurrence")) {
      run(`ALTER TABLE ${CALENDAR_EVENTS_TABLE} ADD COLUMN recurrence TEXT`);
    }
    if (!hasColumn(CALENDAR_EVENTS_TABLE, "recurrence_until")) {
      run(`ALTER TABLE ${CALENDAR_EVENTS_TABLE} ADD COLUMN recurrence_until TEXT`);
    }
    run(
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON ${CALENDAR_EVENTS_TABLE} (start_at)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_end ON ${CALENDAR_EVENTS_TABLE} (end_at)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_assignee ON ${CALENDAR_EVENTS_TABLE} (assignee_user_id)`
    );

    run(`
      CREATE TABLE IF NOT EXISTS ${CALENDAR_SHOPPING_LISTS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);
    run(`
      CREATE TABLE IF NOT EXISTS ${CALENDAR_SHOPPING_ITEMS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        purchased INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);
    run(
      `CREATE INDEX IF NOT EXISTS idx_calendar_shopping_items_list ON ${CALENDAR_SHOPPING_ITEMS_TABLE} (list_id, sort_order, id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_calendar_shopping_lists_status ON ${CALENDAR_SHOPPING_LISTS_TABLE} (status, id)`
    );
  };

  const assertCalendarAccess = (user) => {
    if (!userCanAccessApp(user, "calendar")) {
      throw new Error("Calendar access required.");
    }
  };

  const assertCalendarEdit = (user) => {
    assertCalendarAccess(user);
    if (!userCanEditCalendar(user) && !isSessionAdmin(user)) {
      throw new Error("Calendar edit access required.");
    }
  };

  const mapEventRow = (row, overrides = {}) => {
    if (!row) return null;
    const recurrence = row.recurrence || null;
    return {
      id: row.id,
      title: row.title,
      assignee_user_id: row.assignee_user_id,
      assignee_name: row.assignee_name || null,
      start_at: overrides.start_at ?? row.start_at,
      end_at: overrides.end_at ?? row.end_at,
      notes: row.notes,
      color: row.color,
      all_day: Boolean(row.all_day),
      recurrence,
      recurrence_until: row.recurrence_until || null,
      is_recurring: Boolean(recurrence),
      series_start_at: row.start_at,
      series_end_at: row.end_at,
      occurrence_id: overrides.occurrence_id || null,
      created_by: row.created_by,
      created_on: row.created_on,
      updated_by: row.updated_by,
      updated_on: row.updated_on,
    };
  };

  const getEventById = (id) => {
    const row = all(
      `
        SELECT e.*,
               COALESCE(u.display_name, u.username) AS assignee_name
        FROM ${CALENDAR_EVENTS_TABLE} e
        LEFT JOIN ${USERS_TABLE} u ON u.id = e.assignee_user_id
        WHERE e.id = ?
        LIMIT 1
      `,
      [id]
    )[0];
    return mapEventRow(row);
  };

  const expandRecurringEvent = (row, rangeFrom, rangeTo) => {
    const recurrence = row.recurrence;
    if (!recurrence) return [];

    const seriesStart = parseLocalDateTime(row.start_at);
    const seriesEnd = parseLocalDateTime(row.end_at);
    if (!seriesStart || !seriesEnd || seriesEnd <= seriesStart) return [];

    const durationMs = seriesEnd.getTime() - seriesStart.getTime();
    const rangeStart = rangeFrom ? parseLocalDateTime(rangeFrom) : null;
    const rangeEnd = rangeTo ? parseLocalDateTime(rangeTo) : null;
    const until = row.recurrence_until ? parseLocalDateTime(row.recurrence_until) : null;

    const instances = [];
    let cursor = new Date(seriesStart.getTime());
    let guard = 0;

    // Fast-forward near the visible window for long-running series (e.g. birthdays).
    while (
      rangeStart &&
      guard < MAX_OCCURRENCES_PER_SERIES &&
      (() => {
        const occEnd = new Date(cursor.getTime() + durationMs);
        return occEnd <= rangeStart;
      })()
    ) {
      const next = advanceOccurrence(cursor, recurrence);
      if (!next || next.getTime() <= cursor.getTime()) break;
      cursor = next;
      guard += 1;
      if (until && cursor > until) return instances;
    }

    while (guard < MAX_OCCURRENCES_PER_SERIES) {
      if (until && cursor > until) break;
      const occStart = new Date(cursor.getTime());
      const occEnd = new Date(occStart.getTime() + durationMs);
      const startsBeforeRangeEnd = !rangeEnd || occStart < rangeEnd;
      const endsAfterRangeStart = !rangeStart || occEnd > rangeStart;
      if (!startsBeforeRangeEnd) break;
      if (endsAfterRangeStart) {
        const startAt = formatLocalDateTime(occStart);
        const endAt = formatLocalDateTime(occEnd);
        instances.push(
          mapEventRow(row, {
            start_at: startAt,
            end_at: endAt,
            occurrence_id: `${row.id}:${startAt}`,
          })
        );
      }
      const next = advanceOccurrence(cursor, recurrence);
      if (!next || next.getTime() <= cursor.getTime()) break;
      cursor = next;
      guard += 1;
    }

    return instances;
  };

  const listEvents = ({ from, to } = {}) => {
    const fromAt = from ? normalizeDateTime(from, { endOfDay: false }) : null;
    const toAt = to ? normalizeDateTime(to, { endOfDay: true }) : null;

    const oneOffParams = [];
    let oneOffWhere =
      "(e.recurrence IS NULL OR TRIM(e.recurrence) = '' OR e.recurrence = 'none')";
    if (fromAt && toAt) {
      oneOffWhere += " AND e.start_at < ? AND e.end_at > ?";
      oneOffParams.push(toAt, fromAt);
    } else if (fromAt) {
      oneOffWhere += " AND e.end_at > ?";
      oneOffParams.push(fromAt);
    } else if (toAt) {
      oneOffWhere += " AND e.start_at < ?";
      oneOffParams.push(toAt);
    }

    const oneOffRows = all(
      `
        SELECT e.*,
               COALESCE(u.display_name, u.username) AS assignee_name
        FROM ${CALENDAR_EVENTS_TABLE} e
        LEFT JOIN ${USERS_TABLE} u ON u.id = e.assignee_user_id
        WHERE ${oneOffWhere}
        ORDER BY e.start_at ASC, e.id ASC
      `,
      oneOffParams
    );

    const recurringParams = [];
    let recurringWhere =
      "e.recurrence IS NOT NULL AND TRIM(e.recurrence) != '' AND e.recurrence != 'none'";
    if (toAt) {
      recurringWhere += " AND e.start_at < ?";
      recurringParams.push(toAt);
    }
    if (fromAt) {
      recurringWhere += " AND (e.recurrence_until IS NULL OR e.recurrence_until >= ?)";
      recurringParams.push(fromAt);
    }

    const recurringRows = all(
      `
        SELECT e.*,
               COALESCE(u.display_name, u.username) AS assignee_name
        FROM ${CALENDAR_EVENTS_TABLE} e
        LEFT JOIN ${USERS_TABLE} u ON u.id = e.assignee_user_id
        WHERE ${recurringWhere}
        ORDER BY e.start_at ASC, e.id ASC
      `,
      recurringParams
    );

    const events = [
      ...oneOffRows.map((row) => mapEventRow(row)),
      ...recurringRows.flatMap((row) => expandRecurringEvent(row, fromAt, toAt)),
    ];

    events.sort((a, b) => {
      if (a.start_at === b.start_at) return a.id - b.id;
      return a.start_at < b.start_at ? -1 : 1;
    });
    return events;
  };

  const createEvent = (body, actingUserId) => {
    const payload = parseEventPayload(body);
    if (payload.assignee_user_id != null) {
      const user = all(`SELECT id FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`, [
        payload.assignee_user_id,
      ])[0];
      if (!user) {
        throw new Error("Assignee user not found.");
      }
    }
    const result = insertAuditedRow(CALENDAR_EVENTS_TABLE, payload, actingUserId);
    return getEventById(result.lastID);
  };

  const updateEvent = (id, body, actingUserId) => {
    const existing = getEventById(id);
    if (!existing) {
      throw new Error("Event not found.");
    }
    const payload = parseEventPayload({
      title: body.title ?? existing.title,
      assignee_user_id:
        body.assignee_user_id !== undefined
          ? body.assignee_user_id
          : existing.assignee_user_id,
      start_at: body.start_at ?? existing.series_start_at ?? existing.start_at,
      end_at: body.end_at ?? existing.series_end_at ?? existing.end_at,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      color: body.color !== undefined ? body.color : existing.color,
      all_day: body.all_day !== undefined ? body.all_day : existing.all_day,
      recurrence: body.recurrence !== undefined ? body.recurrence : existing.recurrence || "none",
      recurrence_until:
        body.recurrence_until !== undefined
          ? body.recurrence_until
          : existing.recurrence_until,
    });
    if (payload.assignee_user_id != null) {
      const user = all(`SELECT id FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`, [
        payload.assignee_user_id,
      ])[0];
      if (!user) {
        throw new Error("Assignee user not found.");
      }
    }
    updateAuditedRow(CALENDAR_EVENTS_TABLE, payload, "id = ?", [id], actingUserId);
    return getEventById(id);
  };

  const deleteEvent = (id, actingUserId) => {
    const existing = getEventById(id);
    if (!existing) {
      throw new Error("Event not found.");
    }
    archiveAndDeleteRowsInternal(CALENDAR_EVENTS_TABLE, "id = ?", [id], actingUserId);
  };

  const listAssignableUsers = () =>
    all(
      `
        SELECT id, username, display_name
        FROM ${USERS_TABLE}
        ORDER BY COALESCE(display_name, username) COLLATE NOCASE, username COLLATE NOCASE
      `
    ).map((row) => ({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      label: row.display_name || row.username,
    }));

  const mapShoppingItem = (row) =>
    row
      ? {
          id: row.id,
          list_id: row.list_id,
          name: row.name,
          purchased: Boolean(row.purchased),
          sort_order: Number(row.sort_order) || 0,
          created_on: row.created_on,
          updated_on: row.updated_on,
        }
      : null;

  const mapShoppingList = (row, { withItems = false } = {}) => {
    if (!row) return null;
    const itemStats = all(
      `
        SELECT
          COUNT(*) AS total_count,
          SUM(CASE WHEN purchased = 1 THEN 1 ELSE 0 END) AS purchased_count
        FROM ${CALENDAR_SHOPPING_ITEMS_TABLE}
        WHERE list_id = ?
      `,
      [row.id]
    )[0];
    const list = {
      id: row.id,
      name: row.name,
      status: row.status === "closed" ? "closed" : "active",
      item_count: Number(itemStats?.total_count) || 0,
      purchased_count: Number(itemStats?.purchased_count) || 0,
      created_on: row.created_on,
      updated_on: row.updated_on,
    };
    if (withItems) {
      list.items = all(
        `
          SELECT * FROM ${CALENDAR_SHOPPING_ITEMS_TABLE}
          WHERE list_id = ?
          ORDER BY purchased ASC, sort_order ASC, id ASC
        `,
        [row.id]
      ).map(mapShoppingItem);
    }
    return list;
  };

  const getShoppingListOrThrow = (listId, { withItems = false } = {}) => {
    const row = all(
      `SELECT * FROM ${CALENDAR_SHOPPING_LISTS_TABLE} WHERE id = ? LIMIT 1`,
      [listId]
    )[0];
    if (!row) throw new Error("Shopping list not found.");
    return mapShoppingList(row, { withItems });
  };

  const listShoppingLists = ({ includeClosed = false } = {}) => {
    const rows = includeClosed
      ? all(
          `
            SELECT * FROM ${CALENDAR_SHOPPING_LISTS_TABLE}
            ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_on DESC, id DESC
          `
        )
      : all(
          `
            SELECT * FROM ${CALENDAR_SHOPPING_LISTS_TABLE}
            WHERE status = 'active'
            ORDER BY updated_on DESC, id DESC
          `
        );
    return rows.map((row) => mapShoppingList(row));
  };

  const createShoppingList = (body, actingUserId) => {
    const name = String(body?.name ?? "").trim();
    if (!name) throw new Error("Shopping list name is required.");
    const result = insertAuditedRow(
      CALENDAR_SHOPPING_LISTS_TABLE,
      { name, status: "active" },
      actingUserId
    );
    return getShoppingListOrThrow(result.lastID, { withItems: true });
  };

  const updateShoppingList = (listId, body, actingUserId) => {
    const existing = getShoppingListOrThrow(listId);
    const data = {};
    if (body?.name !== undefined) {
      const name = String(body.name ?? "").trim();
      if (!name) throw new Error("Shopping list name is required.");
      data.name = name;
    }
    if (body?.status !== undefined) {
      const status = String(body.status || "").trim().toLowerCase();
      if (status !== "active" && status !== "closed") {
        throw new Error('Status must be "active" or "closed".');
      }
      data.status = status;
    }
    if (Object.keys(data).length === 0) {
      return existing;
    }
    updateAuditedRow(CALENDAR_SHOPPING_LISTS_TABLE, data, "id = ?", [listId], actingUserId);
    return getShoppingListOrThrow(listId, { withItems: true });
  };

  const deleteShoppingList = (listId, actingUserId) => {
    getShoppingListOrThrow(listId);
    run(`DELETE FROM ${CALENDAR_SHOPPING_ITEMS_TABLE} WHERE list_id = ?`, [listId]);
    archiveAndDeleteRowsInternal(CALENDAR_SHOPPING_LISTS_TABLE, "id = ?", [listId], actingUserId);
  };

  const getShoppingItemOrThrow = (itemId) => {
    const row = all(
      `SELECT * FROM ${CALENDAR_SHOPPING_ITEMS_TABLE} WHERE id = ? LIMIT 1`,
      [itemId]
    )[0];
    if (!row) throw new Error("Shopping item not found.");
    return mapShoppingItem(row);
  };

  const createShoppingItem = (listId, body, actingUserId) => {
    getShoppingListOrThrow(listId);
    const name = String(body?.name ?? "").trim();
    if (!name) throw new Error("Item name is required.");
    const maxOrder = all(
      `SELECT MAX(sort_order) AS max_order FROM ${CALENDAR_SHOPPING_ITEMS_TABLE} WHERE list_id = ?`,
      [listId]
    )[0];
    const result = insertAuditedRow(
      CALENDAR_SHOPPING_ITEMS_TABLE,
      {
        list_id: listId,
        name,
        purchased: 0,
        sort_order: (Number(maxOrder?.max_order) || 0) + 1,
      },
      actingUserId
    );
    return getShoppingItemOrThrow(result.lastID);
  };

  const updateShoppingItem = (itemId, body, actingUserId) => {
    const existing = getShoppingItemOrThrow(itemId);
    const data = {};
    if (body?.name !== undefined) {
      const name = String(body.name ?? "").trim();
      if (!name) throw new Error("Item name is required.");
      data.name = name;
    }
    if (body?.purchased !== undefined) {
      data.purchased = body.purchased ? 1 : 0;
    }
    if (body?.list_id !== undefined) {
      const targetListId = Number(body.list_id);
      if (!Number.isInteger(targetListId) || targetListId <= 0) {
        throw new Error("Invalid target shopping list.");
      }
      if (targetListId !== existing.list_id) {
        getShoppingListOrThrow(targetListId);
        const maxOrder = all(
          `SELECT MAX(sort_order) AS max_order FROM ${CALENDAR_SHOPPING_ITEMS_TABLE} WHERE list_id = ?`,
          [targetListId]
        )[0];
        data.list_id = targetListId;
        data.sort_order = (Number(maxOrder?.max_order) || 0) + 1;
      }
    }
    if (Object.keys(data).length === 0) {
      return existing;
    }
    updateAuditedRow(CALENDAR_SHOPPING_ITEMS_TABLE, data, "id = ?", [itemId], actingUserId);
    return getShoppingItemOrThrow(itemId);
  };

  const deleteShoppingItem = (itemId, actingUserId) => {
    getShoppingItemOrThrow(itemId);
    archiveAndDeleteRowsInternal(CALENDAR_SHOPPING_ITEMS_TABLE, "id = ?", [itemId], actingUserId);
  };

  const handleCalendarApi = async (req, res, getSessionUser) => {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    if (!path.startsWith("/api/calendar")) {
      return false;
    }

    const actingUser = getSessionUser(req);
    if (!actingUser) {
      sendApiError(res, req, 401, "Unauthorized.", { function_name: "calendarApi" });
      return true;
    }

    try {
      if (req.method === "GET" && path === "/api/calendar/events") {
        assertCalendarAccess(actingUser);
        const events = listEvents({
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
        });
        json(res, 200, {
          events,
          can_edit: userCanEditCalendar(actingUser) || isSessionAdmin(actingUser),
        });
        return true;
      }

      if (req.method === "POST" && path === "/api/calendar/events") {
        assertCalendarEdit(actingUser);
        const body = await readBody(req);
        json(res, 200, { event: createEvent(body, actingUser.id) });
        return true;
      }

      const eventMatch = path.match(/^\/api\/calendar\/events\/(\d+)$/);
      if (eventMatch) {
        const id = Number(eventMatch[1]);
        if (req.method === "GET") {
          assertCalendarAccess(actingUser);
          const event = getEventById(id);
          if (!event) {
            sendApiError(res, req, 404, "Event not found.", { function_name: "calendarApi" });
            return true;
          }
          json(res, 200, { event });
          return true;
        }
        if (req.method === "PUT") {
          assertCalendarEdit(actingUser);
          const body = await readBody(req);
          json(res, 200, { event: updateEvent(id, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          assertCalendarEdit(actingUser);
          deleteEvent(id, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      if (req.method === "GET" && path === "/api/calendar/users") {
        assertCalendarAccess(actingUser);
        json(res, 200, { users: listAssignableUsers() });
        return true;
      }

      // Shopping lists are available to every calendar role (including view / kiosk).
      if (req.method === "GET" && path === "/api/calendar/shopping-lists") {
        assertCalendarAccess(actingUser);
        const includeClosed =
          url.searchParams.get("include_closed") === "1" ||
          url.searchParams.get("include_closed") === "true";
        json(res, 200, { lists: listShoppingLists({ includeClosed }) });
        return true;
      }

      if (req.method === "POST" && path === "/api/calendar/shopping-lists") {
        assertCalendarAccess(actingUser);
        const body = await readBody(req);
        json(res, 200, { list: createShoppingList(body, actingUser.id) });
        return true;
      }

      const shoppingListMatch = path.match(/^\/api\/calendar\/shopping-lists\/(\d+)$/);
      if (shoppingListMatch) {
        const listId = Number(shoppingListMatch[1]);
        if (req.method === "GET") {
          assertCalendarAccess(actingUser);
          json(res, 200, { list: getShoppingListOrThrow(listId, { withItems: true }) });
          return true;
        }
        if (req.method === "PUT") {
          assertCalendarAccess(actingUser);
          const body = await readBody(req);
          json(res, 200, { list: updateShoppingList(listId, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          assertCalendarAccess(actingUser);
          deleteShoppingList(listId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      const shoppingListItemsMatch = path.match(
        /^\/api\/calendar\/shopping-lists\/(\d+)\/items$/
      );
      if (shoppingListItemsMatch && req.method === "POST") {
        assertCalendarAccess(actingUser);
        const listId = Number(shoppingListItemsMatch[1]);
        const body = await readBody(req);
        json(res, 200, { item: createShoppingItem(listId, body, actingUser.id) });
        return true;
      }

      const shoppingItemMatch = path.match(/^\/api\/calendar\/shopping-items\/(\d+)$/);
      if (shoppingItemMatch) {
        const itemId = Number(shoppingItemMatch[1]);
        if (req.method === "PUT") {
          assertCalendarAccess(actingUser);
          const body = await readBody(req);
          json(res, 200, { item: updateShoppingItem(itemId, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          assertCalendarAccess(actingUser);
          deleteShoppingItem(itemId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      sendApiError(res, req, 404, "Calendar API route not found.", {
        function_name: "calendarApi",
      });
      return true;
    } catch (calendarError) {
      const message = calendarError?.message || "Calendar request failed.";
      const statusCode =
        message === "Unauthorized."
          ? 401
          : /access required/i.test(message)
            ? 403
            : /not found/i.test(message)
              ? 404
              : 400;
      sendApiError(res, req, statusCode, calendarError, { function_name: "calendarApi" });
      return true;
    }
  };

  return {
    ensureCalendarSchema,
    handleCalendarApi,
    CALENDAR_EVENTS_TABLE,
    CALENDAR_SHOPPING_LISTS_TABLE,
    CALENDAR_SHOPPING_ITEMS_TABLE,
  };
}
