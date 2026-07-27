import { useCallback, useEffect, useState } from "react";
import { getVersionStatus } from "../api/versionApi";
import { formatVersionLabel, getAppRepo, getAppVersion } from "../utils/appVersion";

/**
 * Loads current app version vs latest GitHub release.
 * status: checking | up-to-date | update-available | unknown | error
 */
export function useAppVersionStatus() {
  const [state, setState] = useState({
    status: "checking",
    current: getAppVersion(),
    latest: null,
    releaseUrl: null,
    releaseName: null,
    repo: getAppRepo(),
  });

  const applyPayload = useCallback((payload) => {
    setState({
      status: payload.status || "unknown",
      current: payload.current || getAppVersion(),
      latest: payload.latest || null,
      releaseUrl: payload.releaseUrl || null,
      releaseName: payload.releaseName || null,
      repo: payload.repo || getAppRepo(),
    });
  }, []);

  const refresh = useCallback(
    async ({ force = false } = {}) => {
      setState((current) => ({ ...current, status: "checking" }));
      try {
        const payload = await getVersionStatus({ refresh: force });
        applyPayload(payload);
        return payload;
      } catch {
        setState((current) => ({
          ...current,
          status: "error",
          current: getAppVersion(),
          repo: getAppRepo(),
        }));
        return null;
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    let active = true;

    getVersionStatus()
      .then((payload) => {
        if (!active) return;
        applyPayload(payload);
      })
      .catch(() => {
        if (!active) return;
        setState((current) => ({
          ...current,
          status: "error",
          current: getAppVersion(),
          repo: getAppRepo(),
        }));
      });

    return () => {
      active = false;
    };
  }, [applyPayload]);

  const repo = state.repo || getAppRepo();

  return {
    ...state,
    repo,
    repoUrl: `https://github.com/${repo}`,
    currentLabel: formatVersionLabel(state.current),
    latestLabel: state.latest ? formatVersionLabel(state.latest) : null,
    refresh,
  };
}
