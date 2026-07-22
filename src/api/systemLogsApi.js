import { apiRequest } from "./http";

export async function getSystemLogs(limit = 200) {
  const payload = await apiRequest(`/api/admin/system-logs?limit=${encodeURIComponent(limit)}`);
  return payload.records ?? [];
}
