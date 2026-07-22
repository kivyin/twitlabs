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
const SESSION_IDLE_MS = 5 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const idleTimerRef = useRef(null);
  const lastBumpRef = useRef(0);

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
      .then((u) => {
        if (!u) clearToken();
        setUser(u ?? null);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const bumpIdle = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    // Throttle timer resets; still enforces a max 5-minute idle window.
    if (now - lastBumpRef.current < 1000) return;
    lastBumpRef.current = now;
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      logout("Signed out after 5 minutes of inactivity.");
    }, SESSION_IDLE_MS);
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
  }, [bumpIdle, user]);

  const login = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
    setAuthMessage("");
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setUser((current) =>
      current ? { ...current, must_change_password: false } : current
    );
  }, []);

  const clearAuthMessage = useCallback(() => setAuthMessage(""), []);

  // true if user holds the system-level admin role
  const isAdmin = useMemo(() => isSystemAdminRole(user?.roles ?? []), [user]);

  // true if user is admin OR has the app's basic user role
  const canAccessApp = useCallback(
    (appName) => userHasAppAccess(user?.roles ?? [], appName, isAdmin),
    [isAdmin, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        canAccessApp,
        authMessage,
        clearAuthMessage,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
