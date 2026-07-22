import { apiRequest } from "./http";

const TOKEN_KEY = "auth_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function login(username, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    skipUnauthorizedHandler: true,
  });
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = await apiRequest("/api/auth/me", { skipUnauthorizedHandler: true });
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export async function changePassword(currentPassword, newPassword) {
  return apiRequest("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function logout() {
  const token = getToken();
  if (token) {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      skipUnauthorizedHandler: true,
    }).catch(() => {});
  }
  clearToken();
}
