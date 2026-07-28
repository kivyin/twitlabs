import { apiRequest } from "./http";

export function getDecisionPicker() {
  return apiRequest("/api/decisions");
}

export function addDecisionItem(label) {
  return apiRequest("/api/decisions/items", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export function removeDecisionItem(itemId) {
  return apiRequest(`/api/decisions/items/${itemId}`, {
    method: "DELETE",
  });
}

export function clearDecisionItems() {
  return apiRequest("/api/decisions/items", {
    method: "DELETE",
  });
}
