/** Per-app basic roles. System admin is separate (`system` / `admin`). */
export const APP_USER_ROLES = {
  budget: "budget_user",
  tasks: "task_user",
  notes: "note_user",
  decisions: "decision_user",
};

export const APP_ROLE_LABELS = {
  budget_user: "Budget user",
  task_user: "Tasks user",
  note_user: "Notes user",
  decision_user: "Decision Picker user",
};

export function getAppUserRole(appName) {
  return APP_USER_ROLES[appName] ?? null;
}

export function getAppRoleLabel(roleName) {
  return APP_ROLE_LABELS[roleName] ?? roleName;
}

export function isSystemAdminRole(roles = []) {
  return roles.some((role) => role.application === "system" && role.role === "admin");
}

/** True if the user may open an app (system admin or matching app role). */
export function userHasAppAccess(roles = [], appName, isAdmin = false) {
  if (isAdmin || isSystemAdminRole(roles)) {
    return true;
  }
  const expected = getAppUserRole(appName);
  if (!expected) {
    return false;
  }
  return roles.some(
    (role) =>
      role.application === appName &&
      (role.role === expected || role.role === "member")
  );
}

export function rolesToForm(roles = []) {
  const isSystemAdmin = isSystemAdminRole(roles);
  const apps = {};
  for (const role of roles) {
    if (role.application === "system") continue;
    if (getAppUserRole(role.application) || role.role === "member") {
      apps[role.application] = true;
    }
  }
  return { isSystemAdmin, apps };
}

export function formToRoles(roleForm) {
  const roles = [];
  if (roleForm.isSystemAdmin) {
    roles.push({ application: "system", role: "admin" });
    return roles;
  }
  for (const [app, granted] of Object.entries(roleForm.apps ?? {})) {
    if (!granted) continue;
    const role = getAppUserRole(app);
    if (role) {
      roles.push({ application: app, role });
    }
  }
  return roles;
}

export function formatRolesSummary(roles = []) {
  if (isSystemAdminRole(roles)) {
    return "System Admin";
  }
  const labels = roles
    .filter((role) => role.application !== "system")
    .map((role) => getAppRoleLabel(role.role) || role.application);
  return labels.length > 0 ? labels.join(", ") : "none";
}
