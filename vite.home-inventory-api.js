/**
 * Home Inventory schema + HTTP handlers.
 * Track food / household items by location (freezers, fridges, etc.).
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

export const HOME_INVENTORY_LOCATIONS_TABLE = "home_inventory_locations";
export const HOME_INVENTORY_ITEMS_TABLE = "home_inventory_items";
export const HOME_INVENTORY_BRANDS_TABLE = "home_inventory_brands";

const DEFAULT_LOCATIONS = [
  { name: "Chest Freezer", description: "Chest freezer storage", sort_order: 10 },
  { name: "Upright Freezer", description: "Upright freezer storage", sort_order: 20 },
  {
    name: "Fridge Freezer downstairs",
    description: "Downstairs fridge freezer",
    sort_order: 30,
  },
  {
    name: "Fridge Freezer upstairs",
    description: "Upstairs fridge freezer",
    sort_order: 40,
  },
];

const IMAGE_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function installHomeInventoryApi(deps) {
  const {
    run,
    all,
    insertAuditedRow,
    updateAuditedRow,
    archiveAndDeleteRowsInternal,
    userCanAccessApp,
    json,
    readBody,
    sendApiError,
    DATA_ROOT,
    CALENDAR_EVENTS_TABLE,
  } = deps;

  const IMAGES_DIR = path.join(DATA_ROOT, "home-inventory-images");

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
      if (existsSync(absolutePath)) {
        unlinkSync(absolutePath);
      }
    } catch {
      // ignore missing files
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
    if (!data) {
      throw new Error("Image file is required.");
    }
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

  const ensureHomeInventorySchema = () => {
    run(`
      CREATE TABLE IF NOT EXISTS ${HOME_INVENTORY_LOCATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${HOME_INVENTORY_ITEMS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT,
        image_path TEXT,
        image_mime_type TEXT,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    run(`
      CREATE TABLE IF NOT EXISTS ${HOME_INVENTORY_BRANDS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_by INTEGER,
        created_on TEXT,
        updated_by INTEGER,
        updated_on TEXT
      )
    `);

    const itemColumns = new Set(
      all(`PRAGMA table_info(${HOME_INVENTORY_ITEMS_TABLE})`).map((row) => row.name)
    );
    if (!itemColumns.has("brand")) {
      run(`ALTER TABLE ${HOME_INVENTORY_ITEMS_TABLE} ADD COLUMN brand TEXT`);
    }

    run(
      `CREATE INDEX IF NOT EXISTS idx_home_inv_items_location ON ${HOME_INVENTORY_ITEMS_TABLE}(location_id)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_home_inv_items_name ON ${HOME_INVENTORY_ITEMS_TABLE}(name)`
    );
    run(
      `CREATE INDEX IF NOT EXISTS idx_home_inv_items_brand ON ${HOME_INVENTORY_ITEMS_TABLE}(brand)`
    );

    // Seed brand catalog once from brands already used on items (if any).
    const brandCatalogCount =
      Number(all(`SELECT COUNT(*) AS c FROM ${HOME_INVENTORY_BRANDS_TABLE}`)[0]?.c) || 0;
    if (brandCatalogCount === 0) {
      const existingBrands = all(
        `
          SELECT DISTINCT TRIM(brand) AS name
          FROM ${HOME_INVENTORY_ITEMS_TABLE}
          WHERE brand IS NOT NULL AND TRIM(brand) != ''
        `
      );
      const ts = stamp();
      for (const row of existingBrands) {
        const name = String(row.name || "").trim();
        if (!name) continue;
        try {
          run(
            `
              INSERT INTO ${HOME_INVENTORY_BRANDS_TABLE} (name, created_on, updated_on)
              VALUES (?, ?, ?)
            `,
            [name, ts, ts]
          );
        } catch {
          // ignore unique races
        }
      }
    }

    const count = all(`SELECT COUNT(*) AS c FROM ${HOME_INVENTORY_LOCATIONS_TABLE}`)[0]?.c || 0;
    if (Number(count) === 0) {
      const ts = stamp();
      for (const location of DEFAULT_LOCATIONS) {
        run(
          `
            INSERT INTO ${HOME_INVENTORY_LOCATIONS_TABLE}
              (name, description, sort_order, created_on, updated_on)
            VALUES (?, ?, ?, ?, ?)
          `,
          [location.name, location.description, location.sort_order, ts, ts]
        );
      }
    }
  };

  const assertAccess = (user) => {
    if (!user) throw new Error("Unauthorized.");
    if (!userCanAccessApp(user, "home_inventory")) {
      throw new Error("You do not have access to Home Inventory.");
    }
  };

  const getLocationOrThrow = (locationId) => {
    const row = all(
      `SELECT * FROM ${HOME_INVENTORY_LOCATIONS_TABLE} WHERE id = ? LIMIT 1`,
      [locationId]
    )[0];
    if (!row) throw new Error("Location not found.");
    return row;
  };

  const getItemOrThrow = (itemId) => {
    const row = all(
      `
        SELECT i.*, l.name AS location_name
        FROM ${HOME_INVENTORY_ITEMS_TABLE} i
        JOIN ${HOME_INVENTORY_LOCATIONS_TABLE} l ON l.id = i.location_id
        WHERE i.id = ?
        LIMIT 1
      `,
      [itemId]
    )[0];
    if (!row) throw new Error("Item not found.");
    return row;
  };

  const listLocations = () =>
    all(
      `
        SELECT l.*,
          (SELECT COUNT(*) FROM ${HOME_INVENTORY_ITEMS_TABLE} i WHERE i.location_id = l.id) AS item_count,
          (SELECT COALESCE(SUM(i.quantity), 0) FROM ${HOME_INVENTORY_ITEMS_TABLE} i WHERE i.location_id = l.id) AS total_quantity
        FROM ${HOME_INVENTORY_LOCATIONS_TABLE} l
        ORDER BY l.sort_order ASC, l.name ASC, l.id ASC
      `
    );

  const createLocation = (body, actingUserId) => {
    const name = String(body?.name || "").trim();
    if (!name) throw new Error("Location name is required.");
    const result = insertAuditedRow(
      HOME_INVENTORY_LOCATIONS_TABLE,
      {
        name,
        description: String(body?.description || "").trim() || null,
        sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 100,
      },
      actingUserId
    );
    return getLocationOrThrow(result.lastID);
  };

  const updateLocation = (locationId, body, actingUserId) => {
    getLocationOrThrow(locationId);
    const data = {};
    if (body?.name !== undefined) {
      data.name = String(body.name || "").trim() || "Location";
    }
    if (body?.description !== undefined) {
      data.description = String(body.description || "").trim() || null;
    }
    if (body?.sort_order !== undefined) {
      data.sort_order = Number(body.sort_order) || 0;
    }
    if (Object.keys(data).length === 0) {
      return getLocationOrThrow(locationId);
    }
    updateAuditedRow(
      HOME_INVENTORY_LOCATIONS_TABLE,
      data,
      "id = ?",
      [locationId],
      actingUserId
    );
    return getLocationOrThrow(locationId);
  };

  const deleteLocation = (locationId, actingUserId) => {
    getLocationOrThrow(locationId);
    const items = all(
      `SELECT id, image_path FROM ${HOME_INVENTORY_ITEMS_TABLE} WHERE location_id = ?`,
      [locationId]
    );
    for (const item of items) {
      deleteImageFile(item.image_path);
      archiveAndDeleteRowsInternal(
        HOME_INVENTORY_ITEMS_TABLE,
        "id = ?",
        [item.id],
        actingUserId
      );
    }
    archiveAndDeleteRowsInternal(
      HOME_INVENTORY_LOCATIONS_TABLE,
      "id = ?",
      [locationId],
      actingUserId
    );
  };

  const listItems = ({ locationId, q, limit, offset } = {}) => {
    const params = [];
    const where = [];
    if (locationId != null && locationId !== "") {
      where.push("i.location_id = ?");
      params.push(Number(locationId));
    }
    const query = String(q || "").trim();
    if (query) {
      where.push(
        "(LOWER(i.name) LIKE ? OR LOWER(IFNULL(i.description, '')) LIKE ? OR LOWER(IFNULL(i.brand, '')) LIKE ?)"
      );
      const like = `%${query.toLowerCase()}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total =
      Number(
        all(
          `
            SELECT COUNT(*) AS c
            FROM ${HOME_INVENTORY_ITEMS_TABLE} i
            JOIN ${HOME_INVENTORY_LOCATIONS_TABLE} l ON l.id = i.location_id
            ${whereSql}
          `,
          params
        )[0]?.c
      ) || 0;

    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const pageOffset = Math.max(0, Number(offset) || 0);
    const items = all(
      `
        SELECT i.*, l.name AS location_name
        FROM ${HOME_INVENTORY_ITEMS_TABLE} i
        JOIN ${HOME_INVENTORY_LOCATIONS_TABLE} l ON l.id = i.location_id
        ${whereSql}
        ORDER BY l.sort_order ASC, l.name ASC, LOWER(i.name) ASC, i.id ASC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, pageOffset]
    );

    return {
      items,
      total,
      limit: pageSize,
      offset: pageOffset,
      has_more: pageOffset + items.length < total,
    };
  };

  const listBrands = ({ q } = {}) => {
    const query = String(q || "").trim().toLowerCase();
    const params = [];
    let whereSql = "";
    if (query) {
      whereSql = `WHERE LOWER(name) LIKE ?`;
      params.push(`%${query}%`);
    }
    return all(
      `
        SELECT name
        FROM ${HOME_INVENTORY_BRANDS_TABLE}
        ${whereSql}
        ORDER BY LOWER(name) ASC
        LIMIT 40
      `,
      params
    )
      .map((row) => String(row.name || "").trim())
      .filter(Boolean);
  };

  const createBrand = (body, actingUserId) => {
    const name = String(body?.name || "").trim();
    if (!name) throw new Error("Brand name is required.");
    const existing = all(
      `SELECT name FROM ${HOME_INVENTORY_BRANDS_TABLE} WHERE name = ? COLLATE NOCASE LIMIT 1`,
      [name]
    )[0];
    if (existing) return { brand: existing.name, created: false };
    insertAuditedRow(HOME_INVENTORY_BRANDS_TABLE, { name }, actingUserId);
    return { brand: name, created: true };
  };

  const createItem = (body, actingUserId) => {
    const locationId = Number(body?.location_id);
    if (!Number.isFinite(locationId)) throw new Error("Location is required.");
    getLocationOrThrow(locationId);
    const name = String(body?.name || "").trim();
    if (!name) throw new Error("Item name is required.");
    const quantity = Number(body?.quantity);
    const result = insertAuditedRow(
      HOME_INVENTORY_ITEMS_TABLE,
      {
        location_id: locationId,
        name,
        brand: String(body?.brand || "").trim() || null,
        description: String(body?.description || "").trim() || null,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unit: String(body?.unit || "").trim() || null,
        image_path: null,
        image_mime_type: null,
      },
      actingUserId
    );
    return getItemOrThrow(result.lastID);
  };

  const updateItem = (itemId, body, actingUserId) => {
    getItemOrThrow(itemId);
    const data = {};
    if (body?.location_id !== undefined) {
      const locationId = Number(body.location_id);
      if (!Number.isFinite(locationId)) throw new Error("Invalid location.");
      getLocationOrThrow(locationId);
      data.location_id = locationId;
    }
    if (body?.name !== undefined) {
      data.name = String(body.name || "").trim() || "Item";
    }
    if (body?.brand !== undefined) {
      data.brand = String(body.brand || "").trim() || null;
    }
    if (body?.description !== undefined) {
      data.description = String(body.description || "").trim() || null;
    }
    if (body?.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("Quantity must be zero or greater.");
      }
      data.quantity = quantity;
    }
    if (body?.unit !== undefined) {
      data.unit = String(body.unit || "").trim() || null;
    }
    if (Object.keys(data).length === 0) {
      return getItemOrThrow(itemId);
    }
    updateAuditedRow(HOME_INVENTORY_ITEMS_TABLE, data, "id = ?", [itemId], actingUserId);
    return getItemOrThrow(itemId);
  };

  const deleteItem = (itemId, actingUserId) => {
    const item = getItemOrThrow(itemId);
    deleteImageFile(item.image_path);
    archiveAndDeleteRowsInternal(HOME_INVENTORY_ITEMS_TABLE, "id = ?", [itemId], actingUserId);
  };

  const setItemImage = (itemId, { file_base64, mime_type } = {}, actingUserId) => {
    getItemOrThrow(itemId);
    const { data, mimeType } = normalizeImagePayload(file_base64, mime_type);
    const extension = IMAGE_MIME_EXTENSIONS[mimeType] || ".jpg";
    const relativePath = `${itemId}_${randomBytes(8).toString("hex")}${extension}`;
    const absolutePath = resolveImageAbsolutePath(relativePath);

    ensureImagesDir();
    writeFileSync(absolutePath, Buffer.from(data, "base64"));

    const existing = all(
      `SELECT image_path FROM ${HOME_INVENTORY_ITEMS_TABLE} WHERE id = ? LIMIT 1`,
      [itemId]
    )[0];

    updateAuditedRow(
      HOME_INVENTORY_ITEMS_TABLE,
      { image_path: relativePath, image_mime_type: mimeType },
      "id = ?",
      [itemId],
      actingUserId
    );
    deleteImageFile(existing?.image_path);
    return getItemOrThrow(itemId);
  };

  const readItemImageFile = (itemId) => {
    const row = all(
      `SELECT image_path, image_mime_type FROM ${HOME_INVENTORY_ITEMS_TABLE} WHERE id = ? LIMIT 1`,
      [itemId]
    )[0];
    if (!row?.image_path) {
      throw new Error("This item has no image.");
    }
    const absolutePath = resolveImageAbsolutePath(row.image_path);
    if (!existsSync(absolutePath)) {
      throw new Error("Image file is missing on disk.");
    }
    return {
      mimeType: row.image_mime_type || "image/jpeg",
      buffer: readFileSync(absolutePath),
    };
  };

  const deleteItemImage = (itemId, actingUserId) => {
    const item = getItemOrThrow(itemId);
    updateAuditedRow(
      HOME_INVENTORY_ITEMS_TABLE,
      { image_path: null, image_mime_type: null },
      "id = ?",
      [itemId],
      actingUserId
    );
    deleteImageFile(item.image_path);
    return getItemOrThrow(itemId);
  };

  const pad2 = (value) => String(value).padStart(2, "0");

  const localDateString = (date = new Date()) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  const formatDinnerLine = (item) => {
    const qty = Number(item.quantity);
    const qtyText = Number.isFinite(qty) ? String(qty) : "";
    const unit = String(item.unit || "").trim();
    const amount = [qtyText, unit].filter(Boolean).join(" ");
    return amount ? `- ${item.name} (${amount})` : `- ${item.name}`;
  };

  /**
   * Add inventory item(s) to today's "Dinner" calendar event (create or append notes).
   */
  const addItemsToTonightDinner = (body, actingUserId) => {
    if (!CALENDAR_EVENTS_TABLE) {
      throw new Error("Calendar is not available on this server.");
    }

    const dateStr = String(body?.date || "").trim() || localDateString();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error("Invalid dinner date. Use YYYY-MM-DD.");
    }

    let itemsToAdd = [];
    if (Array.isArray(body?.item_ids) && body.item_ids.length) {
      itemsToAdd = body.item_ids.map((id) => getItemOrThrow(Number(id)));
    } else if (body?.item_id != null && body?.item_id !== "") {
      itemsToAdd = [getItemOrThrow(Number(body.item_id))];
    } else {
      throw new Error("Select at least one inventory item.");
    }

    const lines = itemsToAdd.map(formatDinnerLine);
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const existing = all(
      `
        SELECT *
        FROM ${CALENDAR_EVENTS_TABLE}
        WHERE LOWER(TRIM(title)) = 'dinner'
          AND start_at >= ?
          AND start_at <= ?
        ORDER BY id ASC
        LIMIT 1
      `,
      [dayStart, dayEnd]
    )[0];

    if (existing) {
      const currentNotes = String(existing.notes || "").trim();
      const toAppend = lines.filter((line) => {
        const namePart = line.replace(/^- /, "").split(" (")[0].toLowerCase();
        return !currentNotes
          .toLowerCase()
          .split(/\r?\n/)
          .some((row) => row.includes(namePart));
      });
      if (toAppend.length === 0) {
        return {
          created: false,
          event: existing,
          message: "Already on tonight’s dinner.",
        };
      }
      const notes = currentNotes ? `${currentNotes}\n${toAppend.join("\n")}` : toAppend.join("\n");
      updateAuditedRow(
        CALENDAR_EVENTS_TABLE,
        { notes },
        "id = ?",
        [existing.id],
        actingUserId
      );
      const event = all(
        `SELECT * FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ? LIMIT 1`,
        [existing.id]
      )[0];
      return {
        created: false,
        event,
        added: toAppend.length,
        message: `Added to tonight’s dinner (${toAppend.length}).`,
      };
    }

    const notes = lines.join("\n");
    const result = insertAuditedRow(
      CALENDAR_EVENTS_TABLE,
      {
        title: "Dinner",
        assignee_user_id: actingUserId,
        start_at: `${dateStr}T18:00:00`,
        end_at: `${dateStr}T19:00:00`,
        notes,
        color: "#f97316",
        all_day: 0,
        recurrence: null,
        recurrence_until: null,
      },
      actingUserId
    );
    const event = all(
      `SELECT * FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ? LIMIT 1`,
      [result.lastID]
    )[0];
    return {
      created: true,
      event,
      added: lines.length,
      message: "Dinner event created for tonight.",
    };
  };

  const handleHomeInventoryApi = async (req, res, getSessionUser) => {
    const url = new URL(req.url, "http://localhost");
    const pathName = url.pathname;
    if (!pathName.startsWith("/api/home-inventory")) {
      return false;
    }

    try {
      const actingUser = getSessionUser(req);
      assertAccess(actingUser);

      if (req.method === "GET" && pathName === "/api/home-inventory/summary") {
        const locations = listLocations();
        json(res, 200, {
          location_count: locations.length,
          item_count: locations.reduce((sum, row) => sum + Number(row.item_count || 0), 0),
          locations,
        });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/home-inventory/locations") {
        json(res, 200, { locations: listLocations() });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/home-inventory/locations") {
        const body = await readBody(req);
        json(res, 200, { location: createLocation(body, actingUser.id) });
        return true;
      }

      const locationMatch = pathName.match(/^\/api\/home-inventory\/locations\/(\d+)$/);
      if (locationMatch) {
        const locationId = Number(locationMatch[1]);
        if (req.method === "GET") {
          json(res, 200, {
            location: getLocationOrThrow(locationId),
            ...listItems({ locationId, limit: 100, offset: 0 }),
          });
          return true;
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          json(res, 200, { location: updateLocation(locationId, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          deleteLocation(locationId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      if (req.method === "GET" && pathName === "/api/home-inventory/items") {
        const limit = url.searchParams.get("limit");
        const offset = url.searchParams.get("offset");
        const page = url.searchParams.get("page");
        const pageSize = Number(limit) || 25;
        const pageNumber = Math.max(1, Number(page) || 1);
        const resolvedOffset =
          offset != null && offset !== ""
            ? Number(offset)
            : (pageNumber - 1) * pageSize;
        json(res, 200, {
          ...listItems({
            locationId: url.searchParams.get("location_id"),
            q: url.searchParams.get("q"),
            limit: pageSize,
            offset: resolvedOffset,
          }),
          page: Math.floor(resolvedOffset / pageSize) + 1,
          page_size: pageSize,
        });
        return true;
      }

      if (req.method === "GET" && pathName === "/api/home-inventory/brands") {
        json(res, 200, {
          brands: listBrands({ q: url.searchParams.get("q") }),
        });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/home-inventory/brands") {
        const body = await readBody(req);
        json(res, 200, createBrand(body, actingUser.id));
        return true;
      }

      if (req.method === "POST" && pathName === "/api/home-inventory/items") {
        const body = await readBody(req);
        json(res, 200, { item: createItem(body, actingUser.id) });
        return true;
      }

      if (req.method === "POST" && pathName === "/api/home-inventory/dinner") {
        const body = await readBody(req);
        json(res, 200, addItemsToTonightDinner(body, actingUser.id));
        return true;
      }

      const itemImageMatch = pathName.match(/^\/api\/home-inventory\/items\/(\d+)\/image$/);
      if (itemImageMatch) {
        const itemId = Number(itemImageMatch[1]);
        if (req.method === "POST") {
          const body = await readBody(req);
          json(res, 200, { item: setItemImage(itemId, body, actingUser.id) });
          return true;
        }
        if (req.method === "GET") {
          const { mimeType, buffer } = readItemImageFile(itemId);
          res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": buffer.length,
            "Cache-Control": "private, max-age=300",
          });
          res.end(buffer);
          return true;
        }
        if (req.method === "DELETE") {
          json(res, 200, { item: deleteItemImage(itemId, actingUser.id) });
          return true;
        }
      }

      const itemMatch = pathName.match(/^\/api\/home-inventory\/items\/(\d+)$/);
      if (itemMatch) {
        const itemId = Number(itemMatch[1]);
        if (req.method === "GET") {
          json(res, 200, { item: getItemOrThrow(itemId) });
          return true;
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          json(res, 200, { item: updateItem(itemId, body, actingUser.id) });
          return true;
        }
        if (req.method === "DELETE") {
          deleteItem(itemId, actingUser.id);
          json(res, 200, { ok: true });
          return true;
        }
      }

      sendApiError(res, req, 404, "Home Inventory API route not found.", {
        function_name: "homeInventoryApi",
      });
      return true;
    } catch (error) {
      const statusCode =
        error.message === "Unauthorized."
          ? 401
          : /access/i.test(error.message)
            ? 403
            : /not found/i.test(error.message)
              ? 404
              : 400;
      sendApiError(res, req, statusCode, error, { function_name: "homeInventoryApi" });
      return true;
    }
  };

  return {
    ensureHomeInventorySchema,
    handleHomeInventoryApi,
    HOME_INVENTORY_IMAGES_DIR: IMAGES_DIR,
  };
}
