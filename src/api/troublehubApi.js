import { apiRequest } from "./http";

function authHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getTroublehubStatus() {
  return apiRequest("/api/troublehub/status");
}

export function elevateTroublehubAdmin(password) {
  return apiRequest("/api/troublehub/elevate", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function deelevateTroublehubAdmin() {
  return apiRequest("/api/troublehub/deelevate", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listTroublehubAccessUsers() {
  return apiRequest("/api/troublehub/access/users");
}

export function setTroublehubUserAccess(userId, granted) {
  return apiRequest(`/api/troublehub/access/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ granted }),
  });
}

export function listTroublehubNotifications() {
  return apiRequest("/api/troublehub/notifications");
}

export function markTroublehubNotificationRead(id) {
  return apiRequest(`/api/troublehub/notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function markAllTroublehubNotificationsRead() {
  return apiRequest("/api/troublehub/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getMatchPlayState() {
  return apiRequest("/api/troublehub/match/play");
}

export function saveMatchAnswer(cardId, payload) {
  return apiRequest(`/api/troublehub/match/answers/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listMatchCards({ all = false } = {}) {
  return apiRequest(`/api/troublehub/match/cards${all ? "?all=1" : ""}`);
}

export function createMatchCard(payload) {
  return apiRequest("/api/troublehub/match/cards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMatchCard(id, payload) {
  return apiRequest(`/api/troublehub/match/cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteMatchCard(id) {
  return apiRequest(`/api/troublehub/match/cards/${id}`, {
    method: "DELETE",
  });
}

export function importMatchCards(cards, { replace = false } = {}) {
  return apiRequest("/api/troublehub/match/cards/import", {
    method: "POST",
    body: JSON.stringify({ cards, replace }),
  });
}

export function resetMatchAnswers() {
  return apiRequest("/api/troublehub/match/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listMatchPlayers() {
  return apiRequest("/api/troublehub/match/players");
}

export function getMatchCardAnswers(cardId) {
  return apiRequest(`/api/troublehub/match/cards/${cardId}/answers`);
}

export function compareMatchAnswers(userId) {
  return apiRequest(`/api/troublehub/match/compare?user_id=${userId}`);
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadMatchCardImage(cardId, { fileBase64, mimeType }) {
  return apiRequest(`/api/troublehub/match/cards/${cardId}/image`, {
    method: "POST",
    body: JSON.stringify({ file_base64: fileBase64, mime_type: mimeType }),
  });
}

export function deleteMatchCardImage(cardId) {
  return apiRequest(`/api/troublehub/match/cards/${cardId}/image`, {
    method: "DELETE",
  });
}

export async function fetchMatchCardImageUrl(cardId) {
  const response = await fetch(`/api/troublehub/match/cards/${cardId}/image`, {
    headers: authHeaders(),
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export const HEAT_LEVELS = [
  { value: 1, label: "Ice Cold", icon: "🧊" },
  { value: 2, label: "Chilly", icon: "❄️" },
  { value: 3, label: "Warming Up", icon: "🌤️" },
  { value: 4, label: "Hot", icon: "🔥" },
  { value: 5, label: "Burning Hot", icon: "🌋" },
];

export const YNM_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
];

export const FANTASY_AUDIENCES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const FANTASY_CATEGORIES = [
  { value: "romantic", label: "Romantic" },
  { value: "naughty", label: "Naughty" },
  { value: "kinky", label: "Kinky" },
];

const SESSION_STORAGE_KEY = "troublehub-fantasy-session";

export function readFantasySessionRef() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.session_id || !parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFantasySessionRef(session) {
  if (!session?.id || !session?.code) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ session_id: session.id, code: session.code })
  );
}

export function clearFantasySessionRef() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getFantasiesLobby() {
  return apiRequest("/api/troublehub/fantasies/lobby");
}

export function getFantasiesState(ref = {}) {
  const sessionId = ref.sessionId ?? ref.session_id;
  const code = ref.code;
  const params = new URLSearchParams();
  if (sessionId) params.set("session_id", String(sessionId));
  if (code) params.set("code", String(code));
  const qs = params.toString();
  return apiRequest(`/api/troublehub/fantasies/state${qs ? `?${qs}` : ""}`);
}

export function createFantasySession({ role, displayName, avatar }) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return apiRequest("/api/troublehub/fantasies/sessions", {
    method: "POST",
    body: JSON.stringify({
      role: normalized,
      audience: normalized,
      display_name: displayName,
      avatar,
    }),
  });
}

export function joinFantasySession({ code, role, displayName, avatar }) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return apiRequest("/api/troublehub/fantasies/sessions/join", {
    method: "POST",
    body: JSON.stringify({
      code,
      role: normalized,
      audience: normalized,
      display_name: displayName,
      avatar,
    }),
  });
}

export function startFantasySession() {
  return apiRequest("/api/troublehub/fantasies/sessions/start", {
    method: "POST",
    body: JSON.stringify(withSession({})),
  });
}

function withSession(payload = {}) {
  const ref = readFantasySessionRef();
  return {
    session_id: payload.session_id || ref?.session_id,
    code: payload.code || ref?.code,
    ...payload,
  };
}

export function toggleFantasyPick(cardId) {
  return apiRequest("/api/troublehub/fantasies/picks/toggle", {
    method: "POST",
    body: JSON.stringify(withSession({ card_id: cardId })),
  });
}

export function lockFantasyPicks() {
  return apiRequest("/api/troublehub/fantasies/picks/lock", {
    method: "POST",
    body: JSON.stringify(withSession({})),
  });
}

export function unlockFantasyPicks() {
  return apiRequest("/api/troublehub/fantasies/picks/unlock", {
    method: "POST",
    body: JSON.stringify(withSession({})),
  });
}

export function drawFantasyRound() {
  return apiRequest("/api/troublehub/fantasies/round/draw", {
    method: "POST",
    body: JSON.stringify(withSession({})),
  });
}

export function chooseFantasyCard({ audience, cardId, notes }) {
  return apiRequest("/api/troublehub/fantasies/round/choose", {
    method: "POST",
    body: JSON.stringify(
      withSession({
        audience,
        card_id: cardId,
        notes,
      })
    ),
  });
}

export function saveFantasyRoundNotes(notes) {
  return apiRequest("/api/troublehub/fantasies/round/notes", {
    method: "POST",
    body: JSON.stringify(withSession({ notes })),
  });
}

export function createFantasyCard(payload) {
  return apiRequest("/api/troublehub/fantasies/cards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFantasyCard(id, payload) {
  return apiRequest(`/api/troublehub/fantasies/cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteFantasyCard(id) {
  return apiRequest(`/api/troublehub/fantasies/cards/${id}`, {
    method: "DELETE",
  });
}

export function importFantasyCards(cards, { replace = false } = {}) {
  return apiRequest("/api/troublehub/fantasies/cards/import", {
    method: "POST",
    body: JSON.stringify({ cards, replace }),
    skipForbiddenHandler: true,
  });
}

export function importFantasyCardsCsv(csv, { replace = false } = {}) {
  return apiRequest("/api/troublehub/fantasies/cards/import", {
    method: "POST",
    body: JSON.stringify({ csv, replace }),
    skipForbiddenHandler: true,
  });
}

export function clearFantasyCards({ alsoSessions = false } = {}) {
  return apiRequest("/api/troublehub/fantasies/cards/clear", {
    method: "POST",
    body: JSON.stringify({ also_sessions: alsoSessions }),
    skipForbiddenHandler: true,
  });
}

export function listFantasyCards() {
  return apiRequest("/api/troublehub/fantasies/cards");
}

export function seedFantasyBaseline({ replace = false } = {}) {
  return apiRequest("/api/troublehub/fantasies/cards/seed-baseline", {
    method: "POST",
    body: JSON.stringify({ replace }),
  });
}

export function resetFantasiesGame() {
  return apiRequest("/api/troublehub/fantasies/reset", {
    method: "POST",
    body: JSON.stringify(withSession({})),
  });
}
