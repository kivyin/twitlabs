import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getDashboardReports } from "../api/dashboardApi";
import ConfirmModal from "../components/common/ConfirmModal";
import { useFavorites } from "../context/FavoritesContext";
import DashboardWidget from "./DashboardWidget";
import ReportBuilderModal from "./ReportBuilderModal";
import ReportPickerModal from "./ReportPickerModal";
import CustomSqlReport from "./reports/CustomSqlReport";
import {
  buildReportKey,
  getBuiltinReport,
  parseReportKey,
} from "./reportRegistry";
import { useDashboards } from "./useDashboardLayout";

function DashboardTabMenu({ dashboard, application, onRename, onSetDefault, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  const dashboardPath = `/app/${application}?dashboard=${dashboard.id}`;
  const favorited = isFavorite(dashboardPath);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span className="dashboard-tab-menu" ref={menuRef}>
      <button
        type="button"
        className="dashboard-tab-menu-button"
        aria-label={`Options for ${dashboard.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div className="dashboard-tab-menu-popover">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Rename
          </button>
          {Number(dashboard.is_default) !== 1 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSetDefault();
              }}
            >
              Set as default
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              toggleFavorite({ path: dashboardPath, label: `${dashboard.name} dashboard` });
            }}
          >
            {favorited ? "Remove from favorites" : "Add to favorites"}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </span>
  );
}

function Dashboard({ application }) {
  const {
    dashboards,
    activeDashboard,
    activeId,
    setActiveId,
    layout,
    loading,
    error: dashboardError,
    addReport,
    removeReport,
    setReportSpan,
    moveReport,
    resetLayout,
    createNewDashboard,
    renameDashboard,
    setDefaultDashboard,
    removeDashboard,
  } = useDashboards(application);

  const [customReports, setCustomReports] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Allow deep links / favorites like /app/budget?dashboard=3
  const requestedDashboard = searchParams.get("dashboard");
  useEffect(() => {
    if (!requestedDashboard || dashboards.length === 0) return;
    const id = Number(requestedDashboard);
    if (dashboards.some((dashboard) => dashboard.id === id)) {
      setActiveId(id);
    }
  }, [requestedDashboard, dashboards, setActiveId]);

  useEffect(() => {
    let active = true;

    getDashboardReports(application)
      .then((reports) => {
        if (active) setCustomReports(reports);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [application]);

  const customReportMap = useMemo(
    () => Object.fromEntries(customReports.map((report) => [report.id, report])),
    [customReports]
  );

  const resolvedWidgets = useMemo(() => {
    return layout
      .map((item) => {
        const parsed = parseReportKey(item.key);
        if (!parsed) return null;

        if (parsed.source === "builtin") {
          const report = getBuiltinReport(application, parsed.id);
          if (!report) return null;
          return {
            key: item.key,
            span: item.span,
            title: report.title,
            description: report.description,
            component: report.component,
            props: { appName: application },
            customReport: null,
          };
        }

        const report = customReportMap[parsed.id];
        if (!report) return null;
        return {
          key: item.key,
          span: item.span,
          title: report.name,
          description: report.description,
          component: CustomSqlReport,
          props: { report },
          customReport: report,
        };
      })
      .filter(Boolean);
  }, [application, customReportMap, layout]);

  const handleReportCreated = (report) => {
    setCustomReports((current) => [...current, report]);
    addReport(buildReportKey("custom", report.id), 2);
    setBuilderOpen(false);
    setPickerOpen(false);
  };

  const handleReportSaved = (report) => {
    setCustomReports((current) =>
      current.map((entry) => (entry.id === report.id ? { ...entry, ...report } : entry))
    );
    setEditingReport(null);
  };

  const selectDashboard = (id) => {
    setActiveId(id);
    if (searchParams.has("dashboard")) {
      searchParams.delete("dashboard");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const startRename = (dashboard) => {
    setRenamingId(dashboard.id);
    setRenameValue(dashboard.name);
  };

  const submitRename = async () => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || !renamingId) return;
    try {
      await renameDashboard(renamingId, name);
    } catch (renameError) {
      setError(renameError.message);
    }
  };

  const submitCreate = async () => {
    const name = createValue.trim();
    setCreating(false);
    setCreateValue("");
    if (!name) return;
    try {
      await createNewDashboard(name);
    } catch (createError) {
      setError(createError.message);
    }
  };

  const requestDelete = (dashboard) => {
    if (dashboards.length <= 1) {
      setError("You need at least one dashboard.");
      return;
    }
    setDeleteTarget(dashboard);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await removeDashboard(deleteTarget.id);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-toolbar">
        <div>
          <h2>Dashboard</h2>
          <p className="subtext">Overview reports you can customize and extend with SQL.</p>
        </div>
        <div className="dashboard-toolbar-actions">
          <Link to={`/app/${application}/reports`} className="button-primary">
            Report Center
          </Link>
          <button type="button" onClick={() => setPickerOpen(true)}>
            Add report
          </button>
          <button type="button" onClick={() => setBuilderOpen(true)}>
            Build report
          </button>
          <button type="button" className="linkish-button" onClick={resetLayout}>
            Reset layout
          </button>
        </div>
      </div>

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboards">
        {dashboards.map((dashboard) => {
          const isActive = dashboard.id === activeId;
          return (
            <div
              key={dashboard.id}
              className={`dashboard-tab${isActive ? " active" : ""}`}
              role="presentation"
            >
              {renamingId === dashboard.id ? (
                <input
                  className="dashboard-tab-rename"
                  value={renameValue}
                  autoFocus
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename();
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className="dashboard-tab-button"
                  onClick={() => selectDashboard(dashboard.id)}
                  onDoubleClick={() => startRename(dashboard)}
                >
                  {dashboard.name}
                  {Number(dashboard.is_default) === 1 && (
                    <span className="dashboard-tab-default" title="Default dashboard">
                      ★
                    </span>
                  )}
                </button>
              )}
              {isActive && renamingId !== dashboard.id && (
                <DashboardTabMenu
                  dashboard={dashboard}
                  application={application}
                  onRename={() => startRename(dashboard)}
                  onSetDefault={() =>
                    setDefaultDashboard(dashboard.id).catch((err) => setError(err.message))
                  }
                  onDelete={() => requestDelete(dashboard)}
                />
              )}
            </div>
          );
        })}

        {creating ? (
          <input
            className="dashboard-tab-rename"
            value={createValue}
            autoFocus
            placeholder="Dashboard name"
            onChange={(event) => setCreateValue(event.target.value)}
            onBlur={submitCreate}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitCreate();
              if (event.key === "Escape") {
                setCreating(false);
                setCreateValue("");
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="dashboard-tab-add"
            title="New dashboard"
            onClick={() => setCreating(true)}
          >
            + New
          </button>
        )}
      </div>

      {(error || dashboardError) && <p className="error">{error || dashboardError}</p>}

      {loading ? (
        <div className="panel dashboard-empty">
          <p className="subtext">Loading dashboards...</p>
        </div>
      ) : resolvedWidgets.length === 0 ? (
        <div className="panel dashboard-empty">
          <p className="subtext">
            {activeDashboard ? `"${activeDashboard.name}" is empty.` : "Your dashboard is empty."}
          </p>
          <div className="dashboard-empty-actions">
            <button type="button" className="button-primary" onClick={() => setPickerOpen(true)}>
              Add a report
            </button>
            <button type="button" onClick={() => setBuilderOpen(true)}>
              Build custom report
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          {resolvedWidgets.map((widget, index) => {
            const ReportComponent = widget.component;
            return (
              <DashboardWidget
                key={widget.key}
                title={widget.title}
                description={widget.description}
                span={widget.span}
                onRemove={() => removeReport(widget.key)}
                onMoveLeft={index > 0 ? () => moveReport(widget.key, -1) : undefined}
                onMoveRight={
                  index < resolvedWidgets.length - 1
                    ? () => moveReport(widget.key, 1)
                    : undefined
                }
                onToggleSpan={() =>
                  setReportSpan(widget.key, widget.span >= 3 ? 1 : Number(widget.span || 1) + 1)
                }
                onEdit={
                  widget.customReport ? () => setEditingReport(widget.customReport) : undefined
                }
              >
                <ReportComponent {...widget.props} />
              </DashboardWidget>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <ReportPickerModal
          application={application}
          layout={layout}
          customReports={customReports}
          onClose={() => setPickerOpen(false)}
          onAdd={(key, span) => {
            addReport(key, span);
            setPickerOpen(false);
          }}
          onBuildCustom={() => {
            setPickerOpen(false);
            setBuilderOpen(true);
          }}
        />
      )}

      {builderOpen && (
        <ReportBuilderModal
          application={application}
          onClose={() => setBuilderOpen(false)}
          onCreated={handleReportCreated}
        />
      )}

      {editingReport && (
        <ReportBuilderModal
          application={application}
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSaved={handleReportSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete dashboard?"
          message={`Delete dashboard "${deleteTarget.name}"? Its layout will be lost.`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          busy={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </section>
  );
}

export default Dashboard;
