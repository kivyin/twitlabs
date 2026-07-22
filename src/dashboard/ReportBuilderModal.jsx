import { useMemo, useState } from "react";
import { createDashboardReport, updateDashboardReport } from "../api/dashboardApi";
import { runQuery } from "../api/dbApi";
import CustomSqlReport from "./reports/CustomSqlReport";
import { CHART_KINDS, isChartKind, parseChartConfig } from "../utils/chartOptions";

const DEFAULT_SQL = `SELECT c.name AS label, COALESCE(SUM(t.amount), 0) AS value
FROM transactions t
JOIN categories c ON c.id = t.category_id
GROUP BY c.id, c.name
ORDER BY value DESC
LIMIT 5`;

function ReportBuilderModal({ application, report = null, onClose, onCreated, onSaved }) {
  const isEdit = Boolean(report?.id);
  const initialConfig = parseChartConfig(report?.chart_config);

  const [name, setName] = useState(report?.name ?? "");
  const [description, setDescription] = useState(report?.description ?? "");
  const [widgetKind, setWidgetKind] = useState(report?.widget_kind ?? "bar");
  const [sql, setSql] = useState(report?.sql ?? DEFAULT_SQL);
  const [labelColumn, setLabelColumn] = useState(report?.label_column ?? "label");
  const [valueColumn, setValueColumn] = useState(report?.value_column ?? "value");
  const [xColumn, setXColumn] = useState(initialConfig.xColumn ?? "");
  const [valueColumns, setValueColumns] = useState(initialConfig.valueColumns ?? []);
  const [seriesColumn, setSeriesColumn] = useState(initialConfig.seriesColumn ?? "");
  const [valueFormat, setValueFormat] = useState(initialConfig.valueFormat ?? "currency");
  const [stacked, setStacked] = useState(Boolean(initialConfig.stacked));
  const [legend, setLegend] = useState(initialConfig.legend !== false);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewReport, setPreviewReport] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const chartMode = isChartKind(widgetKind);
  const pieLike = widgetKind === "pie" || widgetKind === "donut";

  const buildChartConfig = () => {
    if (!chartMode) return null;
    return {
      xColumn: xColumn || null,
      valueColumns: valueColumns.length > 0 ? valueColumns : null,
      seriesColumn: pieLike || widgetKind === "scatter" ? null : seriesColumn || null,
      valueFormat,
      stacked: !pieLike && widgetKind !== "scatter" ? stacked : false,
      legend,
    };
  };

  const buildDraft = () => ({
    name: name.trim() || "Preview",
    description,
    widget_kind: widgetKind,
    sql: sql.trim(),
    label_column: labelColumn.trim() || null,
    value_column: valueColumn.trim() || null,
    chart_config: buildChartConfig(),
  });

  const handlePreview = async () => {
    setError("");
    setStatus("Running preview...");

    try {
      const result = await runQuery({ sql: sql.trim() });
      const rows = result.rows ?? [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      setPreviewColumns(columns);
      setPreviewReport(buildDraft());
      setStatus(rows.length === 0 ? "Query ran, but returned no rows." : "Preview updated.");
    } catch (previewError) {
      setPreviewReport(null);
      setStatus("");
      setError(previewError.message);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const chartConfig = buildChartConfig();
      const payload = {
        application: report?.application ?? application,
        name: name.trim(),
        description: description.trim(),
        widget_kind: widgetKind,
        sql: sql.trim(),
        label_column: labelColumn.trim() || null,
        value_column: valueColumn.trim() || null,
        chart_config: chartConfig ? JSON.stringify(chartConfig) : null,
      };

      if (isEdit) {
        await updateDashboardReport(report.id, payload);
        onSaved?.({ ...report, ...payload });
      } else {
        const result = await createDashboardReport(payload);
        onCreated?.({ id: result.id, ...payload });
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleValueColumn = (column) => {
    setValueColumns((current) =>
      current.includes(column)
        ? current.filter((entry) => entry !== column)
        : [...current, column]
    );
  };

  const columnOptions = useMemo(
    () => previewColumns.map((column) => ({ value: column, label: column })),
    [previewColumns]
  );

  const columnSelect = (value, onChange, placeholder) => (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {columnOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card dashboard-modal wide" onClick={(event) => event.stopPropagation()}>
        <h2>{isEdit ? "Edit report" : "Build custom report"}</h2>
        <p>Write a read-only SQL query, pick a visualization, and map your columns.</p>

        <form className="form report-builder-form" onSubmit={handleSave}>
          <div className="report-builder-grid">
            <label>
              Report name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Visualization
              <select value={widgetKind} onChange={(event) => setWidgetKind(event.target.value)}>
                {CHART_KINDS.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional summary shown on the widget"
            />
          </label>

          <label>
            SQL query
            <textarea
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              rows={8}
              spellCheck={false}
              required
            />
          </label>

          {!chartMode && widgetKind !== "table" && (
            <div className="report-builder-grid">
              {widgetKind === "bars" && (
                <label>
                  Label column
                  <input
                    value={labelColumn}
                    onChange={(event) => setLabelColumn(event.target.value)}
                    placeholder="label"
                  />
                </label>
              )}
              <label>
                Value column
                <input
                  value={valueColumn}
                  onChange={(event) => setValueColumn(event.target.value)}
                  placeholder="value"
                />
              </label>
            </div>
          )}

          {chartMode && (
            <fieldset className="report-builder-chart-options">
              <legend>Chart options</legend>
              {previewColumns.length === 0 && (
                <p className="subtext">
                  Run a preview to load your query columns, then map them here. Leaving fields
                  blank uses the first text column for labels and the first numeric column for
                  values.
                </p>
              )}

              <div className="report-builder-grid">
                <label>
                  {pieLike ? "Slice label column" : widgetKind === "scatter" ? "X column (numeric)" : "X axis column"}
                  {columnSelect(xColumn, setXColumn, "Auto (first column)")}
                </label>
                <label>
                  Value format
                  <select
                    value={valueFormat}
                    onChange={(event) => setValueFormat(event.target.value)}
                  >
                    <option value="currency">Currency ($)</option>
                    <option value="number">Plain number</option>
                  </select>
                </label>
              </div>

              {!pieLike && widgetKind !== "scatter" && (
                <div className="report-builder-grid">
                  <label>
                    Group / series column (optional)
                    {columnSelect(seriesColumn, setSeriesColumn, "None")}
                  </label>
                  <label className="report-builder-checks">
                    <span>
                      <input
                        type="checkbox"
                        checked={stacked}
                        onChange={(event) => setStacked(event.target.checked)}
                      />
                      Stacked
                    </span>
                    <span>
                      <input
                        type="checkbox"
                        checked={legend}
                        onChange={(event) => setLegend(event.target.checked)}
                      />
                      Show legend
                    </span>
                  </label>
                </div>
              )}

              {previewColumns.length > 0 && (
                <div className="report-builder-value-columns">
                  <span className="report-builder-value-columns-label">
                    {pieLike || widgetKind === "scatter"
                      ? "Value column"
                      : "Value columns (one series each)"}
                  </span>
                  <div className="report-builder-column-chips">
                    {previewColumns.map((column) => (
                      <label key={column} className="report-builder-chip">
                        <input
                          type={pieLike || widgetKind === "scatter" ? "radio" : "checkbox"}
                          name="value-columns"
                          checked={valueColumns.includes(column)}
                          onChange={() =>
                            pieLike || widgetKind === "scatter"
                              ? setValueColumns([column])
                              : toggleValueColumn(column)
                          }
                        />
                        {column}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
          )}

          <div className="form-actions">
            <button type="button" onClick={handlePreview}>
              Preview
            </button>
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Save report"}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}

        {previewReport && (
          <section className="report-builder-preview">
            <h3>Preview</h3>
            <div className="dashboard-widget dashboard-widget-span-2 preview-widget">
              <header className="dashboard-widget-header">
                <div>
                  <h3>{previewReport.name}</h3>
                  {previewReport.description && <p>{previewReport.description}</p>}
                </div>
              </header>
              <div className="dashboard-widget-body">
                <CustomSqlReport report={previewReport} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ReportBuilderModal;
