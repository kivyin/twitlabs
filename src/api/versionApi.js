import { apiRequest } from "./http";

export function getVersionStatus() {
  return apiRequest("/api/version", {
    method: "GET",
    skipUnauthorizedHandler: true,
    skipErrorLog: true,
  });
}
