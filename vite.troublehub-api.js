/**
 * TroubleHub — explicit vault app + Match Mischief questionnaire.
 * System admins do NOT get access unless session-elevated (resets every login).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

import {
  createFantasiesApi,
  TROUBLEHUB_FANTASY_CARDS_TABLE,
  TROUBLEHUB_FANTASY_GAME_TABLE,
  TROUBLEHUB_FANTASY_PICKS_TABLE,
  TROUBLEHUB_FANTASY_ROUNDS_TABLE,
} from "./vite.troublehub-fantasies-api.js";

export const TROUBLEHUB_MATCH_CARDS_TABLE = "troublehub_match_cards";
export const TROUBLEHUB_MATCH_ANSWERS_TABLE = "troublehub_match_answers";
export const TROUBLEHUB_NOTIFICATIONS_TABLE = "troublehub_notifications";

export {
  TROUBLEHUB_FANTASY_CARDS_TABLE,
  TROUBLEHUB_FANTASY_GAME_TABLE,
  TROUBLEHUB_FANTASY_PICKS_TABLE,
  TROUBLEHUB_FANTASY_ROUNDS_TABLE,
};

export const TROUBLEHUB_APP = "troublehub";
export const TROUBLEHUB_USER_ROLE = "troublehub_user";

const IMAGE_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const YNM = new Set(["yes", "no", "maybe"]);

function normalizeYnm(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return YNM.has(v) ? v : null;
}

function normalizeHeat(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function installTroublehubApi(deps) {
  const {
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    isSessionAdmin,
    userCanAccessApp,
    getUserRoles,
    setUserRoles,
    json,
    readBody,
    sendApiError,
    DATA_ROOT,
    USERS_TABLE,
    USER_ROLES_TABLE,
    getSessionRecord,
    sessions,
    verifyPassword,
    writeSystemLog,
  } = deps;

  const IMAGES_DIR = path.join(DATA_ROOT, "troublehub-images");

  const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

  const ensureImagesDir = () => {
    if (!existsSync(IMAGES_DIR)) {
      mkdirSync(IMAGES_DIR, { recursive: true });
    }
  };

  const resolveImageAbsolutePath = (storagePath) => {
    const absolute = path.resolve(IMAGES_DIR, storagePath);
    if (!absolute.startsWith(IMAGES_DIR)) {
      throw new Error("Invalid image path.");
    }
    return absolute;
  };

  const deleteImageFile = (imagePath) => {
    if (!imagePath) return;
    try {
      const absolutePath = resolveImageAbsolutePath(imagePath);
      if (existsSync(absolutePath)) unlinkSync(absolutePath);
    } catch {
      // ignore
    }
  };

  const normalizeImagePayload = (fileBase64, mimeType) => {
    let data = String(fileBase64 || "").trim();
    let mime = String(mimeType || "").trim().toLowerCase();
    const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/i);
    if (dataUrlMatch) {
      mime = dataUrlMatch[1].toLowerCase();
      data = dataUrlMatch[2];
    }
    data = data.replace(/\s+/g, "");
    if (!data) throw new Error("Image file is required.");
    if (mime === "image/jpg") mime = "image/jpeg";
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

  const ensureTroublehubSchema = () => {
    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_MATCH_CARDS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL DEFAULT '',
        idea TEXT NOT NULL DEFAULT '',
        question TEXT NOT NULL DEFAULT '',
        statement TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        image_path TEXT,
        image_mime_type TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_MATCH_ANSWERS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating_ynm TEXT,
        rating_heat INTEGER,
        wildest_dream INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT,
        UNIQUE(card_id, user_id)
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_NOTIFICATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link_path TEXT,
        related_card_id INTEGER,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(
      `CREATE INDEX IF NOT EXISTS idx_th_match_answers_user ON ${TROUBLEHUB_MATCH_ANSWERS_TABLE} (user_id, card_id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_th_notifications_user ON ${TROUBLEHUB_NOTIFICATIONS_TABLE} (user_id, is_read, id)`
    );

    // Bind dictionary collections to TroubleHub when present.
    const app = all(
      `SELECT id, name FROM applications WHERE name = ? LIMIT 1`,
      [TROUBLEHUB_APP]
    )[0];
    if (app) {
      for (const tableName of [
        TROUBLEHUB_MATCH_CARDS_TABLE,
        TROUBLEHUB_MATCH_ANSWERS_TABLE,
        TROUBLEHUB_NOTIFICATIONS_TABLE,
      ]) {
        run(
          `
            UPDATE system_dictionary
            SET application = ?, application_id = ?
            WHERE type = 'collection' AND name = ?
          `,
          [app.name, app.id, tableName]
        );
        run(
          `
            UPDATE system_dictionary
            SET application = ?, application_id = ?
            WHERE type = 'field' AND "table" = ?
          `,
          [app.name, app.id, tableName]
        );
      }
    }
  };

  const isElevatedAdmin = (user) =>
    Boolean(isSessionAdmin(user) && user?.troublehub_admin_elevated);

  const assertPlayerAccess = (user) => {
    if (!userCanAccessApp(user, TROUBLEHUB_APP)) {
      throw new Error("TroubleHub access required.");
    }
  };

  const assertElevatedAdmin = (user) => {
    if (!isSessionAdmin(user)) {
      throw new Error("System Admin role required.");
    }
    if (!user?.troublehub_admin_elevated) {
      throw new Error("Elevate to TroubleHub Admin for this session first.");
    }
  };

  const assertGameAdmin = (user) => {
    // Elevated session admins are Match Mischief game admins.
    if (isElevatedAdmin(user)) return;
    throw new Error("TroubleHub Admin elevation required for this action.");
  };

  const mapCard = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      category: row.category || "",
      idea: row.idea || "",
      question: row.question || "",
      statement: row.statement || "",
      description: row.description || "",
      image_path: row.image_path || null,
      image_mime_type: row.image_mime_type || null,
      has_image: Boolean(row.image_path),
      is_custom: Boolean(row.is_custom),
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order) || 0,
      created_by: row.created_by,
      created_on: row.created_on,
      updated_by: row.updated_by,
      updated_on: row.updated_on,
    };
  };

  const mapAnswer = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      card_id: row.card_id,
      user_id: row.user_id,
      rating_ynm: row.rating_ynm || null,
      rating_heat: row.rating_heat == null ? null : Number(row.rating_heat),
      wildest_dream: Boolean(row.wildest_dream),
      notes: row.notes || "",
      created_on: row.created_on,
      updated_on: row.updated_on,
    };
  };

  const getCardById = (id) => {
    const row = all(
      `SELECT * FROM ${TROUBLEHUB_MATCH_CARDS_TABLE} WHERE id = ? LIMIT 1`,
      [id]
    )[0];
    return mapCard(row);
  };

  const listActiveCards = () =>
    all(
      `
        SELECT * FROM ${TROUBLEHUB_MATCH_CARDS_TABLE}
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
      `
    ).map(mapCard);

  const listTroublehubUserIds = () =>
    all(
      `
        SELECT DISTINCT user_id
        FROM ${USER_ROLES_TABLE}
        WHERE application = ? AND role = ?
      `,
      [TROUBLEHUB_APP, TROUBLEHUB_USER_ROLE]
    ).map((row) => Number(row.user_id));

  const notifyUsers = (userIds, payload, actingUserId) => {
    const now = stamp();
    for (const userId of userIds) {
      if (!userId) continue;
      insertAuditedRow(
        TROUBLEHUB_NOTIFICATIONS_TABLE,
        {
          user_id: userId,
          type: payload.type,
          title: payload.title,
          message: payload.message || null,
          link_path: payload.link_path || null,
          related_card_id: payload.related_card_id || null,
          is_read: 0,
          created_on: now,
          updated_on: now,
        },
        actingUserId
      );
    }
  };

  const unreadNotificationCount = (userId) => {
    const row = all(
      `
        SELECT COUNT(*) AS count
        FROM ${TROUBLEHUB_NOTIFICATIONS_TABLE}
        WHERE user_id = ? AND is_read = 0
      `,
      [userId]
    )[0];
    return Number(row?.count) || 0;
  };

  const listNotifications = (userId, { unreadOnly = false } = {}) => {
    const rows = all(
      `
        SELECT *
        FROM ${TROUBLEHUB_NOTIFICATIONS_TABLE}
        WHERE user_id = ?
        ${unreadOnly ? "AND is_read = 0" : ""}
        ORDER BY id DESC
        LIMIT 100
      `,
      [userId]
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message || "",
      link_path: row.link_path || null,
      related_card_id: row.related_card_id,
      is_read: Boolean(row.is_read),
      created_on: row.created_on,
    }));
  };

  const fantasiesApi = createFantasiesApi({
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    json,
    readBody,
    USERS_TABLE,
    USER_ROLES_TABLE,
    TROUBLEHUB_APP,
    TROUBLEHUB_USER_ROLE,
    assertPlayerAccess,
    assertElevatedAdmin,
    isElevatedAdmin,
    stamp,
    DATA_ROOT,
    notifyPlayers: ({
      type,
      title,
      message,
      link_path,
      related_card_id,
      excludeUserId,
      actingUserId,
    }) => {
      const recipients = listTroublehubUserIds().filter((id) => id !== excludeUserId);
      notifyUsers(
        recipients,
        { type, title, message, link_path, related_card_id },
        actingUserId
      );
    },
  });

  const setCardImage = (cardId, body, actingUserId) => {
    const card = getCardById(cardId);
    if (!card) throw new Error("Card not found.");
    const { data, mimeType } = normalizeImagePayload(body.file_base64, body.mime_type);
    ensureImagesDir();
    const ext = IMAGE_MIME_EXTENSIONS[mimeType] || ".bin";
    const fileName = `match-${cardId}-${randomBytes(8).toString("hex")}${ext}`;
    const absolute = path.join(IMAGES_DIR, fileName);
    writeFileSync(absolute, Buffer.from(data, "base64"));
    if (card.image_path) deleteImageFile(card.image_path);
    updateAuditedRow(
      TROUBLEHUB_MATCH_CARDS_TABLE,
      { image_path: fileName, image_mime_type: mimeType, updated_on: stamp() },
      "id = ?",
      [cardId],
      actingUserId
    );
    return getCardById(cardId);
  };

  const parseCardPayload = (body = {}, { isCustom = false } = {}) => {
    const category = String(body.category ?? "").trim();
    const idea = String(body.idea ?? "").trim();
    const question = String(body.question ?? "").trim();
    const statement = String(body.statement ?? "").trim();
    const description = String(body.description ?? "").trim();
    if (!question && !statement && !idea) {
      throw new Error("Provide at least an idea, question, or statement.");
    }
    return {
      category,
      idea,
      question,
      statement,
      description,
      is_custom: isCustom ? 1 : 0,
      is_active: body.is_active === false || body.is_active === 0 ? 0 : 1,
      sort_order: Number.isFinite(Number(body.sort_order))
        ? Number(body.sort_order)
        : 0,
    };
  };

  const upsertAnswer = (cardId, userId, body, actingUserId) => {
    const card = getCardById(cardId);
    if (!card || !card.is_active) throw new Error("Card not found.");
    const ratingYnm = body.rating_ynm == null || body.rating_ynm === ""
      ? null
      : normalizeYnm(body.rating_ynm);
    if (body.rating_ynm != null && body.rating_ynm !== "" && !ratingYnm) {
      throw new Error("Rating must be yes, no, or maybe.");
    }
    const ratingHeat =
      body.rating_heat == null || body.rating_heat === ""
        ? null
        : normalizeHeat(body.rating_heat);
    if (body.rating_heat != null && body.rating_heat !== "" && ratingHeat == null) {
      throw new Error("Heat rating must be 1–5.");
    }
    const wildestDream =
      body.wildest_dream === true ||
      body.wildest_dream === 1 ||
      body.wildest_dream === "1";
    const notes = body.notes == null ? "" : String(body.notes);
    const existing = all(
      `
        SELECT id FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE}
        WHERE card_id = ? AND user_id = ?
        LIMIT 1
      `,
      [cardId, userId]
    )[0];
    const payload = {
      card_id: cardId,
      user_id: userId,
      rating_ynm: ratingYnm,
      rating_heat: ratingHeat,
      wildest_dream: wildestDream ? 1 : 0,
      notes,
      updated_on: stamp(),
    };
    if (existing) {
      updateAuditedRow(
        TROUBLEHUB_MATCH_ANSWERS_TABLE,
        payload,
        "id = ?",
        [existing.id],
        actingUserId
      );
    } else {
      insertAuditedRow(
        TROUBLEHUB_MATCH_ANSWERS_TABLE,
        { ...payload, created_on: stamp() },
        actingUserId
      );
    }
    const row = all(
      `
        SELECT * FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE}
        WHERE card_id = ? AND user_id = ?
        LIMIT 1
      `,
      [cardId, userId]
    )[0];
    return mapAnswer(row);
  };

  const importCards = (cards, actingUserId, { replace = false } = {}) => {
    if (!Array.isArray(cards)) throw new Error("Expected an array of cards.");
    if (replace) {
      const existing = all(`SELECT id, image_path FROM ${TROUBLEHUB_MATCH_CARDS_TABLE}`);
      for (const row of existing) deleteImageFile(row.image_path);
      archiveAndDeleteRowsInternal(
        TROUBLEHUB_MATCH_ANSWERS_TABLE,
        "1 = 1",
        [],
        actingUserId
      );
      archiveAndDeleteRowsInternal(
        TROUBLEHUB_MATCH_CARDS_TABLE,
        "1 = 1",
        [],
        actingUserId
      );
    }
    let inserted = 0;
    cards.forEach((raw, index) => {
      const payload = parseCardPayload(raw, { isCustom: false });
      payload.sort_order =
        Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : index + 1;
      payload.created_on = stamp();
      payload.updated_on = stamp();
      insertAuditedRow(TROUBLEHUB_MATCH_CARDS_TABLE, payload, actingUserId);
      inserted += 1;
    });
    return { inserted };
  };

  const handleTroublehubApi = async (req, res, getSessionUser) => {
    const url = new URL(req.url, "http://localhost");
    const pathName = url.pathname;
    if (!pathName.startsWith("/api/troublehub")) {
      return false;
    }

    const actingUser = getSessionUser(req);
    if (!actingUser) {
      sendApiError(res, req, 401, "Unauthorized.", { function_name: "troublehubApi" });
      return true;
    }

    try {
      if (req.method === "GET" && pathName === "/api/troublehub/status") {
        const hasAccess = userCanAccessApp(actingUser, TROUBLEHUB_APP);
        json(res, 200, {
          has_access: hasAccess,
          is_system_admin: isSessionAdmin(actingUser),
          troublehub_admin_elevated: Boolean(actingUser.troublehub_admin_elevated),
          unread_notifications: hasAccess
            ? unreadNotificationCount(actingUser.id)
            : 0,
        });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/elevate") {
        if (!isSessionAdmin(actingUser)) {
          sendApiError(res, req, 403, "System Admin role required.", {
            function_name: "troublehubElevate",
          });
          return true;
        }
        const session = getSessionRecord(req);
        if (!session) {
          sendApiError(res, req, 401, "Session expired.", {
            code: "SESSION_EXPIRED",
            function_name: "troublehubElevate",
          });
          return true;
        }
        const body = await readBody(req);
        const password = body?.password;
        if (!password) {
          sendApiError(res, req, 400, "Password is required to elevate.", {
            function_name: "troublehubElevate",
          });
          return true;
        }
        const row = all(
          `SELECT id, password FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
          [actingUser.id]
        )[0];
        if (!row || !verifyPassword(password, row.password)) {
          sendApiError(res, req, 403, "Password is incorrect.", {
            function_name: "troublehubElevate",
          });
          return true;
        }
        const stored = sessions.get(session.token);
        if (stored) stored.troublehubAdminElevated = true;
        writeSystemLog?.({
          level: "info",
          source: "troublehub",
          message: "TroubleHub Admin elevation granted for session.",
          function_name: "troublehubElevate",
          user_id: actingUser.id,
          username: actingUser.username,
          url: pathName,
          method: req.method,
        });
        json(res, 200, { troublehub_admin_elevated: true });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/deelevate") {
        if (!isSessionAdmin(actingUser)) {
          sendApiError(res, req, 403, "System Admin role required.", {
            function_name: "troublehubDeelevate",
          });
          return true;
        }
        const session = getSessionRecord(req);
        const stored = session ? sessions.get(session.token) : null;
        if (stored) stored.troublehubAdminElevated = false;
        json(res, 200, { troublehub_admin_elevated: false });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/access/users") {
        assertElevatedAdmin(actingUser);
        const users = all(
          `
            SELECT u.id, u.username, u.display_name,
              CASE WHEN ur.user_id IS NULL THEN 0 ELSE 1 END AS has_access
            FROM ${USERS_TABLE} u
            LEFT JOIN ${USER_ROLES_TABLE} ur
              ON ur.user_id = u.id
             AND ur.application = ?
             AND ur.role = ?
            ORDER BY COALESCE(u.display_name, u.username) COLLATE NOCASE
          `,
          [TROUBLEHUB_APP, TROUBLEHUB_USER_ROLE]
        ).map((row) => ({
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          has_access: Boolean(row.has_access),
        }));
        json(res, 200, { users });
        return true;
      }

      const accessMatch = pathName.match(/^\/api\/troublehub\/access\/users\/(\d+)$/);
      if (accessMatch && req.method === "PUT") {
        assertElevatedAdmin(actingUser);
        const targetId = Number(accessMatch[1]);
        const body = await readBody(req);
        const granted = Boolean(body?.granted);
        const target = all(
          `SELECT id FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
          [targetId]
        )[0];
        if (!target) throw new Error("User not found.");
        const roles = getUserRoles(targetId).filter(
          (role) => !(role.application === TROUBLEHUB_APP)
        );
        if (granted) {
          roles.push({ application: TROUBLEHUB_APP, role: TROUBLEHUB_USER_ROLE });
        }
        setUserRoles(targetId, roles, actingUser.id);
        writeSystemLog?.({
          level: "info",
          source: "troublehub",
          message: granted
            ? "Granted TroubleHub access."
            : "Revoked TroubleHub access.",
          function_name: "troublehubAccess",
          user_id: actingUser.id,
          username: actingUser.username,
          data: { target_user_id: targetId, granted },
        });
        json(res, 200, { ok: true, granted });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/notifications") {
        assertPlayerAccess(actingUser);
        json(res, 200, {
          notifications: listNotifications(actingUser.id),
          unread_count: unreadNotificationCount(actingUser.id),
        });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/notifications/read-all") {
        assertPlayerAccess(actingUser);
        updateAuditedRow(
          TROUBLEHUB_NOTIFICATIONS_TABLE,
          { is_read: 1, updated_on: stamp() },
          "user_id = ? AND is_read = 0",
          [actingUser.id],
          actingUser.id
        );
        json(res, 200, { ok: true });
        return true;
      }

      const notifMatch = pathName.match(/^\/api\/troublehub\/notifications\/(\d+)\/read$/);
      if (notifMatch && req.method === "POST") {
        assertPlayerAccess(actingUser);
        const id = Number(notifMatch[1]);
        updateAuditedRow(
          TROUBLEHUB_NOTIFICATIONS_TABLE,
          { is_read: 1, updated_on: stamp() },
          "id = ? AND user_id = ?",
          [id, actingUser.id],
          actingUser.id
        );
        json(res, 200, { ok: true });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/match/cards") {
        assertPlayerAccess(actingUser);
        const includeInactive = url.searchParams.get("all") === "1" && isElevatedAdmin(actingUser);
        const rows = includeInactive
          ? all(
              `SELECT * FROM ${TROUBLEHUB_MATCH_CARDS_TABLE} ORDER BY sort_order ASC, id ASC`
            ).map(mapCard)
          : listActiveCards();
        json(res, 200, {
          cards: rows,
          can_manage: isElevatedAdmin(actingUser),
        });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/match/cards") {
        assertPlayerAccess(actingUser);
        const body = await readBody(req);
        const isCustom = !isElevatedAdmin(actingUser);
        const payload = parseCardPayload(body, { isCustom });
        if (isElevatedAdmin(actingUser) && body.is_custom != null) {
          payload.is_custom = body.is_custom ? 1 : 0;
        }
        const maxOrder = all(
          `SELECT MAX(sort_order) AS max_order FROM ${TROUBLEHUB_MATCH_CARDS_TABLE}`
        )[0];
        payload.sort_order =
          Number.isFinite(Number(body.sort_order))
            ? Number(body.sort_order)
            : (Number(maxOrder?.max_order) || 0) + 1;
        payload.created_on = stamp();
        payload.updated_on = stamp();
        const result = insertAuditedRow(
          TROUBLEHUB_MATCH_CARDS_TABLE,
          payload,
          actingUser.id
        );
        const card = getCardById(result.lastID);
        if (card?.is_custom) {
          const recipients = listTroublehubUserIds().filter((id) => id !== actingUser.id);
          notifyUsers(
            recipients,
            {
              type: "match_custom_card",
              title: "New Match Mischief card",
              message: `${actingUser.display_name || actingUser.username} added a custom card${
                card.idea ? `: ${card.idea}` : ""
              }.`,
              link_path: "/app/troublehub/match",
              related_card_id: card.id,
            },
            actingUser.id
          );
        }
        json(res, 200, { card });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/match/cards/import") {
        assertGameAdmin(actingUser);
        const body = await readBody(req);
        const cards = Array.isArray(body) ? body : body?.cards;
        const result = importCards(cards, actingUser.id, {
          replace: Boolean(body?.replace),
        });
        json(res, 200, result);
        return true;
      }

      if (req.method === "POST" && pathName === "/api/troublehub/match/reset") {
        assertGameAdmin(actingUser);
        archiveAndDeleteRowsInternal(
          TROUBLEHUB_MATCH_ANSWERS_TABLE,
          "1 = 1",
          [],
          actingUser.id
        );
        writeSystemLog?.({
          level: "warning",
          source: "troublehub",
          message: "Match Mischief answers reset.",
          function_name: "troublehubMatchReset",
          user_id: actingUser.id,
          username: actingUser.username,
        });
        json(res, 200, { ok: true });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/match/play") {
        assertPlayerAccess(actingUser);
        const cards = listActiveCards();
        const answers = all(
          `
            SELECT * FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE}
            WHERE user_id = ?
          `,
          [actingUser.id]
        );
        const byCard = Object.fromEntries(
          answers.map((row) => [row.card_id, mapAnswer(row)])
        );
        const answered = cards.filter((card) => byCard[card.id]).length;
        json(res, 200, {
          cards,
          answers: byCard,
          progress: {
            total: cards.length,
            answered,
            remaining: Math.max(0, cards.length - answered),
          },
          can_manage: isElevatedAdmin(actingUser),
        });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/match/players") {
        assertPlayerAccess(actingUser);
        const players = all(
          `
            SELECT u.id, u.username, u.display_name
            FROM ${USERS_TABLE} u
            JOIN ${USER_ROLES_TABLE} ur
              ON ur.user_id = u.id
             AND ur.application = ?
             AND ur.role = ?
            WHERE u.id != ?
            ORDER BY COALESCE(u.display_name, u.username) COLLATE NOCASE
          `,
          [TROUBLEHUB_APP, TROUBLEHUB_USER_ROLE, actingUser.id]
        ).map((row) => ({
          id: row.id,
          username: row.username,
          display_name: row.display_name,
        }));
        json(res, 200, { players });
        return true;
      }

      const cardAnswersMatch = pathName.match(/^\/api\/troublehub\/match\/cards\/(\d+)\/answers$/);
      if (cardAnswersMatch && req.method === "GET") {
        assertPlayerAccess(actingUser);
        const cardId = Number(cardAnswersMatch[1]);
        const card = getCardById(cardId);
        if (!card || !card.is_active) throw new Error("Card not found.");

        const players = all(
          `
            SELECT u.id, u.username, u.display_name
            FROM ${USERS_TABLE} u
            JOIN ${USER_ROLES_TABLE} ur
              ON ur.user_id = u.id
             AND ur.application = ?
             AND ur.role = ?
            ORDER BY
              CASE WHEN u.id = ? THEN 0 ELSE 1 END,
              COALESCE(u.display_name, u.username) COLLATE NOCASE
          `,
          [TROUBLEHUB_APP, TROUBLEHUB_USER_ROLE, actingUser.id]
        );

        const answersByUser = Object.fromEntries(
          all(
            `SELECT * FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE} WHERE card_id = ?`,
            [cardId]
          ).map((row) => [row.user_id, mapAnswer(row)])
        );

        json(res, 200, {
          card,
          players: players.map((row) => ({
            id: row.id,
            username: row.username,
            display_name: row.display_name,
            is_you: Number(row.id) === Number(actingUser.id),
            answer: answersByUser[row.id] || null,
          })),
        });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/troublehub/match/compare") {
        assertPlayerAccess(actingUser);
        const otherId = Number(url.searchParams.get("user_id"));
        if (!Number.isInteger(otherId) || otherId <= 0) {
          throw new Error("user_id is required.");
        }
        if (otherId === actingUser.id) {
          throw new Error("Pick another player to compare with.");
        }
        const otherAccess = all(
          `
            SELECT 1 FROM ${USER_ROLES_TABLE}
            WHERE user_id = ? AND application = ? AND role = ?
            LIMIT 1
          `,
          [otherId, TROUBLEHUB_APP, TROUBLEHUB_USER_ROLE]
        )[0];
        if (!otherAccess && !isElevatedAdmin(actingUser)) {
          throw new Error("That user does not have TroubleHub access.");
        }
        const otherUser = all(
          `SELECT id, username, display_name FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
          [otherId]
        )[0];
        if (!otherUser) throw new Error("User not found.");

        const cards = listActiveCards();
        const mine = Object.fromEntries(
          all(
            `SELECT * FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE} WHERE user_id = ?`,
            [actingUser.id]
          ).map((row) => [row.card_id, mapAnswer(row)])
        );
        const theirs = Object.fromEntries(
          all(
            `SELECT * FROM ${TROUBLEHUB_MATCH_ANSWERS_TABLE} WHERE user_id = ?`,
            [otherId]
          ).map((row) => [row.card_id, mapAnswer(row)])
        );

        const comparisons = cards.map((card) => {
          const a = mine[card.id] || null;
          const b = theirs[card.id] || null;
          return {
            card,
            mine: a,
            theirs: b,
            ynm_match: Boolean(a?.rating_ynm && b?.rating_ynm && a.rating_ynm === b.rating_ynm),
            heat_delta:
              a?.rating_heat != null && b?.rating_heat != null
                ? Math.abs(a.rating_heat - b.rating_heat)
                : null,
            both_wildest: Boolean(a?.wildest_dream && b?.wildest_dream),
          };
        });

        json(res, 200, {
          other_user: {
            id: otherUser.id,
            username: otherUser.username,
            display_name: otherUser.display_name,
          },
          comparisons,
        });
        return true;
      }

      const answerMatch = pathName.match(/^\/api\/troublehub\/match\/answers\/(\d+)$/);
      if (answerMatch && req.method === "PUT") {
        assertPlayerAccess(actingUser);
        const cardId = Number(answerMatch[1]);
        const body = await readBody(req);
        const answer = upsertAnswer(cardId, actingUser.id, body, actingUser.id);
        json(res, 200, { answer });
        return true;
      }

      const cardMatch = pathName.match(/^\/api\/troublehub\/match\/cards\/(\d+)$/);
      if (cardMatch) {
        const cardId = Number(cardMatch[1]);
        if (req.method === "PUT") {
          assertPlayerAccess(actingUser);
          const existing = getCardById(cardId);
          if (!existing) throw new Error("Card not found.");
          const canEdit =
            isElevatedAdmin(actingUser) ||
            (existing.is_custom && Number(existing.created_by) === Number(actingUser.id));
          if (!canEdit) throw new Error("You cannot edit this card.");
          const body = await readBody(req);
          const payload = parseCardPayload(body, { isCustom: existing.is_custom });
          if (!isElevatedAdmin(actingUser)) {
            payload.is_custom = 1;
            payload.is_active = 1;
          }
          payload.updated_on = stamp();
          updateAuditedRow(
            TROUBLEHUB_MATCH_CARDS_TABLE,
            payload,
            "id = ?",
            [cardId],
            actingUser.id
          );
          json(res, 200, { card: getCardById(cardId) });
          return true;
        }
        if (req.method === "DELETE") {
          assertPlayerAccess(actingUser);
          const existing = getCardById(cardId);
          if (!existing) throw new Error("Card not found.");
          const canDelete =
            isElevatedAdmin(actingUser) ||
            (existing.is_custom && Number(existing.created_by) === Number(actingUser.id));
          if (!canDelete) throw new Error("You cannot delete this card.");
          deleteImageFile(existing.image_path);
          archiveAndDeleteRowsInternal(
            TROUBLEHUB_MATCH_ANSWERS_TABLE,
            "card_id = ?",
            [cardId],
            actingUser.id
          );
          archiveAndDeleteRowsInternal(
            TROUBLEHUB_MATCH_CARDS_TABLE,
            "id = ?",
            [cardId],
            actingUser.id
          );
          json(res, 200, { ok: true });
          return true;
        }
      }

      const imageMatch = pathName.match(/^\/api\/troublehub\/match\/cards\/(\d+)\/image$/);
      if (imageMatch) {
        const cardId = Number(imageMatch[1]);
        if (req.method === "POST") {
          assertElevatedAdmin(actingUser);
          const body = await readBody(req);
          json(res, 200, { card: setCardImage(cardId, body, actingUser.id) });
          return true;
        }
        if (req.method === "GET") {
          assertPlayerAccess(actingUser);
          const card = getCardById(cardId);
          if (!card?.image_path) {
            sendApiError(res, req, 404, "Image not found.", {
              function_name: "troublehubImage",
            });
            return true;
          }
          const absolute = resolveImageAbsolutePath(card.image_path);
          if (!existsSync(absolute)) {
            sendApiError(res, req, 404, "Image not found.", {
              function_name: "troublehubImage",
            });
            return true;
          }
          const bytes = readFileSync(absolute);
          res.statusCode = 200;
          res.setHeader("Content-Type", card.image_mime_type || "application/octet-stream");
          res.setHeader("Cache-Control", "private, max-age=3600");
          res.end(bytes);
          return true;
        }
        if (req.method === "DELETE") {
          assertElevatedAdmin(actingUser);
          const card = getCardById(cardId);
          if (!card) throw new Error("Card not found.");
          deleteImageFile(card.image_path);
          updateAuditedRow(
            TROUBLEHUB_MATCH_CARDS_TABLE,
            { image_path: null, image_mime_type: null, updated_on: stamp() },
            "id = ?",
            [cardId],
            actingUser.id
          );
          json(res, 200, { card: getCardById(cardId) });
          return true;
        }
      }

      if (await fantasiesApi.handleApi(req, res, actingUser, url, pathName)) {
        return true;
      }

      sendApiError(res, req, 404, "Not found.", { function_name: "troublehubApi" });
      return true;
    } catch (error) {
      const message = error?.message || "TroubleHub request failed.";
      const status = /access required|role required|Elevate|incorrect password|cannot access|System Admin/i.test(
        message
      )
        ? 403
        : 400;
      sendApiError(res, req, status, message, { function_name: "troublehubApi" });
      return true;
    }
  };

  return {
    ensureTroublehubSchema: () => {
      ensureTroublehubSchema();
      fantasiesApi.ensureSchema();
    },
    handleTroublehubApi,
    TROUBLEHUB_IMAGES_DIR: IMAGES_DIR,
    TROUBLEHUB_MATCH_CARDS_TABLE,
    TROUBLEHUB_MATCH_ANSWERS_TABLE,
    TROUBLEHUB_NOTIFICATIONS_TABLE,
  };
}
