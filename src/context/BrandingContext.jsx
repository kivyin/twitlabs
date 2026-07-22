import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getUserPreference, setUserPreference } from "../api/preferencesApi";
import { useAuth } from "./AuthContext";
import {
  applyBranding,
  BRANDING_STORAGE_KEY,
  DEFAULT_BRANDING,
  getDisplayTitle,
  getStoredBranding,
  normalizeBranding,
  saveBranding,
} from "../utils/branding";

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hydratedUserRef = useRef(null);
  const [branding, setBrandingState] = useState(() => getStoredBranding());

  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!userId) {
        hydratedUserRef.current = null;
        return;
      }

      if (hydratedUserRef.current === userId) {
        return;
      }

      const local = getStoredBranding();

      try {
        const preference = await getUserPreference(BRANDING_STORAGE_KEY);
        if (!active) return;

        const remote = preference?.value;
        if (remote && typeof remote === "object") {
          const next = saveBranding(normalizeBranding(remote));
          setBrandingState(next);
          applyBranding(next);
        } else {
          // First login on this account: migrate browser-local branding to the server.
          setUserPreference(BRANDING_STORAGE_KEY, local).catch(() => {});
          setBrandingState(local);
          applyBranding(local);
        }
      } catch {
        if (!active) return;
        setBrandingState(local);
        applyBranding(local);
      } finally {
        if (active) {
          hydratedUserRef.current = userId;
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [userId]);

  const setBranding = useCallback(
    (nextBranding) => {
      const saved = saveBranding(nextBranding);
      setBrandingState(saved);
      applyBranding(saved);

      if (userId) {
        setUserPreference(BRANDING_STORAGE_KEY, saved).catch(() => {
          // local cache already written
        });
      }

      return saved;
    },
    [userId]
  );

  const resetBranding = useCallback(() => {
    setBranding(DEFAULT_BRANDING);
  }, [setBranding]);

  const display = useMemo(() => getDisplayTitle(branding), [branding]);

  const value = useMemo(
    () => ({
      branding,
      appName: display.appName,
      shipName: display.shipName,
      fullTitle: display.fullTitle,
      setBranding,
      resetBranding,
    }),
    [branding, display, setBranding, resetBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider.");
  }
  return context;
}
