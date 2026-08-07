import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { getUserPreference, setUserPreference } from "../api/preferencesApi";
import {
  BROWSE_HISTORY_LIMIT_KEY,
  BROWSE_STACK_NAV_KEY,
  clearBrowseStackStorage,
  DEFAULT_HISTORY_LIMIT,
  isSafeBrowsePath,
  loadBrowseStack,
  loadBrowseVisits,
  locationToPath,
  normalizeHistoryLimit,
  readLocalHistoryLimit,
  saveBrowseStack,
  saveBrowseVisits,
  shouldTrackBrowsePath,
  writeLocalHistoryLimit,
} from "../utils/browseStack";
import { useAuth } from "./AuthContext";

const BrowseStackContext = createContext(null);

/**
 * Tracks visited app pages in a stack (sessionStorage). Form save/cancel and the
 * global Back button pop to the previous entry instead of a hardcoded list URL.
 * Visit history is a separate append-only log (includes duplicates and Back).
 */
export function BrowseStackProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const userId = user?.id ?? null;
  const limitStorageKey = userId
    ? `${BROWSE_HISTORY_LIMIT_KEY}:${userId}`
    : BROWSE_HISTORY_LIMIT_KEY;

  const [historyLimit, setHistoryLimitState] = useState(() =>
    readLocalHistoryLimit(limitStorageKey)
  );
  const [stack, setStack] = useState(() => loadBrowseStack());
  const [visits, setVisits] = useState(() => loadBrowseVisits(historyLimit));
  const stackRef = useRef(stack);
  const historyLimitRef = useRef(historyLimit);
  const hadUserRef = useRef(false);
  const hydratedLimitKeyRef = useRef("");

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    historyLimitRef.current = historyLimit;
  }, [historyLimit]);

  useEffect(() => {
    if (user) {
      hadUserRef.current = true;
      return;
    }
    // Don't wipe session stack during auth bootstrap / refresh.
    if (authLoading || !hadUserRef.current) return;
    clearBrowseStackStorage();
    stackRef.current = [];
    setStack([]);
    setVisits([]);
  }, [user, authLoading]);

  // Hydrate history-limit preference (local first, then server).
  useEffect(() => {
    const local = readLocalHistoryLimit(limitStorageKey);
    setHistoryLimitState(local);
    setVisits((prev) => saveBrowseVisits(prev.length ? prev : loadBrowseVisits(local), local));

    if (!userId) {
      hydratedLimitKeyRef.current = limitStorageKey;
      return undefined;
    }

    let cancelled = false;
    hydratedLimitKeyRef.current = "";

    (async () => {
      try {
        const preference = await getUserPreference(BROWSE_HISTORY_LIMIT_KEY);
        if (cancelled) return;
        const remote = normalizeHistoryLimit(preference?.value?.limit);
        const hasRemote = preference?.value?.limit != null;
        const next = hasRemote ? remote : local;
        setHistoryLimitState(next);
        writeLocalHistoryLimit(limitStorageKey, next);
        setVisits((prev) => saveBrowseVisits(prev, next));
        if (!hasRemote && local !== DEFAULT_HISTORY_LIMIT) {
          setUserPreference(BROWSE_HISTORY_LIMIT_KEY, { limit: local }).catch(() => {});
        }
      } catch {
        // keep local
      } finally {
        if (!cancelled) {
          hydratedLimitKeyRef.current = limitStorageKey;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, limitStorageKey]);

  useEffect(() => {
    const path = locationToPath(location);
    if (!shouldTrackBrowsePath(path)) return;

    // Always append every tracked navigation (duplicates, browser back, restore).
    setVisits((prev) => {
      const saved = saveBrowseVisits([...prev, path], historyLimitRef.current);
      return saved;
    });

    // Our own pop/restore navigations already updated the browse stack.
    if (location.state?.[BROWSE_STACK_NAV_KEY] === "restore") return;

    setStack((prev) => {
      let next;
      if (navigationType === "REPLACE") {
        if (prev.length === 0) next = [path];
        else if (prev[prev.length - 1] === path) return prev;
        else next = [...prev.slice(0, -1), path];
      } else if (navigationType === "POP") {
        const idx = prev.lastIndexOf(path);
        if (idx >= 0) next = prev.slice(0, idx + 1);
        else if (prev[prev.length - 1] === path) return prev;
        else next = [...prev, path];
      } else if (prev[prev.length - 1] === path) {
        return prev;
      } else {
        next = [...prev, path];
      }

      const saved = saveBrowseStack(next);
      stackRef.current = saved;
      return saved;
    });
  }, [location, navigationType]);

  const setHistoryLimit = useCallback(
    (value) => {
      const next = normalizeHistoryLimit(value);
      setHistoryLimitState(next);
      historyLimitRef.current = next;
      writeLocalHistoryLimit(limitStorageKey, next);
      setVisits((prev) => saveBrowseVisits(prev, next));
      if (userId) {
        setUserPreference(BROWSE_HISTORY_LIMIT_KEY, { limit: next }).catch(() => {});
      }
    },
    [limitStorageKey, userId]
  );

  const value = useMemo(() => {
    const previousPath = stack.length >= 2 ? stack[stack.length - 2] : null;
    const canGoBack = stack.length >= 2;

    function goBack(fallback = "/") {
      const current = stackRef.current;
      let next;
      let target;

      if (current.length >= 2) {
        next = current.slice(0, -1);
        target = next[next.length - 1];
      } else if (isSafeBrowsePath(fallback)) {
        next = [fallback];
        target = fallback;
      } else {
        next = current.length ? current : ["/"];
        target = next[next.length - 1] || "/";
      }

      const saved = saveBrowseStack(next);
      stackRef.current = saved;
      setStack(saved);
      navigate(target, { state: { [BROWSE_STACK_NAV_KEY]: "restore" } });
      return target;
    }

    function clearStack() {
      clearBrowseStackStorage();
      stackRef.current = [];
      setStack([]);
      setVisits([]);
    }

    return {
      stack,
      visits,
      historyLimit,
      setHistoryLimit,
      previousPath,
      canGoBack,
      goBack,
      clearStack,
    };
  }, [stack, visits, historyLimit, setHistoryLimit, navigate]);

  return <BrowseStackContext.Provider value={value}>{children}</BrowseStackContext.Provider>;
}

export function useBrowseStack() {
  const ctx = useContext(BrowseStackContext);
  if (!ctx) {
    throw new Error("useBrowseStack must be used within BrowseStackProvider");
  }
  return ctx;
}
