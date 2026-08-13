/**
 * TroubleHub Fantasies — session-code live fantasy picker (two players).
 * Polling is enough; no websockets required for this turn-based flow.
 * Cards: title + description, Male/Female, Romantic / Naughty / Kinky.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const TROUBLEHUB_FANTASY_CARDS_TABLE = "troublehub_fantasy_cards";
export const TROUBLEHUB_FANTASY_SESSIONS_TABLE = "troublehub_fantasy_sessions";
export const TROUBLEHUB_FANTASY_PICKS_TABLE = "troublehub_fantasy_picks";
export const TROUBLEHUB_FANTASY_ROUNDS_TABLE = "troublehub_fantasy_rounds";
/** @deprecated singleton table kept for migration ignore */
export const TROUBLEHUB_FANTASY_GAME_TABLE = "troublehub_fantasy_game";

export const FANTASY_AUDIENCES = ["male", "female"];
export const FANTASY_CATEGORIES = ["romantic", "naughty", "kinky"];
export const FANTASY_AVATAR_IDS = [
  "rose",
  "fire",
  "lips",
  "chili",
  "peach",
  "cherries",
  "devil",
  "hearts",
  "smirk",
  "sparkles",
  "moon",
  "diamond",
  "wink",
  "flushed",
  "heart_eyes",
  "hot_face",
  "biting_lip",
  "kissy",
  "tongue",
  "wink_tongue",
  "drool",
  "smug",
  "angel",
  "party",
  "eggplant",
  "banana",
  "lollipop",
  "honey",
  "strawberry",
  "cocktail",
  "wine",
  "champagne",
  "candy",
  "ice_cream",
  "donut",
  "cookie",
  "lightning",
  "star",
  "comet",
  "boom",
  "dizzy",
  "heartbeat",
  "two_hearts",
  "arrow_heart",
  "fire_heart",
  "black_heart",
  "pink_heart",
  "gift_heart",
  "high_heel",
  "lipstick",
  "nail_polish",
  "crown",
  "ring",
  "key",
  "lock",
  "masks",
  "dice",
  "teddy",
  "balloon",
  "confetti",
];

const MIN_PICKS = 6;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeAudience(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!v) return null;
  if (FANTASY_AUDIENCES.includes(v)) return v;
  if (
    v === "m" ||
    v === "man" ||
    v === "him" ||
    v === "maleaudience" ||
    v === "maile" || // common typo
    v === "mail" ||
    v === "mal"
  ) {
    return "male";
  }
  if (
    v === "f" ||
    v === "w" ||
    v === "woman" ||
    v === "her" ||
    v === "femaleaudience" ||
    v === "femail" ||
    v === "femal"
  ) {
    return "female";
  }
  return null;
}

