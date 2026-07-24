import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUserPreference, setUserPreference } from "../api/preferencesApi";
import { useAuth } from "../context/AuthContext";
import {
  normalizeVisibleNavIds,
  SIDEBAR_NAV_LAYOUT_KEY,
} from "../utils/navLayout";

function readLocalPreferences(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalPreferences(storageKey, preferences) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // ignore quota / private mode
  }
}

function resolveVisibleFromSources(local, remoteValue, catalogIds) {
  if (remoteValue && Array.isArray(remoteValue.visibleNavIds)) {
    return normalizeVisibleNavIds(remoteValue.visibleNavIds, catalogIds);
  }
  if (local && Array.isArray(local.visibleNavIds)) {
    return normalizeVisibleNavIds(local.visibleNavIds, catalogIds);
  }
  return normalizeVisibleNavIds(null, catalogIds);
}

/**
 * Per-user left-nav visibility + order (slush-bucket), persisted like column prefs.
 * Pass `{ enabled: false }` when another owner (e.g. Site command bar) manages layout.
 */
export function useNavLayoutPreferences(catalogIds, { enabled = true } = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = userId ? `${SIDEBAR_NAV_LAYOUT_KEY}:${userId}` : SIDEBAR_NAV_LAYOUT_KEY;
  const saveTimerRef = useRef(null);
  const hydratedKeyRef = useRef("");
  const catalogKey = useMemo(() => catalogIds.map(String).join(","), [catalogIds]);

  const [visibleNavIds, setVisibleNavIdsState] = useState(() => {
    if (!enabled) return [];
    const saved = readLocalPreferences(storageKey);
    return resolveVisibleFromSources(saved, null, catalogIds);
  });
  const [prefsReady, setPrefsReady] = useState(!enabled || !storageKey);

  const persistPreferences = useCallback(
    (nextVisible) => {
      if (!enabled || !storageKey) return;
      const payload = { visibleNavIds: nextVisible };
      writeLocalPreferences(storageKey, payload);
      if (!userId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        setUserPreference(SIDEBAR_NAV_LAYOUT_KEY, payload).catch(() => {
          // local cache already written
        });
      }, 300);
    },
    [enabled, storageKey, userId]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPrefsReady(true);
      return undefined;
    }

    let active = true;
    const hydrateKey = `${userId ?? "anon"}:${storageKey}:${catalogKey}`;

    async function hydrate() {
      setPrefsReady(false);
      const local = readLocalPreferences(storageKey);

      if (!userId) {
        if (active) {
          setVisibleNavIdsState(resolveVisibleFromSources(local, null, catalogIds));
          hydratedKeyRef.current = hydrateKey;
          setPrefsReady(true);
        }
        return;
      }

      try {
        const preference = await getUserPreference(SIDEBAR_NAV_LAYOUT_KEY);
        if (!active) return;

        const remote = preference?.value ?? null;
        const next = resolveVisibleFromSources(local, remote, catalogIds);
        setVisibleNavIdsState(next);

        if (remote && Array.isArray(remote.visibleNavIds)) {
          writeLocalPreferences(storageKey, { visibleNavIds: next });
        } else if (local && Array.isArray(local.visibleNavIds)) {
          setUserPreference(SIDEBAR_NAV_LAYOUT_KEY, {
            visibleNavIds: local.visibleNavIds,
          }).catch(() => {});
        }
      } catch {
        if (active) {
          setVisibleNavIdsState(resolveVisibleFromSources(local, null, catalogIds));
        }
      } finally {
        if (active) {
          hydratedKeyRef.current = hydrateKey;
          setPrefsReady(true);
        }
      }
    }

    if (hydratedKeyRef.current !== hydrateKey) {
      hydrate();
    } else {
      setVisibleNavIdsState((current) => normalizeVisibleNavIds(current, catalogIds));
      setPrefsReady(true);
    }

    return () => {
      active = false;
    };
  }, [enabled, storageKey, userId, catalogKey, catalogIds]);

  const setVisibleNavIds = useCallback(
    (nextVisible) => {
      if (!enabled) return;
      const normalized = normalizeVisibleNavIds(nextVisible, catalogIds);
      setVisibleNavIdsState(normalized);
      persistPreferences(normalized);
    },
    [enabled, catalogIds, persistPreferences]
  );

  const resetNavLayout = useCallback(() => {
    if (!enabled) return;
    const defaults = catalogIds.map(String);
    setVisibleNavIdsState(defaults);
    persistPreferences(defaults);
  }, [enabled, catalogIds, persistPreferences]);

  const hasCustomLayout = useMemo(() => {
    if (!enabled) return false;
    const defaults = catalogIds.map(String);
    if (visibleNavIds.length !== defaults.length) return true;
    return visibleNavIds.some((id, index) => id !== defaults[index]);
  }, [enabled, visibleNavIds, catalogIds]);

  return {
    visibleNavIds,
    setVisibleNavIds,
    resetNavLayout,
    prefsReady,
    hasCustomLayout,
  };
}
