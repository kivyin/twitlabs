import { apiRequest } from "./http";

export async function getUserPreference(key) {
  const payload = await apiRequest(`/api/preferences?key=${encodeURIComponent(key)}`);
  return payload.preference ?? null;
}

export function setUserPreference(key, value) {
  return apiRequest("/api/preferences", {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
}
