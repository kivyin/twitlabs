import { reportClientError } from "./logsApi";

let unauthorizedHandler = null;

/** Register a callback for 401 responses (session expired / logged out). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function triggerUnauthorized(payload = {}) {
  unauthorizedHandler?.(payload);
}

const TOKEN_KEY = "auth_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Shared fetch wrapper: attaches auth token and notifies on session expiry.
 * Server already persists API error responses; client only logs transport failures here.
 */
export async function apiRequest(path, options = {}) {
  const {
    headers: extraHeaders,
    skipUnauthorizedHandler = false,
    skipErrorLog = false,
    ...rest
  } = options;

  let response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: buildHeaders(extraHeaders),
    });
  } catch (networkError) {
    if (!skipErrorLog && path !== "/api/logs") {
      reportClientError({
        message: networkError?.message || "Network request failed.",
        stack: networkError?.stack || null,
        function_name: "apiRequest",
        url: path,
        method: rest.method || "GET",
        data: { type: "network_error" },
      });
    }
    throw networkError;
  }

  let payload = {};
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => ({}));
  }

  if (response.status === 401 && !skipUnauthorizedHandler && path !== "/api/auth/login") {
    triggerUnauthorized(payload);
  }

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }

  return payload;
}

/** Auth header helper for non-JSON responses (blobs, CSV text). */
export function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
