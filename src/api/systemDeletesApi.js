import { apiRequest } from "./http";

export async function getSystemDeletes() {
  const payload = await apiRequest("/api/admin/system-deletes");
  return payload.records ?? [];
}

export function restoreSystemDelete(id) {
  return apiRequest(`/api/admin/system-deletes/${id}/restore`, {
    method: "POST",
  });
}
