import { apiRequest } from "./http";

export async function getDashboardReports(application = "budget") {
  const payload = await apiRequest(
    `/api/dashboard/reports?application=${encodeURIComponent(application)}`
  );
  return payload.reports ?? [];
}

export function createDashboardReport(report) {
  return apiRequest("/api/dashboard/reports", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

export function updateDashboardReport(id, report) {
  return apiRequest(`/api/dashboard/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(report),
  });
}

export function deleteDashboardReport(id) {
  return apiRequest(`/api/dashboard/reports/${id}`, {
    method: "DELETE",
  });
}

// ── Multi-dashboard API ─────────────────────────────────────────────

export async function getDashboards(application = "budget") {
  const payload = await apiRequest(
    `/api/dashboards?application=${encodeURIComponent(application)}`
  );
  return payload.dashboards ?? [];
}

export async function createDashboard({ application, name, items = [] }) {
  const payload = await apiRequest("/api/dashboards", {
    method: "POST",
    body: JSON.stringify({ application, name, items }),
  });
  return payload.dashboard;
}

export function updateDashboard(id, updates) {
  return apiRequest(`/api/dashboards/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export function deleteDashboard(id) {
  return apiRequest(`/api/dashboards/${id}`, {
    method: "DELETE",
  });
}

export function saveDashboardLayout(id, items) {
  return apiRequest(`/api/dashboards/${id}/layout`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}
