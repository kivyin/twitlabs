import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getMe, getToken, logout as apiLogout, setToken } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const login = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  // true if user holds the system-level admin role
  const isAdmin = useMemo(
    () => user?.roles?.some((r) => r.application === "system" && r.role === "admin") ?? false,
    [user]
  );

  // true if user is admin OR has an explicit role for this application
  const canAccessApp = useCallback(
    (appName) =>
      isAdmin || (user?.roles?.some((r) => r.application === appName) ?? false),
    [isAdmin, user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, canAccessApp }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
