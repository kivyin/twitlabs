import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const STORAGE_PREFIX = "twitlabs-sidebar-preferences";

const SIDEBAR_TABS = new Set(["nav", "favorites", "history"]);

const DEFAULT_PREFERENCES = {
  collapsed: false,
  activeTab: "nav",
  // Empty = all nav menus collapsed on load.
  expandedNavGroups: [],
};

function normalizeActiveTab(value) {
  return SIDEBAR_TABS.has(value) ? value : "nav";
}

function getStorageKey(userId) {
  if (userId == null || userId === "") {
    return null;
  }
  return `${STORAGE_PREFIX}:${String(userId)}`;
}

function readPreferences(storageKey) {
  if (!storageKey) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(raw);

    return {
      collapsed: Boolean(parsed.collapsed),
      activeTab: normalizeActiveTab(parsed.activeTab),
      // Nav menus always start collapsed on load.
      expandedNavGroups: [],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(storageKey, preferences) {
  if (!storageKey) {
    return;
  }

  // Persist rail collapse + active tab — menu expand state resets each page load.
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      collapsed: preferences.collapsed,
      activeTab: normalizeActiveTab(preferences.activeTab),
    })
  );
}

export function useSidebarPreferences() {
  const { user } = useAuth();
  const storageKey = getStorageKey(user?.id);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const skipWriteRef = useRef(true);
  const hydratedKeyRef = useRef(null);

  useEffect(() => {
    if (!storageKey) {
      skipWriteRef.current = true;
      hydratedKeyRef.current = null;
      return;
    }

    skipWriteRef.current = true;
    hydratedKeyRef.current = storageKey;
    setPreferences(readPreferences(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || hydratedKeyRef.current !== storageKey) {
      return;
    }

    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }

    writePreferences(storageKey, preferences);
  }, [preferences, storageKey]);

  const isCollapsed = Boolean(preferences.collapsed);
  const isExpanded = !isCollapsed;
  const expandedNavGroupSet = useMemo(
    () => new Set(preferences.expandedNavGroups),
    [preferences.expandedNavGroups]
  );

  const toggleCollapsed = useCallback(() => {
    setPreferences((current) => ({
      ...current,
      collapsed: !current.collapsed,
    }));
  }, []);

  const isNavGroupCollapsed = useCallback(
    (groupId) => !expandedNavGroupSet.has(String(groupId)),
    [expandedNavGroupSet]
  );

  const toggleNavGroup = useCallback((groupId) => {
    const key = String(groupId);
    setPreferences((current) => {
      const next = new Set((current.expandedNavGroups ?? []).map(String));
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...current, expandedNavGroups: [...next] };
    });
  }, []);

  const expandNavGroup = useCallback((groupId) => {
    const key = String(groupId);
    setPreferences((current) => {
      const expanded = (current.expandedNavGroups ?? []).map(String);
      if (expanded.includes(key)) {
        return current;
      }
      return {
        ...current,
        expandedNavGroups: [...expanded, key],
      };
    });
  }, []);

  const collapseAllNavGroups = useCallback(() => {
    setPreferences((current) => {
      if (!(current.expandedNavGroups ?? []).length) {
        return current;
      }
      return { ...current, expandedNavGroups: [] };
    });
  }, []);

  const setActiveTab = useCallback((tab) => {
    setPreferences((current) => {
      const nextTab = normalizeActiveTab(tab);
      if (current.activeTab === nextTab) {
        return current;
      }
      return { ...current, activeTab: nextTab };
    });
  }, []);

  return {
    isCollapsed,
    isExpanded,
    activeTab: normalizeActiveTab(preferences.activeTab),
    setActiveTab,
    toggleCollapsed,
    isNavGroupCollapsed,
    toggleNavGroup,
    expandNavGroup,
    collapseAllNavGroups,
  };
}
