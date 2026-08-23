import { useEffect, useMemo, useState } from "react";
import { runDashboardReport } from "../../api/dashboardApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";
import EChart from "../../components/EChart";
import { buildChartOption, isChartKind, parseChartConfig } from "../../utils/chartOptions";

const EMPTY_COLUMNS = [];

function pickNumericColumn(row, preferredColumn) {
  if (preferredColumn && row[preferredColumn] !== undefined) {
    return preferredColumn;
  }

  return Object.keys(row).find((key) => {
    const value = row[key];
    return typeof value === "number" || (value !== null && value !== "" && !Number.isNaN(Number(value)));
  });
}

function CustomSqlReport({
  report,
  fullPage = false,
  previewRows = null,
  previewColumns = EMPTY_COLUMNS,
}) {
  const [rows, setRows] = useState(previewRows ?? []);
  const [resultColumns, setResultColumns] = useState(previewColumns);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(previewRows === null);

  useEffect(() => {
    if (previewRows !== null) {
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await runDashboardReport({
          application: report.application,
          sql: report.sql,
        });
        if (active) {
          setRows(result.rows ?? []);
          setResultColumns((result.columns ?? []).map((column) => column.name));
        }
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
  }, [previewColumns, previewRows, report.application, report.sql]);

  const displayRows = previewRows ?? rows;
  const displayResultColumns = previewRows !== null ? previewColumns : resultColumns;
  const columns = useMemo(() => {
    if (displayResultColumns.length > 0) return displayResultColumns;
    return displayRows.length > 0 ? Object.keys(displayRows[0]) : [];
  }, [displayResultColumns, displayRows]);

  if (previewRows === null && loading) return <ReportSkeleton lines={4} />;
  if (error) return <p className="report-error">{error}</p>;

  if (displayRows.length === 0) {
    return <div className="report-empty"><p>Query returned no rows.</p></div>;
  }

  if (isChartKind(report.widget_kind)) {
    const config = parseChartConfig(report.chart_config);
    const option = buildChartOption(report.widget_kind, displayRows, config);
    if (!option) {
      return <p className="report-error">No numeric column found to chart.</p>;
    }
    return <EChart option={option} height={fullPage ? 440 : 280} />;
  }

  if (report.widget_kind === "stat") {
    const row = displayRows[0];
    const valueColumn = pickNumericColumn(row, report.value_column);
    const value = valueColumn ? row[valueColumn] : Object.values(row)[0];

    return (
      <div className="stat-report">
        <p className="stat-value">
          {typeof value === "number" || !Number.isNaN(Number(value))
            ? formatCurrency(Number(value))
            : String(value ?? "—")}
        </p>
      </div>
    );
  }

  if (report.widget_kind === "bars") {
    const labelColumn = report.label_column || columns[0];
    const valueColumn = report.value_column || pickNumericColumn(displayRows[0], null);
    const maxValue = displayRows.reduce(
      (max, row) => Math.max(max, Number(row[valueColumn]) || 0),
      0
    );

    return (
      <ul className="bar-chart-report">
        {displayRows.map((row, index) => {
          const value = Number(row[valueColumn]) || 0;
          const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0;

          return (
            <li key={`${row[labelColumn]}-${index}`}>
              <div className="bar-chart-label-row">
                <span>{String(row[labelColumn] ?? "—")}</span>
                <span>{formatCurrency(value)}</span>
              </div>
              <div className="bar-chart-track">
                <div className="bar-chart-fill custom" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const config = parseChartConfig(report.chart_config);
  const visibleColumns =
    report.widget_kind === "list" && Array.isArray(config.visibleColumns)
      ? config.visibleColumns.filter((column) => columns.includes(column))
      : columns;
  const displayColumns = visibleColumns.length > 0 ? visibleColumns : columns;

  return (
    <div className="report-table-wrap">
      {report.widget_kind === "list" && config.title && (
        <h3 className="report-list-title">{config.title}</h3>
      )}
      <table className={`report-table${report.widget_kind === "list" ? " report-list" : ""}`}>
        <thead>
          <tr>
            {displayColumns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index}>
              {displayColumns.map((column) => (
                <td key={column}>{row[column] === null ? "—" : String(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomSqlReport;
