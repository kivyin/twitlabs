import { useEffect, useState } from "react";
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

  useEffect(() => {
    let active = true;

    getVersionStatus()
      .then((payload) => {
        if (!active) return;
        setState({
          status: payload.status || "unknown",
          current: payload.current || getAppVersion(),
          latest: payload.latest || null,
          releaseUrl: payload.releaseUrl || null,
          releaseName: payload.releaseName || null,
          repo: payload.repo || getAppRepo(),
        });
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
  }, []);

  const repo = state.repo || getAppRepo();

  return {
    ...state,
    repo,
    repoUrl: `https://github.com/${repo}`,
    currentLabel: formatVersionLabel(state.current),
    latestLabel: state.latest ? formatVersionLabel(state.latest) : null,
  };
}
