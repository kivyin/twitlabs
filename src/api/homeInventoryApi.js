import { apiRequest, triggerUnauthorized } from "./http";

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getHomeInventorySummary() {
  return apiRequest("/api/home-inventory/summary");
}

export function listHomeInventoryLocations() {
  return apiRequest("/api/home-inventory/locations");
}

export function getHomeInventoryLocation(locationId) {
  return apiRequest(`/api/home-inventory/locations/${locationId}`);
}

export function createHomeInventoryLocation(data) {
  return apiRequest("/api/home-inventory/locations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateHomeInventoryLocation(locationId, data) {
  return apiRequest(`/api/home-inventory/locations/${locationId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteHomeInventoryLocation(locationId) {
  return apiRequest(`/api/home-inventory/locations/${locationId}`, {
    method: "DELETE",
  });
}

export function listHomeInventoryItems({ locationId, q, page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams();
  if (locationId != null && locationId !== "") params.set("location_id", String(locationId));
  if (q) params.set("q", q);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return apiRequest(`/api/home-inventory/items${qs ? `?${qs}` : ""}`);
}

export function listHomeInventoryBrands({ q } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  return apiRequest(`/api/home-inventory/brands${qs ? `?${qs}` : ""}`);
}

export function createHomeInventoryBrand(name) {
  return apiRequest("/api/home-inventory/brands", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getHomeInventoryItem(itemId) {
  return apiRequest(`/api/home-inventory/items/${itemId}`);
}

export function createHomeInventoryItem(data) {
  return apiRequest("/api/home-inventory/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateHomeInventoryItem(itemId, data) {
  return apiRequest(`/api/home-inventory/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteHomeInventoryItem(itemId) {
  return apiRequest(`/api/home-inventory/items/${itemId}`, {
    method: "DELETE",
  });
}

export function uploadHomeInventoryItemImage(itemId, { fileBase64, mimeType }) {
  return apiRequest(`/api/home-inventory/items/${itemId}/image`, {
    method: "POST",
    body: JSON.stringify({ file_base64: fileBase64, mime_type: mimeType }),
  });
}

export function deleteHomeInventoryItemImage(itemId) {
  return apiRequest(`/api/home-inventory/items/${itemId}/image`, {
    method: "DELETE",
  });
}

export async function fetchHomeInventoryItemImageUrl(itemId) {
  const response = await fetch(`/api/home-inventory/items/${itemId}/image`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    triggerUnauthorized();
    return "";
  }
  if (!response.ok) {
    return "";
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

/** Add item(s) to today's Dinner calendar event (creates or appends). */
export function addHomeInventoryToDinner({ itemId, itemIds, date } = {}) {
  return apiRequest("/api/home-inventory/dinner", {
    method: "POST",
    body: JSON.stringify({
      item_id: itemId,
      item_ids: itemIds,
      date,
    }),
  });
}
