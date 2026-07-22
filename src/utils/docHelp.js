import { getDocTopicOrReport } from "../content/documentation";

export function buildDocsPath(app, topic) {
  if (!app) {
    return "/docs";
  }
  if (!topic || topic === "overview") {
    return `/docs/${app}`;
  }
  return `/docs/${app}/${topic}`;
}

export function usePageHelpFromPath(pathname, params = {}) {
  const { appName, table, reportKey } = params;

  if (pathname.startsWith("/docs")) {
    return null;
  }

  if (pathname === "/login") {
    return { app: "workspace", topic: "signing-in" };
  }

  if (pathname === "/") {
    return { app: "workspace", topic: "overview" };
  }

  if (pathname.startsWith("/admin")) {
    const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0] || "overview";
    const adminTopics = new Set([
      "overview",
      "applications",
      "tables",
      "fields",
      "users",
      "navigation",
      "deletes",
      "logs",
      "ide",
      "zero-boot",
    ]);
    return { app: "admin", topic: adminTopics.has(segment) ? segment : "overview" };
  }

  const app = appName || (pathname.startsWith("/budget") ? "budget" : null);

  if (pathname.includes("/reports/") && reportKey) {
    return { app: app || "budget", topic: `report-${reportKey}` };
  }
  if (pathname.includes("/reports")) {
    return { app: app || "budget", topic: "reports" };
  }
  if (pathname.includes("/accounts/") && pathname.includes("/register")) {
    return { app: app || "budget", topic: "account-register" };
  }
  if (pathname.includes("/browse")) {
    return { app: "notes", topic: "workspace" };
  }
  if (pathname.includes("/recent")) {
    return { app: "notes", topic: "recent" };
  }
  if (pathname.includes("/board")) {
    return { app: "tasks", topic: "board" };
  }
  if (pathname.includes("/focus")) {
    return { app: "tasks", topic: "focus" };
  }
  if (pathname.includes("/projects")) {
    return { app: "tasks", topic: "projects" };
  }
  if (pathname.includes("/task/")) {
    return { app: "tasks", topic: "task-detail" };
  }
  if (pathname.includes("/list")) {
    return { app: "tasks", topic: "list" };
  }

  if (table) {
    return { app: app || "budget", topic: table };
  }

  if (app === "budget") {
    return { app: "budget", topic: "overview" };
  }
  if (app === "tasks") {
    return { app: "tasks", topic: "overview" };
  }
  if (app === "notes") {
    return { app: "notes", topic: "overview" };
  }

  return null;
}

export function getHelpDoc(help) {
  if (!help?.app) {
    return null;
  }
  return getDocTopicOrReport(help.app, help.topic);
}
