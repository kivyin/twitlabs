import { useCallback, useEffect, useRef, useState } from "react";
import { getUserPreference, setUserPreference } from "../api/preferencesApi";
import { useAuth } from "../context/AuthContext";

export const ACCOUNT_EDIT_TABS = ["charts", "details", "transactions"];
export const ACCOUNT_EDIT_TAB_KEY = "account-edit-active-tab";
const DEFAULT_TAB = "charts";

function normalizeTab(value) {
  return ACCOUNT_EDIT_TABS.includes(value) ? value : DEFAULT_TAB;
}

function readLocalTab(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeTab(parsed?.activeTab);
  } catch {
    return null;
  }
}

function writeLocalTab(storageKey, activeTab) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ activeTab }));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Persists the account edit page tab across navigation and login sessions.
 */
export function useAccountEditTab() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = userId ? `${ACCOUNT_EDIT_TAB_KEY}:${userId}` : ACCOUNT_EDIT_TAB_KEY;
  const saveTimerRef = useRef(null);
  const hydratedKeyRef = useRef("");

  const [activeTab, setActiveTabState] = useState(() => readLocalTab(storageKey) ?? DEFAULT_TAB);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateKey = `${userId ?? "anon"}:${storageKey}`;

    async function hydrate() {
      const local = readLocalTab(storageKey);

      if (!userId) {
        if (active) {
          setActiveTabState(local ?? DEFAULT_TAB);
          hydratedKeyRef.current = hydrateKey;
        }
        return;
      }

      try {
        const preference = await getUserPreference(ACCOUNT_EDIT_TAB_KEY);
        if (!active) return;
        const remote = normalizeTab(preference?.value?.activeTab);
        const next = preference?.value?.activeTab ? remote : local ?? DEFAULT_TAB;
        setActiveTabState(next);
        writeLocalTab(storageKey, next);

        if (!preference?.value?.activeTab && local) {
          setUserPreference(ACCOUNT_EDIT_TAB_KEY, { activeTab: local }).catch(() => {});
        }
      } catch {
        if (active) {
          setActiveTabState(local ?? DEFAULT_TAB);
        }
      } finally {
        if (active) {
          hydratedKeyRef.current = hydrateKey;
        }
      }
    }

    if (hydratedKeyRef.current !== hydrateKey) {
      hydrate();
    }

    return () => {
      active = false;
    };
  }, [storageKey, userId]);

  const setActiveTab = useCallback(
    (nextTab) => {
      const normalized = normalizeTab(nextTab);
      setActiveTabState(normalized);
      writeLocalTab(storageKey, normalized);

      if (!userId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        setUserPreference(ACCOUNT_EDIT_TAB_KEY, { activeTab: normalized }).catch(() => {});
      }, 200);
    },
    [storageKey, userId]
  );

  return { activeTab, setActiveTab };
}
