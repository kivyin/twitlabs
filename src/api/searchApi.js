import { apiRequest } from "./http";

export function searchAllApps({ query, limit = 60, offset = 0 } = {}) {
  const params = new URLSearchParams({
    q: String(query ?? ""),
    limit: String(limit),
    offset: String(offset),
  });
  return apiRequest(`/api/search?${params.toString()}`);
}