function normalizeCategory(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return FANTASY_CATEGORIES.includes(v) ? v : null;
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeAvatar(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return FANTASY_AVATAR_IDS.includes(v) ? v : null;
}

function normalizeDisplayName(value) {
  return String(value || "")
    .trim()
    .slice(0, 40);
}

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function createFantasiesApi(deps) {
  const {
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    json,
    readBody,
    USERS_TABLE,
    assertPlayerAccess,
    assertElevatedAdmin,
    isElevatedAdmin,
    stamp,
    notifyPlayers,
    DATA_ROOT,
  } = deps;

  const ensureColumn = (table, column, definition) => {
    const cols = new Set(all(`PRAGMA table_info(${table})`).map((row) => row.name));
    if (!cols.has(column)) {
      run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  const ensureSchema = () => {
    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_FANTASY_CARDS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audience TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
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
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_FANTASY_SESSIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        phase TEXT NOT NULL DEFAULT 'lobby',
        host_user_id INTEGER NOT NULL,
        male_user_id INTEGER,
        female_user_id INTEGER,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_FANTASY_PICKS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER NOT NULL,
        card_id INTEGER NOT NULL,
        locked INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${TROUBLEHUB_FANTASY_ROUNDS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL DEFAULT 'drawn',
        male_option_a INTEGER,
        male_option_b INTEGER,
        male_choice INTEGER,
        male_notes TEXT,
        female_option_a INTEGER,
        female_option_b INTEGER,
        female_choice INTEGER,
        female_notes TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT,
        completed_on TEXT
      )
    `);

    ensureColumn(TROUBLEHUB_FANTASY_PICKS_TABLE, "session_id", "INTEGER");
    ensureColumn(TROUBLEHUB_FANTASY_ROUNDS_TABLE, "session_id", "INTEGER");
    ensureColumn(TROUBLEHUB_FANTASY_SESSIONS_TABLE, "male_display_name", "TEXT");
    ensureColumn(TROUBLEHUB_FANTASY_SESSIONS_TABLE, "female_display_name", "TEXT");
    ensureColumn(TROUBLEHUB_FANTASY_SESSIONS_TABLE, "male_avatar", "TEXT");
    ensureColumn(TROUBLEHUB_FANTASY_SESSIONS_TABLE, "female_avatar", "TEXT");

    // Old schema had UNIQUE(user_id, card_id), which blocks the same card across sessions.
    // Rebuild the table once so uniqueness is (session_id, user_id, card_id) only.
    const picksCreateSql =
      all(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
        [TROUBLEHUB_FANTASY_PICKS_TABLE]
      )[0]?.sql || "";
    if (/UNIQUE\s*\(\s*user_id\s*,\s*card_id\s*\)/i.test(picksCreateSql)) {
      const rebuilt = `${TROUBLEHUB_FANTASY_PICKS_TABLE}_session_scoped`;
      run(`DROP TABLE IF EXISTS ${rebuilt}`);
      run(`
        CREATE TABLE ${rebuilt} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          user_id INTEGER NOT NULL,
          card_id INTEGER NOT NULL,
          locked INTEGER NOT NULL DEFAULT 0,
          created_by INTEGER,
          created_on TEXT,
          updated_by INTEGER,
          updated_on TEXT
        )
      `);
      run(`
        INSERT INTO ${rebuilt} (
          id, session_id, user_id, card_id, locked,
          created_by, created_on, updated_by, updated_on
        )
        SELECT
          id, session_id, user_id, card_id, locked,
          created_by, created_on, updated_by, updated_on
        FROM ${TROUBLEHUB_FANTASY_PICKS_TABLE}
      `);
      run(`DROP TABLE ${TROUBLEHUB_FANTASY_PICKS_TABLE}`);
      run(`ALTER TABLE ${rebuilt} RENAME TO ${TROUBLEHUB_FANTASY_PICKS_TABLE}`);
    }

    run(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_th_fantasy_picks_session_user_card
       ON ${TROUBLEHUB_FANTASY_PICKS_TABLE} (session_id, user_id, card_id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_th_fantasy_picks_user
       ON ${TROUBLEHUB_FANTASY_PICKS_TABLE} (user_id, locked)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_th_fantasy_cards_aud ON ${TROUBLEHUB_FANTASY_CARDS_TABLE} (audience, category, is_active)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_th_fantasy_sessions_code ON ${TROUBLEHUB_FANTASY_SESSIONS_TABLE} (code)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_th_fantasy_rounds_session ON ${TROUBLEHUB_FANTASY_ROUNDS_TABLE} (session_id, status)`
    );
  };

  const mapCard = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      audience: row.audience,
      category: row.category,
      title: row.title || "",
      description: row.description || "",
      is_custom: Boolean(row.is_custom),
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order) || 0,
      created_by: row.created_by,
      created_on: row.created_on,
      updated_on: row.updated_on,
    };
  };

  const mapUser = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
    };
  };

  const getUserBrief = (userId) => {
    if (!userId) return null;
    return mapUser(
      all(
        `SELECT id, username, display_name FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
        [userId]
      )[0]
    );
  };

  const getCard = (id) =>
    mapCard(
      all(`SELECT * FROM ${TROUBLEHUB_FANTASY_CARDS_TABLE} WHERE id = ? LIMIT 1`, [id])[0]
    );

  const listActiveCards = () =>
    all(
      `
        SELECT * FROM ${TROUBLEHUB_FANTASY_CARDS_TABLE}
        WHERE is_active = 1
        ORDER BY audience ASC, category ASC, sort_order ASC, id ASC
      `
    ).map(mapCard);

  const generateCode = () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = "";
      const bytes = randomBytes(6);
      for (let i = 0; i < 6; i += 1) {
        code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      }
      const existing = all(
        `SELECT id FROM ${TROUBLEHUB_FANTASY_SESSIONS_TABLE} WHERE code = ? LIMIT 1`,
        [code]
      )[0];
      if (!existing) return code;
    }
    throw new Error("Could not generate a session code.");
  };

  const getSessionById = (sessionId) =>
    all(
      `SELECT * FROM ${TROUBLEHUB_FANTASY_SESSIONS_TABLE} WHERE id = ? LIMIT 1`,
      [sessionId]
    )[0] || null;

  const getSessionByCode = (code) =>
    all(
      `SELECT * FROM ${TROUBLEHUB_FANTASY_SESSIONS_TABLE} WHERE code = ? LIMIT 1`,
      [normalizeCode(code)]
    )[0] || null;

  const assertSessionMember = (session, userId) => {
    if (!session) throw new Error("Session not found.");
    const uid = Number(userId);
    if (
      Number(session.host_user_id) !== uid &&
      Number(session.male_user_id) !== uid &&
      Number(session.female_user_id) !== uid
    ) {
      throw new Error("You are not in this Fantasies session.");
    }
  };

  const patchSession = (sessionId, patch) => {
    const payload = { updated_on: stamp() };
    for (const key of [
      "phase",
      "male_user_id",
      "female_user_id",
      "host_user_id",
      "male_display_name",
      "female_display_name",
      "male_avatar",
      "female_avatar",
    ]) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        payload[key] = patch[key];
      }
    }
    run(
      `
        UPDATE ${TROUBLEHUB_FANTASY_SESSIONS_TABLE}
        SET ${Object.keys(payload)
          .map((key) => `${key} = ?`)
          .join(", ")}
        WHERE id = ?
      `,
      [...Object.values(payload), sessionId]
    );
  };

  const listPicksForUser = (sessionId, userId) =>
    all(
      `
        SELECT id, card_id, locked
        FROM ${TROUBLEHUB_FANTASY_PICKS_TABLE}
        WHERE session_id = ? AND user_id = ?
      `,
      [sessionId, userId]
    );

  const userLocked = (sessionId, userId) => {
    const rows = listPicksForUser(sessionId, userId);
    return rows.length > 0 && rows.every((row) => Number(row.locked) === 1);
  };

  const agreedPileIds = (session) => {
    if (!session?.male_user_id || !session?.female_user_id) return [];
    if (!userLocked(session.id, session.male_user_id) || !userLocked(session.id, session.female_user_id)) {
      return [];
    }
    return all(
      `
        SELECT DISTINCT card_id
        FROM ${TROUBLEHUB_FANTASY_PICKS_TABLE}
        WHERE session_id = ? AND locked = 1
      `,
      [session.id]
    ).map((row) => Number(row.card_id));
  };

  const openRound = (sessionId) =>
    all(
      `
        SELECT * FROM ${TROUBLEHUB_FANTASY_ROUNDS_TABLE}
        WHERE session_id = ? AND status IN ('drawn', 'choosing')
        ORDER BY id DESC
        LIMIT 1
      `,
      [sessionId]
    )[0] || null;

  const latestRound = (sessionId) =>
    all(
      `
        SELECT * FROM ${TROUBLEHUB_FANTASY_ROUNDS_TABLE}
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [sessionId]
    )[0] || null;

  const requiredPicksForAudience = (audience) => {
    const available = listActiveCards().filter((card) => card.audience === audience).length;
    return Math.max(1, Math.min(MIN_PICKS, available || MIN_PICKS));
  };

  const migratePhase = (session, round) => {
    const raw = String(session?.phase || "lobby").toLowerCase();
    if (raw === "lobby" || raw === "picking" || raw === "choosing" || raw === "mission") {
      return raw;
    }
    if (raw === "setup") return "picking";
    if (raw === "drawn") return "choosing";
    if (raw === "ready") {
      if (!round) return "picking";
      if (round.status === "complete") return "mission";
      return "choosing";
    }
    return "lobby";
  };

  const mapRound = (row, { viewerAudience = null } = {}) => {
    if (!row) return null;
    const cardIds = [
      row.male_option_a,
      row.male_option_b,
      row.male_choice,
      row.female_option_a,
      row.female_option_b,
      row.female_choice,
    ].filter(Boolean);
    const cardsById = Object.fromEntries(cardIds.map((id) => [id, getCard(id)]));
    const maleOptions = [cardsById[row.male_option_a], cardsById[row.male_option_b]].filter(
      Boolean
    );
    const femaleOptions = [
      cardsById[row.female_option_a],
      cardsById[row.female_option_b],
    ].filter(Boolean);
    const showMale = viewerAudience === "male";
    const showFemale = viewerAudience === "female";
    const choosing = row.status !== "complete";
    const showAll = !viewerAudience;
    return {
      id: row.id,
      session_id: row.session_id,
      status: row.status,
      male_option_a: row.male_option_a,
      male_option_b: row.male_option_b,
      male_choice: row.male_choice,
      male_notes: showMale || showAll ? row.male_notes || "" : "",
      female_option_a: row.female_option_a,
      female_option_b: row.female_option_b,
      female_choice: row.female_choice,
      female_notes: showFemale || showAll ? row.female_notes || "" : "",
      created_on: row.created_on,
      completed_on: row.completed_on,
      cards: cardsById,
      male_options: (showMale && choosing) || showAll ? maleOptions : [],
      female_options: (showFemale && choosing) || showAll ? femaleOptions : [],
      male_chosen: !choosing && showFemale ? cardsById[row.male_choice] || null : null,
      female_chosen: !choosing && showMale ? cardsById[row.female_choice] || null : null,
      hide_partner_options: Boolean(viewerAudience) && choosing,
    };
  };

  const buildPlayer = (session, role) => {
    const userId = role === "male" ? session.male_user_id : session.female_user_id;
    if (!userId) return null;
    const brief = getUserBrief(userId);
    const displayName =
      (role === "male" ? session.male_display_name : session.female_display_name) ||
      brief?.display_name ||
      brief?.username ||
      "";
    const avatar = role === "male" ? session.male_avatar : session.female_avatar;
    const picks = listPicksForUser(session.id, userId);
    return {
      user_id: Number(userId),
      role,
      display_name: displayName,
      avatar: avatar || null,
      pick_count: picks.length,
      locked: userLocked(session.id, userId),
      is_host: Number(session.host_user_id) === Number(userId),
    };
  };

  const mapSession = (session) => {
    if (!session) return null;
    const round = openRound(session.id) || latestRound(session.id);
    const phase = migratePhase(session, round);
    const players = [buildPlayer(session, "male"), buildPlayer(session, "female")].filter(
      Boolean
    );
    return {
      id: session.id,
      code: session.code,
      phase,
      host_user_id: session.host_user_id,
      male_user_id: session.male_user_id,
      female_user_id: session.female_user_id,
      male_display_name: session.male_display_name || null,
      female_display_name: session.female_display_name || null,
      male_avatar: session.male_avatar || null,
      female_avatar: session.female_avatar || null,
      male_user: getUserBrief(session.male_user_id),
      female_user: getUserBrief(session.female_user_id),
      host_user: getUserBrief(session.host_user_id),
      players,
      male_locked: session.male_user_id ? userLocked(session.id, session.male_user_id) : false,
      female_locked: session.female_user_id
        ? userLocked(session.id, session.female_user_id)
        : false,
      both_locked: Boolean(
        session.male_user_id &&
          session.female_user_id &&
          userLocked(session.id, session.male_user_id) &&
          userLocked(session.id, session.female_user_id)
      ),
      pile_count: agreedPileIds(session).length,
      waiting_for_partner: !(session.male_user_id && session.female_user_id),
      updated_on: session.updated_on,
    };
  };

  const resolveMyMission = (session, actingUser, round) => {
    if (!round) return null;
    const isMale = Number(session.male_user_id) === Number(actingUser.id);
    const isFemale = Number(session.female_user_id) === Number(actingUser.id);
    // Only the final 1-of-2 pick is swapped: you see the card your partner chose, not your own.
    if (isMale && round.female_choice) return getCard(round.female_choice);
    if (isFemale && round.male_choice) return getCard(round.male_choice);
    return null;
  };

  const buildState = (actingUser, session) => {
    const myPicks = listPicksForUser(session.id, actingUser.id);
    const myPickIds = myPicks.map((row) => Number(row.card_id));
    const isMale = Number(session.male_user_id) === Number(actingUser.id);
    const isFemale = Number(session.female_user_id) === Number(actingUser.id);
    const myAudience = isMale ? "male" : isFemale ? "female" : null;
    const allCards = listActiveCards();
    const visibleCards = myAudience
      ? allCards.filter((card) => card.audience === myAudience)
      : allCards;
    const requiredPicks = myAudience
      ? requiredPicksForAudience(myAudience)
      : Math.max(1, Math.min(MIN_PICKS, visibleCards.length || MIN_PICKS));
    const roundRow = openRound(session.id) || latestRound(session.id);
    const mappedSession = mapSession(session);
    const myMission = resolveMyMission(session, actingUser, roundRow);
    const partner = (mappedSession.players || []).find(
      (player) => Number(player.user_id) !== Number(actingUser.id)
    );
    return {
      session: {
        ...mappedSession,
        min_picks: requiredPicks,
        required_picks: requiredPicks,
      },
      cards: visibleCards,
      my_audience: myAudience,
      my_pick_ids: myPickIds,
      my_pick_count: myPickIds.length,
      my_locked: userLocked(session.id, actingUser.id),
      my_mission: myMission,
      partner: partner
        ? {
            display_name: partner.display_name,
            avatar: partner.avatar,
            role: partner.role,
            pick_count: partner.pick_count,
            locked: partner.locked,
            status: partner.locked ? "ready" : "picking",
          }
        : null,
      min_picks: requiredPicks,
      required_picks: requiredPicks,
      pile_ids: agreedPileIds(session),
      round: mapRound(roundRow, {
        viewerAudience: myAudience,
      }),
      can_manage: isElevatedAdmin(actingUser),
      card_count: allCards.length,
      my_card_count: visibleCards.length,
      you: {
        id: actingUser.id,
        is_host: Number(session.host_user_id) === Number(actingUser.id),
        is_male: isMale,
        is_female: isFemale,
        display_name: isMale
          ? session.male_display_name || null
          : isFemale
            ? session.female_display_name || null
            : null,
        avatar: isMale
          ? session.male_avatar || null
          : isFemale
            ? session.female_avatar || null
            : null,
      },
    };
  };

  const resolveSession = (actingUser, { sessionId, code } = {}) => {
    let session = null;
    const id = sessionId != null && sessionId !== "" ? Number(sessionId) : null;
    if (Number.isFinite(id) && id > 0) session = getSessionById(id);
    else if (code) session = getSessionByCode(normalizeCode(code));
    if (!session) throw new Error("Session not found. Create one or enter a valid code.");
    assertSessionMember(session, actingUser.id);
    return session;
  };

  const parseProfile = (body) => {
    const displayName = normalizeDisplayName(body?.display_name ?? body?.displayName);
    if (!displayName) throw new Error("Display name is required.");
    const avatar = normalizeAvatar(body?.avatar);
    if (!avatar) {
      throw new Error(
        `Pick an avatar from: ${FANTASY_AVATAR_IDS.join(", ")}. Got: ${JSON.stringify(body?.avatar ?? "")}.`
      );
    }
    return { displayName, avatar };
  };

  const drawRoundFromPile = (live, actingUserId) => {
    if (openRound(live.id)) return openRound(live.id);
    const pile = agreedPileIds(live);
    const malePool = pile.map((id) => getCard(id)).filter((card) => card?.audience === "male");
    const femalePool = pile
      .map((id) => getCard(id))
      .filter((card) => card?.audience === "female");
    if (malePool.length < 2) throw new Error("Need at least 2 male fantasies in the locked pile.");
    if (femalePool.length < 2) {
      throw new Error("Need at least 2 female fantasies in the locked pile.");
    }
    const maleDraw = shuffle(malePool).slice(0, 2);
    const femaleDraw = shuffle(femalePool).slice(0, 2);
    const result = insertAuditedRow(
      TROUBLEHUB_FANTASY_ROUNDS_TABLE,
      {
        session_id: live.id,
        status: "drawn",
        male_option_a: maleDraw[0].id,
        male_option_b: maleDraw[1].id,
        female_option_a: femaleDraw[0].id,
        female_option_b: femaleDraw[1].id,
        male_notes: "",
        female_notes: "",
      },
      actingUserId
    );
    patchSession(live.id, { phase: "choosing" });
    return all(
      `SELECT * FROM ${TROUBLEHUB_FANTASY_ROUNDS_TABLE} WHERE id = ? LIMIT 1`,
      [result.lastID]
    )[0];
  };

  const clearSessionPlay = (sessionId, actingUserId) => {
    archiveAndDeleteRowsInternal(
      TROUBLEHUB_FANTASY_ROUNDS_TABLE,
      "session_id = ?",
      [sessionId],
      actingUserId
    );
    archiveAndDeleteRowsInternal(
      TROUBLEHUB_FANTASY_PICKS_TABLE,
      "session_id = ?",
      [sessionId],
      actingUserId
    );
  };

  const normalizeFantasyText = (value) => {
    let text = String(value ?? "");
    // Normalize newlines from Excel/CSV multiline cells.
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Common Windows-1252 / Word punctuation (when already correctly decoded).
    text = text
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ");
    // Leftover replacement chars from a prior bad decode — prefer apostrophe in word midpoints.
    text = text.replace(/(\w)\uFFFD(\w)/g, "$1'$2");
    text = text.replace(/\uFFFD/g, "'");
    return text.trim();
  };

  const parseCardPayload = (body, { isCustom = false, rowLabel = null } = {}) => {
    const audience = normalizeAudience(body?.audience ?? body?.role);
    const category = normalizeCategory(body?.category);
    const title = normalizeFantasyText(body?.title || "");
    const description = normalizeFantasyText(body?.description || body?.task || "");
    const where = rowLabel ? ` (${rowLabel})` : "";
    if (!audience) {
      throw new Error(
        `Audience must be male or female${where}. Got: ${JSON.stringify(body?.audience ?? body?.role ?? "")}.`
      );
    }
    if (!category) {
      throw new Error(
        `Category must be romantic, naughty, or kinky${where}. Got: ${JSON.stringify(body?.category ?? "")}.`
      );
    }
    if (!title) throw new Error(`Title is required${where}.`);
    return {
      audience,
      category,
      title,
      description,
      is_custom: isCustom || body?.is_custom ? 1 : 0,
      is_active: body?.is_active === false || body?.is_active === 0 ? 0 : 1,
      sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 100,
    };
  };

  const detectDelimiterFromHeader = (headerLine) => {
    let inQuotes = false;
    const counts = { ",": 0, ";": 0, "\t": 0 };
    for (let i = 0; i < headerLine.length; i += 1) {
      const ch = headerLine[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && counts[ch] != null) counts[ch] += 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  /** Parse CSV with quoted multiline fields (Excel-style). */
  const parseCsvRecordsWithDelimiter = (csvText, delimiter) => {
    const text = String(csvText || "").replace(/^\uFEFF/, "");
    const records = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"') {
          if (next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        continue;
      }
      if (ch === delimiter) {
        row.push(field);
        field = "";
        continue;
      }
      if (ch === "\r") continue;
      if (ch === "\n") {
        row.push(field);
        field = "";
        if (row.some((cell) => String(cell).trim())) records.push(row);
        row = [];
        continue;
      }
      field += ch;
    }
    row.push(field);
    if (row.some((cell) => String(cell).trim())) records.push(row);
    return records;
  };

  const normalizeHeaderKey = (header) =>
    String(header || "")
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const parseFantasyCsv = (csvText) => {
    const raw = String(csvText || "").replace(/^\uFEFF/, "");
    if (/^PK\x03\x04/.test(raw) || raw.includes("xl/")) {
      throw new Error(
        "That looks like an Excel .xlsx file. In Excel use Save As → CSV UTF-8, then upload the .csv."
      );
    }
    const firstLine = raw.split(/\r?\n/)[0] || "";
    const delimiter = detectDelimiterFromHeader(firstLine);
    const records = parseCsvRecordsWithDelimiter(raw, delimiter);
    if (records.length < 2) {
      throw new Error("CSV needs a header row plus at least one fantasy card.");
    }
    const headers = records[0].map(normalizeHeaderKey);
    const alias = {
      audience: ["audience", "gender", "for", "player", "sex", "male_female", "m_f"],
      category: [
        "category",
        "cateogry",
        "catagory",
        "type",
        "heat",
        "level",
        "tag",
        "style",
      ],
      title: [
        "title",
        "name",
        "fantasy",
        "card",
        "card_title",
        "fantasy_title",
        "fantasy_name",
        "prompt",
      ],
      description: [
        "description",
        "task",
        "details",
        "text",
        "body",
        "desc",
        "notes",
        "blurb",
        "summary",
        "story",
      ],
      sort_order: ["sort_order", "sort", "order", "sequence", "rank", "number"],
    };
    const resolveCol = (keys) => {
      for (const key of keys) {
        const idx = headers.indexOf(key);
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const audienceIdx = resolveCol(alias.audience);
    const categoryIdx = resolveCol(alias.category);
    const titleIdx = resolveCol(alias.title);
    const descriptionIdx = resolveCol(alias.description);
    const sortIdx = resolveCol(alias.sort_order);
    if (titleIdx < 0) {
      throw new Error(
        `CSV must include a title column. Found headers: ${headers.filter(Boolean).join(", ") || "(none)"}.`
      );
    }

    const cards = [];
    const skippedEmptyTitle = [];
    for (let index = 1; index < records.length; index += 1) {
      const values = records[index];
      const title = String(values[titleIdx] || "").trim();
      const description =
        descriptionIdx >= 0 ? normalizeFantasyText(values[descriptionIdx] || "") : "";
      if (!title) {
        skippedEmptyTitle.push(index + 1);
        continue;
      }
      const rawAudience = String(values[audienceIdx] ?? "").trim();
      const audience = normalizeAudience(rawAudience) || (rawAudience ? rawAudience.toLowerCase() : "male");
      const category = normalizeCategory(values[categoryIdx]) || "romantic";
      cards.push({
        audience,
        category,
        title: normalizeFantasyText(title),
        description,
        sort_order:
          sortIdx >= 0 && values[sortIdx] !== ""
            ? Number(values[sortIdx])
            : cards.length * 10 + 10,
      });
    }
    if (cards.length === 0) {
      throw new Error("No fantasy rows with a title were found in the CSV.");
    }
    return { cards, skippedEmptyTitle };
  };

  const importCards = (rawCards, { replace = false } = {}, actingUserId) => {
    if (!Array.isArray(rawCards) || rawCards.length === 0) {
      throw new Error("Provide a JSON array of fantasy cards.");
    }
    const prepared = rawCards.map((raw, index) => {
      const payload = parseCardPayload(raw, {
        isCustom: false,
        rowLabel: `row ${index + 1}`,
      });
      if (raw.sort_order == null) payload.sort_order = (index + 1) * 10;
      return payload;
    });
    if (replace) {
      archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_CARDS_TABLE, "1 = 1", [], actingUserId);
    }
    let inserted = 0;
    for (const payload of prepared) {
      insertAuditedRow(TROUBLEHUB_FANTASY_CARDS_TABLE, payload, actingUserId);
      inserted += 1;
    }
    return { inserted };
  };

  const seedBaselineCards = (actingUserId, { replace = false } = {}) => {
    const filePath = path.join(DATA_ROOT, "troublehub", "fantasies-baseline.sample.json");
    if (!existsSync(filePath)) {
      throw new Error("Baseline fantasy file is missing on the server.");
    }
    const raw = JSON.parse(readFileSync(filePath, "utf8"));
    const cards = Array.isArray(raw) ? raw : raw.cards;
    const existingCount =
      Number(all(`SELECT COUNT(*) AS c FROM ${TROUBLEHUB_FANTASY_CARDS_TABLE}`)[0]?.c) || 0;
    if (existingCount > 0 && !replace) {
      return { inserted: 0, skipped: true, existing: existingCount };
    }
    return { ...importCards(cards, { replace }, actingUserId), skipped: false };
  };

  const handleApi = async (req, res, actingUser, url, pathName) => {
    if (!pathName.startsWith("/api/troublehub/fantasies")) return false;
    assertPlayerAccess(actingUser);

    if (req.method === "GET" && pathName === "/api/troublehub/fantasies/lobby") {
      const cards = listActiveCards();
      json(res, 200, {
        card_count: cards.length,
        cards,
        can_manage: isElevatedAdmin(actingUser),
        avatars: FANTASY_AVATAR_IDS,
      });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/sessions") {
      const body = await readBody(req);
      const role = normalizeAudience(body?.role ?? body?.audience);
      if (!role) {
        throw new Error(
          `Pick your role: male or female. Got: ${JSON.stringify(body?.role ?? body?.audience ?? "")}.`
        );
      }
      const { displayName, avatar } = parseProfile(body);
      const code = generateCode();
      const result = insertAuditedRow(
        TROUBLEHUB_FANTASY_SESSIONS_TABLE,
        {
          code,
          phase: "lobby",
          host_user_id: actingUser.id,
          male_user_id: role === "male" ? actingUser.id : null,
          female_user_id: role === "female" ? actingUser.id : null,
          male_display_name: role === "male" ? displayName : null,
          female_display_name: role === "female" ? displayName : null,
          male_avatar: role === "male" ? avatar : null,
          female_avatar: role === "female" ? avatar : null,
        },
        actingUser.id
      );
      const session = getSessionById(result.lastID);
      json(res, 200, buildState(actingUser, session));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/sessions/join") {
      const body = await readBody(req);
      const code = normalizeCode(body?.code);
      if (code.length < 4) throw new Error("Enter a valid session code.");
      const session = getSessionByCode(code);
      if (!session) throw new Error("No session found for that code.");

      const seatedAsMale = Number(session.male_user_id) === Number(actingUser.id);
      const seatedAsFemale = Number(session.female_user_id) === Number(actingUser.id);
      const alreadySeated = seatedAsMale || seatedAsFemale;
      const phase = migratePhase(session, openRound(session.id) || latestRound(session.id));

      if (alreadySeated) {
        const want = normalizeAudience(body?.role);
        const canSwitchSeat =
          phase === "lobby" &&
          want &&
          ((want === "female" && seatedAsMale && !session.female_user_id) ||
            (want === "male" && seatedAsFemale && !session.male_user_id));
        const { displayName, avatar } = parseProfile(body);
        if (canSwitchSeat && want === "female") {
          patchSession(session.id, {
            male_user_id: null,
            male_display_name: null,
            male_avatar: null,
            female_user_id: actingUser.id,
            female_display_name: displayName,
            female_avatar: avatar,
          });
        } else if (canSwitchSeat && want === "male") {
          patchSession(session.id, {
            female_user_id: null,
            female_display_name: null,
            female_avatar: null,
            male_user_id: actingUser.id,
            male_display_name: displayName,
            male_avatar: avatar,
          });
        } else if (want === "female" && seatedAsMale && !session.female_user_id) {
          throw new Error(
            "You're already seated as Male in this session. The Female seat needs a different login on the other PC."
          );
        } else if (want === "male" && seatedAsFemale && !session.male_user_id) {
          throw new Error(
            "You're already seated as Female in this session. The Male seat needs a different login on the other PC."
          );
        } else if (seatedAsMale) {
          patchSession(session.id, {
            male_display_name: displayName,
            male_avatar: avatar,
          });
        } else if (seatedAsFemale) {
          patchSession(session.id, {
            female_display_name: displayName,
            female_avatar: avatar,
          });
        }
      } else {
        if (session.male_user_id && session.female_user_id) {
          throw new Error("This session already has two players.");
        }
        const { displayName, avatar } = parseProfile(body);
        let role = normalizeAudience(body?.role ?? body?.audience);
        if (!role) {
          if (!session.male_user_id) role = "male";
          else if (!session.female_user_id) role = "female";
        }
        if (role === "male") {
          if (session.male_user_id) throw new Error("Male seat is already taken.");
          patchSession(session.id, {
            male_user_id: actingUser.id,
            male_display_name: displayName,
            male_avatar: avatar,
            phase: "lobby",
          });
        } else if (role === "female") {
          if (session.female_user_id) throw new Error("Female seat is already taken.");
          patchSession(session.id, {
            female_user_id: actingUser.id,
            female_display_name: displayName,
            female_avatar: avatar,
            phase: "lobby",
          });
        } else {
          throw new Error("Pick male or female to join.");
        }
      }

      json(res, 200, buildState(actingUser, getSessionById(session.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/sessions/start") {
      const { session } = await (async () => {
        const body = await readBody(req);
        const live = resolveSession(actingUser, {
          sessionId: body?.session_id,
          code: body?.code,
        });
        return { body, session: live };
      })();
      const live = getSessionById(session.id);
      if (Number(live.host_user_id) !== Number(actingUser.id)) {
        throw new Error("Only the host can start the game.");
      }
      if (!live.male_user_id || !live.female_user_id) {
        throw new Error("Both players must be seated before starting.");
      }
      clearSessionPlay(live.id, actingUser.id);
      patchSession(live.id, { phase: "picking" });
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "GET" && pathName === "/api/troublehub/fantasies/state") {
      const session = resolveSession(actingUser, {
        sessionId: url.searchParams.get("session_id"),
        code: url.searchParams.get("code"),
      });
      json(res, 200, buildState(actingUser, session));
      return true;
    }

    const requireSessionFromBody = async () => {
      const body = await readBody(req);
      const session = resolveSession(actingUser, {
        sessionId: body?.session_id,
        code: body?.code,
      });
      return { body, session };
    };

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/picks/toggle") {
      const { body, session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      const phase = migratePhase(live, openRound(live.id) || latestRound(live.id));
      if (phase !== "picking") {
        throw new Error("Card picks are only allowed during the picking phase.");
      }
      const cardId = Number(body?.card_id);
      const card = getCard(cardId);
      if (!card || !card.is_active) throw new Error("Card not found.");
      const myAudience =
        Number(live.male_user_id) === Number(actingUser.id)
          ? "male"
          : Number(live.female_user_id) === Number(actingUser.id)
            ? "female"
            : null;
      if (!myAudience) throw new Error("You must be seated as male or female to pick cards.");
      if (card.audience !== myAudience) {
        throw new Error(`You can only pick ${myAudience} fantasy cards.`);
      }
      if (userLocked(live.id, actingUser.id)) {
        throw new Error("Your picks are locked. Unlock first to change them.");
      }
      const existing = all(
        `
          SELECT id FROM ${TROUBLEHUB_FANTASY_PICKS_TABLE}
          WHERE session_id = ? AND user_id = ? AND card_id = ?
          LIMIT 1
        `,
        [live.id, actingUser.id, cardId]
      )[0];
      if (existing) {
        archiveAndDeleteRowsInternal(
          TROUBLEHUB_FANTASY_PICKS_TABLE,
          "id = ?",
          [existing.id],
          actingUser.id
        );
      } else {
        const need = requiredPicksForAudience(myAudience);
        const currentCount = listPicksForUser(live.id, actingUser.id).length;
        if (currentCount >= need) {
          throw new Error(`You can only pick ${need} cards.`);
        }
        insertAuditedRow(
          TROUBLEHUB_FANTASY_PICKS_TABLE,
          {
            session_id: live.id,
            user_id: actingUser.id,
            card_id: cardId,
            locked: 0,
          },
          actingUser.id
        );
      }
      if (live.phase !== "picking") patchSession(live.id, { phase: "picking" });
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/picks/lock") {
      const { session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      const phase = migratePhase(live, openRound(live.id) || latestRound(live.id));
      if (phase !== "picking") {
        throw new Error("Locking is only allowed during the picking phase.");
      }
      if (!live.male_user_id || !live.female_user_id) {
        throw new Error("Wait for your partner to join before locking picks.");
      }
      const picks = listPicksForUser(live.id, actingUser.id);
      const myAudience =
        Number(live.male_user_id) === Number(actingUser.id)
          ? "male"
          : Number(live.female_user_id) === Number(actingUser.id)
            ? "female"
            : null;
      if (!myAudience) throw new Error("You must be seated as male or female in this session.");
      const audiencePicks = picks.filter((row) => getCard(row.card_id)?.audience === myAudience);
      const need = requiredPicksForAudience(myAudience);
      if (audiencePicks.length !== need) {
        throw new Error(`Pick exactly ${need} ${myAudience} cards before locking.`);
      }
      for (const row of picks) {
        const card = getCard(row.card_id);
        if (card && card.audience !== myAudience) {
          archiveAndDeleteRowsInternal(
            TROUBLEHUB_FANTASY_PICKS_TABLE,
            "id = ?",
            [row.id],
            actingUser.id
          );
        }
      }
      run(
        `
          UPDATE ${TROUBLEHUB_FANTASY_PICKS_TABLE}
          SET locked = 1, updated_on = ?
          WHERE session_id = ? AND user_id = ?
        `,
        [stamp(), live.id, actingUser.id]
      );
      const refreshed = getSessionById(live.id);
      const both =
        refreshed.male_user_id &&
        refreshed.female_user_id &&
        userLocked(refreshed.id, refreshed.male_user_id) &&
        userLocked(refreshed.id, refreshed.female_user_id);
      if (both) {
        drawRoundFromPile(refreshed, actingUser.id);
      } else {
        patchSession(live.id, { phase: "picking" });
      }
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/picks/unlock") {
      const { session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      const phase = migratePhase(live, openRound(live.id) || latestRound(live.id));
      if (phase !== "picking") {
        throw new Error("Unlocking is only allowed during the picking phase.");
      }
      run(
        `
          UPDATE ${TROUBLEHUB_FANTASY_PICKS_TABLE}
          SET locked = 0, updated_on = ?
          WHERE session_id = ? AND user_id = ?
        `,
        [stamp(), live.id, actingUser.id]
      );
      patchSession(live.id, { phase: "picking" });
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/round/draw") {
      const { session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      if (!live.male_user_id || !live.female_user_id) {
        throw new Error("Both partners must join first.");
      }
      if (!userLocked(live.id, live.male_user_id) || !userLocked(live.id, live.female_user_id)) {
        throw new Error("Both partners must lock their picks first.");
      }
      if (openRound(live.id)) throw new Error("A round is already in progress.");
      drawRoundFromPile(live, actingUser.id);
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/round/choose") {
      const { body, session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      const round = openRound(live.id);
      if (!round) throw new Error("No open round to choose.");
      const choiceId = Number(body?.card_id);
      const notes = body?.notes == null ? undefined : String(body.notes);
      const isMale = Number(actingUser.id) === Number(live.male_user_id);
      const isFemale = Number(actingUser.id) === Number(live.female_user_id);

      if (isMale) {
        if (![round.male_option_a, round.male_option_b].includes(choiceId)) {
          throw new Error("Pick one of your two cards.");
        }
        const patch = { male_choice: choiceId, status: "choosing", updated_on: stamp() };
        if (notes !== undefined) patch.male_notes = notes;
        updateAuditedRow(TROUBLEHUB_FANTASY_ROUNDS_TABLE, patch, "id = ?", [round.id], actingUser.id);
      } else if (isFemale) {
        if (![round.female_option_a, round.female_option_b].includes(choiceId)) {
          throw new Error("Pick one of your two cards.");
        }
        const patch = { female_choice: choiceId, status: "choosing", updated_on: stamp() };
        if (notes !== undefined) patch.female_notes = notes;
        updateAuditedRow(TROUBLEHUB_FANTASY_ROUNDS_TABLE, patch, "id = ?", [round.id], actingUser.id);
      } else {
        throw new Error("Only seated partners can choose a card.");
      }

      const refreshed = all(
        `SELECT * FROM ${TROUBLEHUB_FANTASY_ROUNDS_TABLE} WHERE id = ? LIMIT 1`,
        [round.id]
      )[0];
      if (refreshed.male_choice && refreshed.female_choice) {
        updateAuditedRow(
          TROUBLEHUB_FANTASY_ROUNDS_TABLE,
          { status: "complete", completed_on: stamp(), updated_on: stamp() },
          "id = ?",
          [round.id],
          actingUser.id
        );
        patchSession(live.id, { phase: "mission" });
      } else {
        patchSession(live.id, { phase: "choosing" });
      }
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/round/notes") {
      const { body, session } = await requireSessionFromBody();
      const live = getSessionById(session.id);
      const round = openRound(live.id) || latestRound(live.id);
      if (!round) throw new Error("No round found.");
      const patch = { updated_on: stamp() };
      if (Number(actingUser.id) === Number(live.male_user_id) && body?.notes != null) {
        patch.male_notes = String(body.notes);
      } else if (Number(actingUser.id) === Number(live.female_user_id) && body?.notes != null) {
        patch.female_notes = String(body.notes);
      } else {
        throw new Error("Only seated partners can edit their notes.");
      }
      updateAuditedRow(TROUBLEHUB_FANTASY_ROUNDS_TABLE, patch, "id = ?", [round.id], actingUser.id);
      json(res, 200, buildState(actingUser, getSessionById(live.id)));
      return true;
    }

    if (req.method === "GET" && pathName === "/api/troublehub/fantasies/cards") {
      json(res, 200, {
        cards: listActiveCards(),
        can_manage: isElevatedAdmin(actingUser),
      });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/cards") {
      const body = await readBody(req);
      const isCustom = !isElevatedAdmin(actingUser);
      const payload = parseCardPayload(body, { isCustom });
      if (isCustom) {
        payload.is_custom = 1;
        payload.is_active = 1;
      }
      if (!payload.title) throw new Error("Title is required.");
      const result = insertAuditedRow(TROUBLEHUB_FANTASY_CARDS_TABLE, payload, actingUser.id);
      if (typeof notifyPlayers === "function") {
        notifyPlayers({
          type: "fantasy_custom_card",
          title: "New custom fantasy",
          message: payload.title,
          link_path: "/app/troublehub/fantasies",
          related_card_id: result.lastID,
          excludeUserId: actingUser.id,
          actingUserId: actingUser.id,
        });
      }
      json(res, 200, { card: getCard(result.lastID) });
      return true;
    }

    const cardIdMatch = pathName.match(/^\/api\/troublehub\/fantasies\/cards\/(\d+)$/);
    if (cardIdMatch) {
      const cardId = Number(cardIdMatch[1]);
      if (req.method === "PUT") {
        const body = await readBody(req);
        const existing = getCard(cardId);
        if (!existing) throw new Error("Card not found.");
        const payload = parseCardPayload(
          {
            audience: body?.audience ?? existing.audience,
            category: body?.category ?? existing.category,
            title: body?.title ?? existing.title,
            description: body?.description ?? existing.description,
            is_custom: existing.is_custom,
            is_active: body?.is_active ?? existing.is_active,
            sort_order: body?.sort_order ?? existing.sort_order,
          },
          { isCustom: Boolean(existing.is_custom) }
        );
        updateAuditedRow(
          TROUBLEHUB_FANTASY_CARDS_TABLE,
          { ...payload, updated_on: stamp() },
          "id = ?",
          [cardId],
          actingUser.id
        );
        json(res, 200, { card: getCard(cardId) });
        return true;
      }
      if (req.method === "DELETE") {
        const existing = getCard(cardId);
        if (!existing) throw new Error("Card not found.");
        archiveAndDeleteRowsInternal(
          TROUBLEHUB_FANTASY_CARDS_TABLE,
          "id = ?",
          [cardId],
          actingUser.id
        );
        json(res, 200, { ok: true, id: cardId });
        return true;
      }
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/cards/import") {
      const body = await readBody(req);
      let cards = Array.isArray(body) ? body : body?.cards;
      let skippedEmptyTitle = [];
      if ((!cards || cards.length === 0) && typeof body?.csv === "string") {
        const parsed = parseFantasyCsv(body.csv);
        cards = parsed.cards;
        skippedEmptyTitle = parsed.skippedEmptyTitle || [];
      }
      const result = importCards(cards, { replace: Boolean(body?.replace) }, actingUser.id);
      json(res, 200, {
        ...result,
        skipped_empty_title: skippedEmptyTitle.length,
        skipped_rows: skippedEmptyTitle,
      });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/cards/clear") {
      const body = await readBody(req);
      archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_CARDS_TABLE, "1 = 1", [], actingUser.id);
      if (body?.also_sessions) {
        archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_ROUNDS_TABLE, "1 = 1", [], actingUser.id);
        archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_PICKS_TABLE, "1 = 1", [], actingUser.id);
      }
      json(res, 200, { ok: true, card_count: 0 });
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/cards/seed-baseline") {
      assertElevatedAdmin(actingUser);
      const body = await readBody(req);
      const result = seedBaselineCards(actingUser.id, { replace: Boolean(body?.replace) });
      json(res, 200, result);
      return true;
    }

    if (req.method === "POST" && pathName === "/api/troublehub/fantasies/reset") {
      assertElevatedAdmin(actingUser);
      const body = await readBody(req);
      if (body?.session_id || body?.code) {
        const session = resolveSession(actingUser, {
          sessionId: body.session_id,
          code: body.code,
        });
        clearSessionPlay(session.id, actingUser.id);
        patchSession(session.id, { phase: "lobby" });
        json(res, 200, { ok: true });
        return true;
      }
      archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_ROUNDS_TABLE, "1 = 1", [], actingUser.id);
      archiveAndDeleteRowsInternal(TROUBLEHUB_FANTASY_PICKS_TABLE, "1 = 1", [], actingUser.id);
      json(res, 200, { ok: true });
      return true;
    }

    return false;
  };

  return { ensureSchema, handleApi, importCards, FANTASY_AVATAR_IDS };
}
