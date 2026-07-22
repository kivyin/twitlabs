export const BRANDING_STORAGE_KEY = "twitlabs-branding";

export const DEFAULT_BRANDING = {
  appName: "TwitApps",
  shipName: "",
};

export function normalizeBranding(branding) {
  return {
    appName: String(branding?.appName ?? DEFAULT_BRANDING.appName).trim() || DEFAULT_BRANDING.appName,
    shipName: String(branding?.shipName ?? "").trim(),
  };
}

export function getStoredBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_BRANDING;
    }
    return normalizeBranding(JSON.parse(raw));
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(branding) {
  const next = normalizeBranding(branding);
  localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function applyBranding(branding = getStoredBranding()) {
  if (typeof document === "undefined") {
    return branding;
  }

  const appName = branding.appName?.trim() || DEFAULT_BRANDING.appName;
  const shipName = branding.shipName?.trim();
  document.title = shipName ? `${shipName} · ${appName}` : appName;

  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.content = shipName
      ? `${shipName} — ${appName} workspace.`
      : `${appName} — one workspace for all your applications.`;
  }

  return branding;
}

export function getDisplayTitle(branding = getStoredBranding()) {
  const appName = branding.appName?.trim() || DEFAULT_BRANDING.appName;
  const shipName = branding.shipName?.trim();
  return { appName, shipName, fullTitle: shipName ? `${shipName} · ${appName}` : appName };
}
