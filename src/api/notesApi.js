import { apiRequest } from "./http";

export function getNotesSummary() {
  return apiRequest("/api/notes/summary");
}

export function getNotesTree() {
  return apiRequest("/api/notes/tree");
}

export function getNotes(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return apiRequest(`/api/notes/list${query ? `?${query}` : ""}`);
}

export function getNote(noteId) {
  return apiRequest(`/api/notes/${noteId}`);
}

export function createNote(data) {
  return apiRequest("/api/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNote(noteId, data) {
  return apiRequest(`/api/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteNote(noteId) {
  return apiRequest(`/api/notes/${noteId}`, {
    method: "DELETE",
  });
}

export function createNotebook(data) {
  return apiRequest("/api/notes/notebooks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNotebook(notebookId, data) {
  return apiRequest(`/api/notes/notebooks/${notebookId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteNotebook(notebookId) {
  return apiRequest(`/api/notes/notebooks/${notebookId}`, {
    method: "DELETE",
  });
}

export function createSubject(data) {
  return apiRequest("/api/notes/subjects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSubject(subjectId, data) {
  return apiRequest(`/api/notes/subjects/${subjectId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteSubject(subjectId) {
  return apiRequest(`/api/notes/subjects/${subjectId}`, {
    method: "DELETE",
  });
}

/** Download a remote image server-side and return a data URL for offline notes. */
export function localizeNoteImage(url) {
  return apiRequest("/api/notes/localize-image", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}
