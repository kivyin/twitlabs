/** Per-app basic roles. System admin is separate (`system` / `admin`). */
export const APP_USER_ROLES = {
  budget: "budget_user",
  tasks: "task_user",
  notes: "note_user",
  decisions: "decision_user",
  "site-tracker": "site_tracker_user",
  training: "training_user",
  calendar: "calendar_user",
};

/** Apps that offer more than one assignable role (still one role per app per user). */
export const APP_ROLE_OPTIONS = {
  calendar: [
    { role: "calendar_user", label: "Calendar user" },
    { role: "calendar_view", label: "Calendar view" },
  ],
};

export const APP_ROLE_LABELS = {
  budget_user: "Budget user",
  task_user: "Tasks user",
  note_user: "Notes user",
  decision_user: "Decision Picker user",
  site_tracker_user: "Site Tracker user",
  training_user: "Training user",
  calendar_user: "Calendar user",
  calendar_view: "Calendar view",
};

export function getAppUserRole(appName) {
  return APP_USER_ROLES[appName] ?? null;
}

export function getAllowedAppRoles(appName) {
  if (APP_ROLE_OPTIONS[appName]?.length) {
    return APP_ROLE_OPTIONS[appName].map((entry) => entry.role);
  }
  const single = APP_USER_ROLES[appName];
  return single ? [single] : [];
}

export function getAppRoleOptions(appName) {
  if (APP_ROLE_OPTIONS[appName]?.length) {
    return APP_ROLE_OPTIONS[appName];
  }
  const single = APP_USER_ROLES[appName];
  if (!single) return [];
  return [{ role: single, label: APP_ROLE_LABELS[single] || single }];
}

export function getAppRoleLabel(roleName) {
  return APP_ROLE_LABELS[roleName] ?? roleName;
}

export function isSystemAdminRole(roles = []) {
  return roles.some((role) => role.application === "system" && role.role === "admin");
}

/** True if the user may open an app (system admin or any allowed role for that app). */
export function userHasAppAccess(roles = [], appName, isAdmin = false) {
  if (isAdmin || isSystemAdminRole(roles)) {
    return true;
  }
  const allowed = getAllowedAppRoles(appName);
  if (allowed.length === 0) {
    return false;
  }
  return roles.some(
    (role) =>
      role.application === appName &&
      (allowed.includes(role.role) || role.role === "member")
  );
}

export function userHasCalendarEditAccess(roles = [], isAdmin = false) {
  if (isAdmin || isSystemAdminRole(roles)) {
    return true;
  }
  return roles.some(
    (role) => role.application === "calendar" && role.role === "calendar_user"
  );
}

/** View-only calendar kiosk: has calendar_view and no edit/admin rights. */
export function userHasCalendarViewOnly(roles = [], isAdmin = false) {
  if (isAdmin || isSystemAdminRole(roles) || userHasCalendarEditAccess(roles, false)) {
    return false;
  }
  return roles.some(
    (role) => role.application === "calendar" && role.role === "calendar_view"
  );
}

/**
 * Form shape: { isSystemAdmin, apps: { [appName]: roleString | false } }
 * Boolean `true` from older UI is treated as the default app user role.
 */
export function rolesToForm(roles = []) {
  const isSystemAdmin = isSystemAdminRole(roles);
  const apps = {};
  for (const role of roles) {
    if (role.application === "system") continue;
    const allowed = getAllowedAppRoles(role.application);
    if (allowed.includes(role.role)) {
      apps[role.application] = role.role;
    } else if (role.role === "member" && APP_USER_ROLES[role.application]) {
      apps[role.application] = APP_USER_ROLES[role.application];
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
  for (const [app, value] of Object.entries(roleForm.apps ?? {})) {
    if (!value) continue;
    const role =
      typeof value === "string"
        ? value
        : value === true
          ? getAppUserRole(app)
          : null;
    if (role && getAllowedAppRoles(app).includes(role)) {
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
