import { apiRequest } from "./http";

export function getCalendarEvents({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return apiRequest(`/api/calendar/events${query ? `?${query}` : ""}`);
}

export function createCalendarEvent(payload) {
  return apiRequest("/api/calendar/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCalendarEvent(id, payload) {
  return apiRequest(`/api/calendar/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCalendarEvent(id) {
  return apiRequest(`/api/calendar/events/${id}`, {
    method: "DELETE",
  });
}

export function getCalendarUsers() {
  return apiRequest("/api/calendar/users");
}

export function listShoppingLists({ includeClosed = false } = {}) {
  const params = new URLSearchParams();
  if (includeClosed) params.set("include_closed", "1");
  const query = params.toString();
  return apiRequest(`/api/calendar/shopping-lists${query ? `?${query}` : ""}`);
}

export function getShoppingList(listId) {
  return apiRequest(`/api/calendar/shopping-lists/${listId}`);
}

export function createShoppingList(payload) {
  return apiRequest("/api/calendar/shopping-lists", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShoppingList(listId, payload) {
  return apiRequest(`/api/calendar/shopping-lists/${listId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteShoppingList(listId) {
  return apiRequest(`/api/calendar/shopping-lists/${listId}`, {
    method: "DELETE",
  });
}

export function createShoppingItem(listId, payload) {
  return apiRequest(`/api/calendar/shopping-lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShoppingItem(itemId, payload) {
  return apiRequest(`/api/calendar/shopping-items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteShoppingItem(itemId) {
  return apiRequest(`/api/calendar/shopping-items/${itemId}`, {
    method: "DELETE",
  });
}
