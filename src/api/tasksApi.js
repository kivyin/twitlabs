import { apiRequest } from "./http";

export function getTaskSummary() {
  return apiRequest("/api/tasks/summary");
}

export function getTaskProjects() {
  return apiRequest("/api/tasks/projects");
}

export function createTaskProject(data) {
  return apiRequest("/api/tasks/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTaskProject(projectId, data) {
  return apiRequest(`/api/tasks/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getTaskTags() {
  return apiRequest("/api/tasks/tags");
}

export function createTaskTag(data) {
  return apiRequest("/api/tasks/tags", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getTasks(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return apiRequest(`/api/tasks/list${query ? `?${query}` : ""}`);
}

export function getTaskBoard(projectId = null, includeDone = false) {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", String(projectId));
  if (includeDone) params.set("include_done", "1");
  const query = params.toString();
  return apiRequest(`/api/tasks/board${query ? `?${query}` : ""}`);
}

export function getTask(taskId) {
  return apiRequest(`/api/tasks/${taskId}`);
}

export function createTask(data) {
  return apiRequest("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(taskId, data) {
  return apiRequest(`/api/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId) {
  return apiRequest(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function updateTaskStatus(taskId, status) {
  return apiRequest(`/api/tasks/${taskId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function getActivePomodoroSession() {
  return apiRequest("/api/tasks/pomodoro/active");
}

export function getPomodoroStats(days = 7) {
  const params = new URLSearchParams({ days: String(days) });
  return apiRequest(`/api/tasks/pomodoro/stats?${params.toString()}`);
}

export function startPomodoroSession(data) {
  return apiRequest("/api/tasks/pomodoro/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function completePomodoroSession(sessionId, data = {}) {
  return apiRequest(`/api/tasks/pomodoro/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelPomodoroSession(sessionId) {
  return apiRequest(`/api/tasks/pomodoro/${sessionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
