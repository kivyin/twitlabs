/** Client helpers for the TroubleHub vault app. */

export const TROUBLEHUB_APP = "troublehub";

export function isAdminExplicitApp(appName) {
  return appName === TROUBLEHUB_APP;
}
