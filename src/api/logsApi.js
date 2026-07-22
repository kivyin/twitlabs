/**
 * Fire-and-forget client error report. Never throws into UI flows.
 * Uses raw fetch (not apiRequest) to avoid recursive logging.
 */
export function reportClientError(partial = {}) {
  try {
    const headers = { "Content-Type": "application/json" };
    try {
      const token = localStorage.getItem("auth_token");
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore storage access issues
    }

    const payload = {
      level: partial.level || "error",
      source: partial.source || "client",
      message: String(partial.message || "Client error.").slice(0, 4000),
      stack: partial.stack ? String(partial.stack).slice(0, 20000) : null,
      function_name: partial.function_name || partial.functionName || null,
      url: partial.url || (typeof window !== "undefined" ? window.location?.pathname : null),
      href: partial.href || (typeof window !== "undefined" ? window.location?.href : null),
      method: partial.method || "CLIENT",
      status_code: partial.status_code ?? partial.statusCode ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
      component_stack: partial.component_stack || partial.componentStack || null,
      data: {
        ...(partial.data && typeof partial.data === "object" ? partial.data : { data: partial.data }),
        filename: partial.filename || null,
        lineno: partial.lineno ?? null,
        colno: partial.colno ?? null,
      },
    };

    void fetch("/api/logs", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore logging failures
  }
}

export function installGlobalErrorLogging() {
  if (typeof window === "undefined" || window.__twitlabsErrorLoggingInstalled) {
    return;
  }
  window.__twitlabsErrorLoggingInstalled = true;

  window.addEventListener("error", (event) => {
    reportClientError({
      message: event.message || event.error?.message || "Unhandled window error",
      stack: event.error?.stack || null,
      function_name: "window.onerror",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      data: { type: "window.error" },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    reportClientError({
      message,
      stack: reason instanceof Error ? reason.stack : null,
      function_name: "unhandledrejection",
      data: {
        type: "unhandledrejection",
        reason:
          reason instanceof Error
            ? { name: reason.name, message: reason.message }
            : reason,
      },
    });
  });
}
