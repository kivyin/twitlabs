/** Local preferences for LCARS motion effects (defaults: on). */

export const LCARS_NAV_PULSE_KEY = "lcars-nav-pulse";
export const LCARS_PROGRESS_LIGHT_KEY = "lcars-progress-light";
export const LCARS_EFFECTS_CHANGE_EVENT = "lcars-effects-change";

function readStoredBool(key, fallback = true) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw !== "0" && raw !== "false";
  } catch {
    return fallback;
  }
}

function writeStoredBool(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  try {
    window.dispatchEvent(new CustomEvent(LCARS_EFFECTS_CHANGE_EVENT, { detail: { key, value } }));
  } catch {
    // ignore
  }
}

export function getLcarsNavPulseEnabled() {
  return readStoredBool(LCARS_NAV_PULSE_KEY, true);
}

export function setLcarsNavPulseEnabled(enabled) {
  writeStoredBool(LCARS_NAV_PULSE_KEY, Boolean(enabled));
}

export function getLcarsProgressLightEnabled() {
  return readStoredBool(LCARS_PROGRESS_LIGHT_KEY, true);
}

export function setLcarsProgressLightEnabled(enabled) {
  writeStoredBool(LCARS_PROGRESS_LIGHT_KEY, Boolean(enabled));
}

export function subscribeLcarsEffects(callback) {
  const onStorage = (event) => {
    if (
      event.key == null ||
      event.key === LCARS_NAV_PULSE_KEY ||
      event.key === LCARS_PROGRESS_LIGHT_KEY
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LCARS_EFFECTS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LCARS_EFFECTS_CHANGE_EVENT, callback);
  };
}
