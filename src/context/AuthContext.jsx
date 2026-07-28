import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  clearToken,
  getMe,
  getToken,
  logout as apiLogout,
  setToken,
} from "../api/authApi";
import { setUnauthorizedHandler } from "../api/http";
import { clearBrowseStackStorage } from "../utils/browseStack";
import { isSystemAdminRole, userHasAppAccess } from "../utils/roles";

const AuthContext = createContext(null);
const DEFAULT_SESSION_IDLE_MS = 5 * 60 * 1000;

function normalizeIdleMs(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_SESSION_IDLE_MS;
  }
  return Math.floor(numeric * 1000);
}

function formatIdleDuration(ms) {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.round(totalSeconds / 60);
  if (Math.abs(totalSeconds - minutes * 60) <= 5) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const preciseMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (preciseMinutes === 0) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  return `${preciseMinutes}m ${seconds}s`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const [sessionIdleMs, setSessionIdleMs] = useState(DEFAULT_SESSION_IDLE_MS);
  const idleTimerRef = useRef(null);
  const lastBumpRef = useRef(0);
  const sessionIdleMsRef = useRef(DEFAULT_SESSION_IDLE_MS);

  const applySessionIdleSeconds = useCallback((seconds) => {
    const nextMs = normalizeIdleMs(seconds);
    sessionIdleMsRef.current = nextMs;
    setSessionIdleMs(nextMs);
  }, []);

  const logout = useCallback(async (message = "") => {
    await apiLogout();
    clearBrowseStackStorage();
    setUser(null);
    if (message) {
      setAuthMessage(message);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((payload) => {
      clearToken();
      clearBrowseStackStorage();
      setUser(null);
      setAuthMessage(payload?.error || "Session expired. Please sign in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((payload) => {
        if (!payload?.user) {
          clearToken();
          setUser(null);
          return;
        }
        if (payload.sessionIdleSeconds != null) {
          applySessionIdleSeconds(payload.sessionIdleSeconds);
        }
        setUser(payload.user);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, [applySessionIdleSeconds]);

  const bumpIdle = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    // Throttle timer resets; still enforces the configured idle window.
    if (now - lastBumpRef.current < 1000) return;
    lastBumpRef.current = now;
    clearTimeout(idleTimerRef.current);
    const idleMs = sessionIdleMsRef.current;
    idleTimerRef.current = setTimeout(() => {
      logout(`Signed out after ${formatIdleDuration(idleMs)} of inactivity.`);
    }, idleMs);
  }, [logout, user]);

  useEffect(() => {
    if (!user) {
      clearTimeout(idleTimerRef.current);
      return undefined;
    }

    bumpIdle();
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    for (const event of events) {
      window.addEventListener(event, bumpIdle, { passive: true });
    }
    return () => {
      clearTimeout(idleTimerRef.current);
      for (const event of events) {
        window.removeEventListener(event, bumpIdle);
      }
    };
  }, [bumpIdle, user, sessionIdleMs]);

  const login = useCallback(
    (token, userData, sessionIdleSeconds = null) => {
      setToken(token);
      if (sessionIdleSeconds != null) {
        applySessionIdleSeconds(sessionIdleSeconds);
      }
      setUser(userData);
      setAuthMessage("");
    },
    [applySessionIdleSeconds]
  );

  const clearMustChangePassword = useCallback(() => {
    setUser((current) =>
      current ? { ...current, must_change_password: false } : current
    );
  }, []);

  const clearAuthMessage = useCallback(() => setAuthMessage(""), []);

  const isAdmin = useMemo(
    () => isSystemAdminRole(user?.roles ?? []),
    [user?.roles]
  );

  const canAccessApp = useCallback(
    (appName) => userHasAppAccess(user?.roles ?? [], appName, isAdmin),
    [user?.roles, isAdmin]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      authMessage,
      sessionIdleMs,
      login,
      logout,
      clearMustChangePassword,
      clearAuthMessage,
      isAdmin,
      canAccessApp,
    }),
    [
      user,
      loading,
      authMessage,
      sessionIdleMs,
      login,
      logout,
      clearMustChangePassword,
      clearAuthMessage,
      isAdmin,
      canAccessApp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
