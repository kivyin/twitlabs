import { apiRequest } from "./http";
import { invalidateForeignKeyLabelCache } from "../utils/foreignKeyLabelCache";

export async function runZeroBoot({ confirm }) {
  const result = await apiRequest("/api/admin/zero-boot", {
    method: "POST",
    body: JSON.stringify({ confirm }),
  });
  // Lookup tables are reseeded with new IDs; drop stale client label maps.
  invalidateForeignKeyLabelCache();
  return result;
}

export function escalateIdeAccess(password) {
  return apiRequest("/api/admin/ide/escalate", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function deescalateIdeAccess() {
  return apiRequest("/api/admin/ide/deescalate", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function runElevatedIdeSql({ sql, params = [] }) {
  return apiRequest("/api/admin/ide/sql", {
    method: "POST",
    body: JSON.stringify({ sql, params }),
  });
}
