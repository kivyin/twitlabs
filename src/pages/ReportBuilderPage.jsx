import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createDashboard,
  createDashboardReport,
  getDashboardReports,
  getDashboards,
  runDashboardReport,
  saveDashboardLayout,
  updateDashboardReport,
} from "../api/dashboardApi";
import PageHeader from "../components/PageHeader";
import CustomSqlReport from "../dashboard/reports/CustomSqlReport";
import { buildCustomReportPath, buildReportKey } from "../dashboard/reportRegistry";
import { CHART_KINDS, CHART_PALETTE, isChartKind, parseChartConfig } from "../utils/chartOptions";

const DEFAULT_SQL = `SELECT 'Example' AS label, 1 AS value`;

function FieldShelf({
  label,
  fields,
  options,
  onAdd,
  onRemove,
  placeholder = "Add field",
}) {
  const available = options.filter((column) => !fields.includes(column));

  return (
    <div className="report-field-shelf">
      <span className="report-field-shelf-label">{label}</span>
      <div className="report-field-shelf-content">
        {fields.map((field) => (
          <span key={field} className="report-field-pill">
            <span>{field}</span>
            <button
              type="button"
              aria-label={`Remove ${field} from ${label}`}
              title={`Remove ${field}`}
              onClick={() => onRemove(field)}
            >
              ×
            </button>
          </span>
        ))}
        <select
          aria-label={`${placeholder} to ${label}`}
          value=""
          onChange={(event) => {
            if (event.target.value) onAdd(event.target.value);
          }}
        >
          <option value="">{fields.length === 0 ? placeholder : "+ Add field"}</option>
          {available.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ReportBuilderPage() {
  const { appName = "budget", reportId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(reportId);
  const [loading, setLoading] = useState(isEdit);
  const [report, setReport] = useState(null);
  const [savedReport, setSavedReport] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [widgetKind, setWidgetKind] = useState("bar");
  const [xColumn, setXColumn] = useState("");
  const [valueColumns, setValueColumns] = useState([]);
  const [seriesColumn, setSeriesColumn] = useState("");
  const [viewTitle, setViewTitle] = useState("");
  const [xAxisTitle, setXAxisTitle] = useState("");
  const [yAxisTitle, setYAxisTitle] = useState("");
  const [valueFormat, setValueFormat] = useState("number");
  const [stacked, setStacked] = useState(false);
  const [legend, setLegend] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [colors, setColors] = useState(CHART_PALETTE.slice(0, 4));
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState(null);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("data");

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    getDashboardReports(appName)
      .then((reports) => {
        if (!active) return;
        const found = reports.find((entry) => Number(entry.id) === Number(reportId));
        if (!found) {
          setError("Custom report not found.");
          return;
        }
        const config = parseChartConfig(found.chart_config);
        setReport(found);
        setName(found.name ?? "");
        setDescription(found.description ?? "");
        setSql(found.sql ?? DEFAULT_SQL);
        setWidgetKind(found.widget_kind ?? "bar");
        setXColumn(config.xColumn ?? "");
        setValueColumns(Array.isArray(config.valueColumns) ? config.valueColumns : []);
        setSeriesColumn(config.seriesColumn ?? "");
        setViewTitle(config.title ?? "");
        setXAxisTitle(config.xAxisTitle ?? "");
        setYAxisTitle(config.yAxisTitle ?? "");
        setValueFormat(config.valueFormat ?? "number");
        setStacked(Boolean(config.stacked));
        setLegend(config.legend !== false);
        setShowLabels(Boolean(config.showLabels));
        setColors(
          Array.isArray(config.colors) && config.colors.length
            ? config.colors.slice(0, 4)
            : CHART_PALETTE.slice(0, 4)
        );
        setVisibleColumns(Array.isArray(config.visibleColumns) ? config.visibleColumns : []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appName, isEdit, reportId]);

  const chartMode = isChartKind(widgetKind);
  const listMode = widgetKind === "list" || widgetKind === "table";
  const pieLike = widgetKind === "pie" || widgetKind === "donut";
  const columnNames = useMemo(() => previewColumns.map((column) => column.name), [previewColumns]);
  const numericColumnNames = useMemo(
    () =>
      columnNames.filter((columnName) =>
        (previewRows ?? []).some(
          (row) => row[columnName] !== null && row[columnName] !== "" && Number.isFinite(Number(row[columnName]))
        )
      ),
    [columnNames, previewRows]
  );
  const hasValidPreview =
    Array.isArray(previewRows) && previewRows.length > 0 && previewColumns.length > 0;

  const buildChartConfig = () => ({
    title: viewTitle.trim() || null,
    xColumn: xColumn || null,
    valueColumns: valueColumns.length ? valueColumns : null,
    seriesColumn: pieLike || widgetKind === "scatter" ? null : seriesColumn || null,
    xAxisTitle: xAxisTitle.trim() || null,
    yAxisTitle: yAxisTitle.trim() || null,
    valueFormat,
    stacked: chartMode && !pieLike && widgetKind !== "scatter" ? stacked : false,
    legend,
    showLabels,
    colors: colors.filter(Boolean),
    visibleColumns: listMode && visibleColumns.length ? visibleColumns : null,
  });

  const buildDraft = () => ({
    id: report?.id,
    application: appName,
    name: name.trim() || "Untitled report",
    description: description.trim(),
    widget_kind: widgetKind,
    sql: sql.trim(),
    label_column: xColumn || null,
    value_column: valueColumns[0] || null,
    chart_config: JSON.stringify(buildChartConfig()),
  });

  const handleRun = async () => {
    setRunning(true);
    setError("");
    setStatus("Running query...");
    try {
      const result = await runDashboardReport({ application: appName, sql: sql.trim() });
      const nextColumns = result.columns ?? [];
      const names = nextColumns.map((column) => column.name);
      setPreviewRows(result.rows ?? []);
      setPreviewColumns(nextColumns);
      setVisibleColumns((current) => current.filter((column) => names.includes(column)));
      if (!xColumn && names[0]) setXColumn(names[0]);
      if (valueColumns.length === 0 && names.length > 1) setValueColumns([names[1]]);
      setStatus(
        `${result.rows?.length ?? 0} row${result.rows?.length === 1 ? "" : "s"} loaded${
          result.truncated ? " (first 1,000 shown)" : ""
        }.`
      );
      setActiveTab("data");
    } catch (runError) {
      setPreviewRows(null);
      setPreviewColumns([]);
      setStatus("");
      setError(runError.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!hasValidPreview) {
      setError("Run the query and retrieve at least one valid row before saving the report.");
      setActiveTab("data");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const draft = buildDraft();
      let nextReport;
      if (report?.id) {
        await updateDashboardReport(Number(report.id), draft);
        nextReport = { ...report, ...draft, id: Number(report.id) };
      } else {
        const result = await createDashboardReport(draft);
        nextReport = { ...draft, id: result.id };
      }
      setReport(nextReport);
      setSavedReport(nextReport);
      setStatus("Report saved. You can open it or add it to your dashboard.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToDashboard = async () => {
    if (!savedReport?.id) return;
    setAdding(true);
    setError("");
    try {
      const key = buildReportKey("custom", savedReport.id);
      let dashboards = await getDashboards(appName);
      if (dashboards.length === 0) {
        const created = await createDashboard({
          application: appName,
          name: "Main",
          items: [{ key, span: 3 }],
        });
        dashboards = created ? [created] : [];
      } else {
        const target =
          dashboards.find((dashboard) => Number(dashboard.is_default) === 1) ?? dashboards[0];
        const items = target.items ?? [];
        if (!items.some((item) => item.key === key)) {
          await saveDashboardLayout(target.id, [...items, { key, span: 3 }]);
        }
      }
      setStatus(`Added to ${dashboards[0]?.name || "your"} dashboard.`);
    } catch (addError) {
      setError(addError.message);
    } finally {
      setAdding(false);
    }
  };

  const toggleValueColumn = (column) => {
    if (pieLike || widgetKind === "scatter") {
      setValueColumns([column]);
      return;
    }
    setValueColumns((current) =>
      current.includes(column)
        ? current.filter((entry) => entry !== column)
        : [...current, column]
    );
  };

  const toggleVisibleColumn = (column) => {
    setVisibleColumns((current) =>
      current.includes(column)
        ? current.filter((entry) => entry !== column)
        : [...current, column]
    );
  };

  const addFieldToView = (column) => {
    if (listMode) {
      toggleVisibleColumn(column);
      return;
    }
    if (widgetKind === "stat") {
      setValueColumns((current) => (current[0] === column ? [] : [column]));
      return;
    }
    if (widgetKind === "bars") {
      if (numericColumnNames.includes(column)) {
        setValueColumns((current) => (current[0] === column ? [] : [column]));
      } else {
        setXColumn((current) => (current === column ? "" : column));
      }
      return;
    }
    if (!xColumn) {
      setXColumn(column);
      return;
    }
    if (numericColumnNames.includes(column)) {
      toggleValueColumn(column);
      return;
    }
    setXColumn(column);
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home" || event.key === "ArrowLeft" ? "data" : "visualization";
    setActiveTab(next);
    document.getElementById(`report-builder-tab-${next}`)?.focus();
  };

  if (appName === "troublehub") {
    return (
      <section className="panel empty-state">
        <p className="error">Custom report authoring is not available for TroubleHub.</p>
      </section>
    );
  }

  if (loading) return <section className="panel"><p className="subtext">Loading designer...</p></section>;
  if (isEdit && !report) {
    return <section className="panel empty-state"><p className="error">{error || "Custom report not found."}</p></section>;
  }

  const draft = buildDraft();
  const fullReportPath = savedReport
    ? `/app/${appName}/reports/${buildCustomReportPath(savedReport.id)}`
    : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Report Center", to: `/app/${appName}/reports` },
          { label: isEdit ? "Edit report" : "New report" },
        ]}
        title={isEdit ? "Edit custom report" : "Build a custom report"}
        subtitle="Define a secure read-only data model, then shape it into a reusable report."
        favorite={false}
        actions={
          <Link to={`/app/${appName}/reports`}>
            Cancel
          </Link>
        }
      />

      <form className="report-designer" onSubmit={handleSave}>
        <div className="report-builder-tabs" role="tablist" aria-label="Report builder steps">
          {[
            { id: "data", label: "Data" },
            { id: "visualization", label: "Visualization" },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`report-builder-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`report-builder-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section
          id="report-builder-panel-data"
          className="panel report-designer-section"
          role="tabpanel"
          aria-labelledby="report-builder-tab-data"
          hidden={activeTab !== "data"}
        >
          <div className="report-designer-section-heading">
            <div>
              <h2>Data definition</h2>
              <p className="subtext">Use one read-only SELECT or WITH statement for this application.</p>
            </div>
          </div>
          <label>
            SQL query
            <textarea
              className="report-sql-editor"
              value={sql}
              onChange={(event) => {
                setSql(event.target.value);
                setPreviewRows(null);
                setPreviewColumns([]);
                setStatus("");
              }}
              rows={10}
              spellCheck={false}
              required
            />
          </label>
          <div className="report-run-row">
            <button type="button" className="button-primary" onClick={handleRun} disabled={running}>
              {running ? "Running..." : "Run query"}
            </button>
            {status && <span className="status" role="status">{status}</span>}
          </div>

          {columnNames.length > 0 && (
            <div className="report-data-columns">
              <strong>Discovered columns</strong>
              <div className="report-builder-column-chips">
                {previewColumns.map((column) => (
                  <span key={column.name} className="report-builder-chip">
                    {column.name}
                    {column.type ? <small>{column.type}</small> : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {previewRows !== null && (
            <div className="report-data-preview">
              <div className="report-designer-preview-heading">
                <h3>Data preview</h3>
                <span>{previewRows.length} rows</span>
              </div>
              <div className="table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>{columnNames.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 100).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {columnNames.map((column) => (
                          <td key={column}>{row[column] == null ? "" : String(row[column])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 100 && (
                <p className="subtext">Showing the first 100 rows in this preview.</p>
              )}
            </div>
          )}

          {previewRows !== null && (
            <div className="report-data-continue">
              <button
                type="button"
                className="button-primary"
                onClick={() => setActiveTab("visualization")}
              >
                Continue to Visualization
              </button>
            </div>
          )}
        </section>

        <section
          id="report-builder-panel-visualization"
          className="panel report-designer-section"
          role="tabpanel"
          aria-labelledby="report-builder-tab-visualization"
          hidden={activeTab !== "visualization"}
        >
          <div className="report-designer-section-heading">
            <div>
              <h2>Visualization</h2>
              <p className="subtext">Add fields, map shelves, and refine the live view.</p>
            </div>
          </div>

          <div className="report-tableau-layout">
            <aside className="report-field-list" aria-label="Available fields">
              <h3>Fields</h3>
              {columnNames.length === 0 ? (
                <p className="subtext">Run the query on the Data tab to discover fields.</p>
              ) : (
                columnNames.map((column) => {
                  const selected = listMode
                    ? visibleColumns.includes(column)
                    : xColumn === column || valueColumns.includes(column);
                  return (
                    <button
                      key={column}
                      type="button"
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      onClick={() => addFieldToView(column)}
                    >
                      <span>{column}</span>
                      <small>{numericColumnNames.includes(column) ? "Number" : "Dimension"}</small>
                    </button>
                  );
                })
              )}
            </aside>

            <div className="report-visualization-workspace">
              <div className="report-builder-grid">
                <label>
                  Report name
                  <input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label>
                  Report type
                  <select value={widgetKind} onChange={(event) => setWidgetKind(event.target.value)}>
                    {CHART_KINDS.map((kind) => (
                      <option key={kind.id} value={kind.id}>{kind.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Description
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What this report helps people understand"
                  />
                </label>
                <label>
                  Chart / list title
                  <input
                    value={viewTitle}
                    onChange={(event) => setViewTitle(event.target.value)}
                    placeholder="Optional title inside the report view"
                  />
                </label>
              </div>

              {chartMode && (
                <div className="report-view-options">
                  <div className="report-shelves">
                    <FieldShelf
                      label={pieLike ? "Labels" : "X axis"}
                      fields={xColumn ? [xColumn] : []}
                      options={columnNames}
                      onAdd={setXColumn}
                      onRemove={() => setXColumn("")}
                    />
                    <FieldShelf
                      label={pieLike ? "Values" : "Y axis"}
                      fields={
                        pieLike || widgetKind === "scatter"
                          ? valueColumns.slice(0, 1)
                          : valueColumns
                      }
                      options={numericColumnNames.length ? numericColumnNames : columnNames}
                      onAdd={(column) =>
                        pieLike || widgetKind === "scatter"
                          ? setValueColumns([column])
                          : setValueColumns((current) =>
                              current.includes(column) ? current : [...current, column]
                            )
                      }
                      onRemove={(column) =>
                        setValueColumns((current) => current.filter((entry) => entry !== column))
                      }
                    />
                    {!pieLike && widgetKind !== "scatter" && (
                      <FieldShelf
                        label="Series"
                        fields={seriesColumn ? [seriesColumn] : []}
                        options={columnNames}
                        onAdd={setSeriesColumn}
                        onRemove={() => setSeriesColumn("")}
                      />
                    )}
                  </div>

                  <details className="report-visual-settings" open>
                    <summary>Labels, axes, and appearance</summary>
                    <div className="report-builder-grid">
                      <label>
                        X axis title
                        <input value={xAxisTitle} onChange={(event) => setXAxisTitle(event.target.value)} />
                      </label>
                      <label>
                        Y axis title
                        <input value={yAxisTitle} onChange={(event) => setYAxisTitle(event.target.value)} />
                      </label>
                      <label>
                        Number format
                        <select value={valueFormat} onChange={(event) => setValueFormat(event.target.value)}>
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="percent">Percent</option>
                          <option value="compact">Compact (1.2K)</option>
                        </select>
                      </label>
                      <div className="report-builder-checks">
                        <label><input type="checkbox" checked={legend} onChange={(event) => setLegend(event.target.checked)} /> Legend</label>
                        <label><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Labels</label>
                        {!pieLike && widgetKind !== "scatter" && (
                          <label><input type="checkbox" checked={stacked} onChange={(event) => setStacked(event.target.checked)} /> Stacked</label>
                        )}
                      </div>
                    </div>
                    <div className="report-color-settings">
                      <span>Series colors</span>
                      {colors.map((color, index) => (
                        <input
                          key={index}
                          type="color"
                          value={color}
                          aria-label={`Series color ${index + 1}`}
                          onChange={(event) =>
                            setColors((current) =>
                              current.map((entry, colorIndex) =>
                                colorIndex === index ? event.target.value : entry
                              )
                            )
                          }
                        />
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {listMode && (
                <div className="report-view-options">
                  <FieldShelf
                    label="Columns"
                    fields={visibleColumns}
                    options={columnNames}
                    onAdd={(column) =>
                      setVisibleColumns((current) =>
                        current.includes(column) ? current : [...current, column]
                      )
                    }
                    onRemove={(column) =>
                      setVisibleColumns((current) =>
                        current.filter((entry) => entry !== column)
                      )
                    }
                    placeholder="Add a column"
                  />
                  <p className="subtext">Leave the shelf empty to display every query column.</p>
                </div>
              )}

              {widgetKind === "stat" && (
                <div className="report-view-options">
                  <FieldShelf
                    label="Value"
                    fields={valueColumns.slice(0, 1)}
                    options={numericColumnNames.length ? numericColumnNames : columnNames}
                    onAdd={(column) => setValueColumns([column])}
                    onRemove={() => setValueColumns([])}
                    placeholder="Add a value"
                  />
                </div>
              )}

              {widgetKind === "bars" && (
                <div className="report-view-options">
                  <div className="report-shelves report-shelves--two">
                    <FieldShelf
                      label="Rows"
                      fields={xColumn ? [xColumn] : []}
                      options={columnNames}
                      onAdd={setXColumn}
                      onRemove={() => setXColumn("")}
                      placeholder="Add a label"
                    />
                    <FieldShelf
                      label="Columns"
                      fields={valueColumns.slice(0, 1)}
                      options={numericColumnNames.length ? numericColumnNames : columnNames}
                      onAdd={(column) => setValueColumns([column])}
                      onRemove={() => setValueColumns([])}
                      placeholder="Add a value"
                    />
                  </div>
                </div>
              )}

              {previewRows !== null ? (
                <div className="report-designer-preview">
                  <div className="report-designer-preview-heading">
                    <h3>Live preview</h3>
                    <span>{previewRows.length} rows</span>
                  </div>
                  <CustomSqlReport
                    report={draft}
                    previewRows={previewRows}
                    previewColumns={columnNames}
                    fullPage
                  />
                </div>
              ) : (
                <p className="report-designer-hint">Run the query on the Data tab to enable preview.</p>
              )}
            </div>
          </div>
        </section>

        {error && <p className="error">{error}</p>}
        {status && <p className="status">{status}</p>}
        <div className="report-designer-actions">
          <button
            type="submit"
            className="button-primary"
            disabled={saving || !hasValidPreview}
            title={
              hasValidPreview
                ? undefined
                : "Run the query and retrieve valid data before saving."
            }
          >
            {saving ? "Saving..." : report?.id ? "Save changes" : "Save report"}
          </button>
          {!hasValidPreview && (
            <span className="subtext">Run a preview with at least one row to enable saving.</span>
          )}
          {fullReportPath && (
            <>
              <Link className="button-primary" to={fullReportPath}>Open full report</Link>
              <button type="button" onClick={handleAddToDashboard} disabled={adding}>
                {adding ? "Adding..." : "Add to dashboard"}
              </button>
            </>
          )}
          <button type="button" onClick={() => navigate(`/app/${appName}/reports`)}>Cancel</button>
        </div>
      </form>
    </>
  );
}

export default ReportBuilderPage;
