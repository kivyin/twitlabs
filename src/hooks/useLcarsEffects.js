import { useCallback, useSyncExternalStore } from "react";
import {
  getLcarsNavPulseEnabled,
  getLcarsProgressLightEnabled,
  setLcarsNavPulseEnabled,
  setLcarsProgressLightEnabled,
  subscribeLcarsEffects,
} from "../utils/lcarsEffects";

export function useLcarsEffects() {
  const navPulseEnabled = useSyncExternalStore(
    subscribeLcarsEffects,
    getLcarsNavPulseEnabled,
    () => true
  );
  const progressLightEnabled = useSyncExternalStore(
    subscribeLcarsEffects,
    getLcarsProgressLightEnabled,
    () => true
  );

  const setNavPulseEnabled = useCallback((enabled) => {
    setLcarsNavPulseEnabled(enabled);
  }, []);

  const setProgressLightEnabled = useCallback((enabled) => {
    setLcarsProgressLightEnabled(enabled);
  }, []);

  return {
    navPulseEnabled,
    progressLightEnabled,
    setNavPulseEnabled,
    setProgressLightEnabled,
  };
}
