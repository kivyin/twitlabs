import { apiRequest } from "./http";

export async function getFavorites() {
  const payload = await apiRequest("/api/favorites");
  return payload.favorites ?? [];
}

export function addFavorite({ label, path, icon = null }) {
  return apiRequest("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ label, path, icon }),
  });
}

export function updateFavorite(id, { label, icon = null, color = null, custom_icon_data = null }) {
  return apiRequest(`/api/favorites/${id}`, {
    method: "PUT",
    body: JSON.stringify({ label, icon, color, custom_icon_data }),
  });
}

export function removeFavorite(id) {
  return apiRequest(`/api/favorites/${id}`, {
    method: "DELETE",
  });
}

export function reorderFavorites(ids) {
  return apiRequest("/api/favorites/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}
