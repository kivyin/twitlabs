import { useCallback, useEffect, useState } from "react";
import {
  createDashboard,
  deleteDashboard,
  getDashboards,
  saveDashboardLayout,
  updateDashboard,
} from "../api/dashboardApi";
import { DEFAULT_LAYOUTS, FULL_WIDTH_DASHBOARD_KEYS } from "./reportRegistry";

function readLegacyLayout(application) {
  try {
    const raw = localStorage.getItem(`dashboard-layout:${application}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore invalid stored layout
  }
  return DEFAULT_LAYOUTS[application] ?? [];
}

function upgradeFullWidthSpans(items = []) {
  let changed = false;
  const next = items.map((item) => {
    const isFullWidthChart =
      FULL_WIDTH_DASHBOARD_KEYS.has(item.key) || String(item.key || "").startsWith("custom:");
    if (isFullWidthChart && Number(item.span) === 2) {
      changed = true;
      return { ...item, span: 3 };
    }
    return item;
  });
  return { items: next, changed };
}

function readActiveId(application) {
  const raw = localStorage.getItem(`dashboard-active:${application}`);
  return raw ? Number(raw) : null;
}

/**
 * Server-backed multi-dashboard state. On first use, migrates the old
 * localStorage layout (or the app default) into a "Main" dashboard.
 */
export function useDashboards(application) {
  const [dashboards, setDashboards] = useState([]);
  const [activeId, setActiveIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        let list = await getDashboards(application);
        if (list.length === 0) {
          const created = await createDashboard({
            application,
            name: "Main",
            items: readLegacyLayout(application),
          });
          list = created ? [created] : [];
        }
        if (!active) return;

        const migrationKey = `dashboard-chart-span3:${application}`;
        const alreadyMigrated = localStorage.getItem(migrationKey) === "1";
        if (!alreadyMigrated) {
          const upgraded = [];
          list = list.map((dashboard) => {
            const result = upgradeFullWidthSpans(dashboard.items ?? []);
            if (!result.changed) return dashboard;
            upgraded.push({ id: dashboard.id, items: result.items });
            return { ...dashboard, items: result.items };
          });
          localStorage.setItem(migrationKey, "1");
          for (const entry of upgraded) {
            saveDashboardLayout(entry.id, entry.items).catch(() => {
              // Keep local upgraded layout even if persist fails.
            });
          }
        }

        setDashboards(list);

        const stored = readActiveId(application);
        const preferred =
          list.find((dashboard) => dashboard.id === stored) ??
          list.find((dashboard) => Number(dashboard.is_default) === 1) ??
          list[0];
        setActiveIdState(preferred?.id ?? null);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [application]);

  const setActiveId = useCallback(
    (id) => {
      setActiveIdState(id);
      localStorage.setItem(`dashboard-active:${application}`, String(id));
    },
    [application]
  );

  const activeDashboard =
    dashboards.find((dashboard) => dashboard.id === activeId) ?? dashboards[0] ?? null;
  const layout = activeDashboard?.items ?? [];

  const updateItems = useCallback((dashboardId, updater) => {
    let nextItems = null;
    setDashboards((current) =>
      current.map((dashboard) => {
        if (dashboard.id !== dashboardId) return dashboard;
        nextItems = updater(dashboard.items ?? []);
        return { ...dashboard, items: nextItems };
      })
    );
    if (nextItems) {
      return saveDashboardLayout(dashboardId, nextItems).catch((saveError) => {
        setError(saveError.message || "Unable to save dashboard layout.");
      });
    }
    return Promise.resolve();
  }, []);

  const addReport = useCallback(
    (key, span = 1) => {
      if (!activeDashboard) return;
      updateItems(activeDashboard.id, (items) =>
        items.some((item) => item.key === key) ? items : [...items, { key, span }]
      );
    },
    [activeDashboard, updateItems]
  );

  const removeReport = useCallback(
    (key) => {
      if (!activeDashboard) return;
      updateItems(activeDashboard.id, (items) => items.filter((item) => item.key !== key));
    },
    [activeDashboard, updateItems]
  );

  const setReportSpan = useCallback(
    (key, span) => {
      if (!activeDashboard) return;
      updateItems(activeDashboard.id, (items) =>
        items.map((item) => (item.key === key ? { ...item, span } : item))
      );
    },
    [activeDashboard, updateItems]
  );

  const moveReport = useCallback(
    (key, direction) => {
      if (!activeDashboard) return;
      updateItems(activeDashboard.id, (items) => {
        const index = items.findIndex((item) => item.key === key);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= items.length) return items;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },
    [activeDashboard, updateItems]
  );

  const resetLayout = useCallback(() => {
    if (!activeDashboard) return;
    updateItems(activeDashboard.id, () => DEFAULT_LAYOUTS[application] ?? []);
  }, [activeDashboard, application, updateItems]);

  const createNewDashboard = useCallback(
    async (name) => {
      const created = await createDashboard({ application, name, items: [] });
      if (created) {
        setDashboards((current) => [...current, created]);
        setActiveId(created.id);
      }
      return created;
    },
    [application, setActiveId]
  );

  const renameDashboard = useCallback(async (id, name) => {
    await updateDashboard(id, { name });
    setDashboards((current) =>
      current.map((dashboard) => (dashboard.id === id ? { ...dashboard, name } : dashboard))
    );
  }, []);

  const setDefaultDashboard = useCallback(async (id) => {
    await updateDashboard(id, { is_default: 1 });
    setDashboards((current) =>
      current.map((dashboard) => ({
        ...dashboard,
        is_default: dashboard.id === id ? 1 : 0,
      }))
    );
  }, []);

  const removeDashboard = useCallback(
    async (id) => {
      await deleteDashboard(id);
      setDashboards((current) => {
        const next = current.filter((dashboard) => dashboard.id !== id);
        if (activeId === id && next.length > 0) {
          setActiveId(next[0].id);
        }
        return next;
      });
    },
    [activeId, setActiveId]
  );

  return {
    dashboards,
    activeDashboard,
    activeId: activeDashboard?.id ?? null,
    setActiveId,
    layout,
    loading,
    error,
    addReport,
    removeReport,
    setReportSpan,
    moveReport,
    resetLayout,
    createNewDashboard,
    renameDashboard,
    setDefaultDashboard,
    removeDashboard,
  };
}
