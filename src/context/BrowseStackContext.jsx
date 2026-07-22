import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  BROWSE_STACK_NAV_KEY,
  clearBrowseStackStorage,
  isSafeBrowsePath,
  loadBrowseStack,
  locationToPath,
  saveBrowseStack,
  shouldTrackBrowsePath,
} from "../utils/browseStack";

const BrowseStackContext = createContext(null);

/**
 * Tracks visited app pages in a stack (sessionStorage). Form save/cancel and the
 * global Back button pop to the previous entry instead of a hardcoded list URL.
 */
export function BrowseStackProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [stack, setStack] = useState(() => loadBrowseStack());
  const stackRef = useRef(stack);
  const hadUserRef = useRef(false);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

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
  }, [user, authLoading]);

  useEffect(() => {
    const path = locationToPath(location);
    if (!shouldTrackBrowsePath(path)) return;

    // Our own pop/restore navigations already updated the stack.
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
    }

    return {
      stack,
      previousPath,
      canGoBack,
      goBack,
      clearStack,
    };
  }, [stack, navigate]);

  return <BrowseStackContext.Provider value={value}>{children}</BrowseStackContext.Provider>;
}

export function useBrowseStack() {
  const ctx = useContext(BrowseStackContext);
  if (!ctx) {
    throw new Error("useBrowseStack must be used within BrowseStackProvider");
  }
  return ctx;
}
