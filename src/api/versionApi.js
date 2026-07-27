import { apiRequest } from "./http";

export function getVersionStatus({ refresh = false } = {}) {
  const path = refresh ? "/api/version?refresh=1" : "/api/version";
  return apiRequest(path, {
    method: "GET",
    skipUnauthorizedHandler: true,
    skipErrorLog: true,
  });
}
