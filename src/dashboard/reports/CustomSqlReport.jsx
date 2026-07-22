import { useEffect, useMemo, useState } from "react";
import { runQuery } from "../../api/dbApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";
import EChart from "../../components/EChart";
import { buildChartOption, isChartKind, parseChartConfig } from "../../utils/chartOptions";

function pickNumericColumn(row, preferredColumn) {
  if (preferredColumn && row[preferredColumn] !== undefined) {
    return preferredColumn;
  }

  return Object.keys(row).find((key) => {
    const value = row[key];
    return typeof value === "number" || (value !== null && value !== "" && !Number.isNaN(Number(value)));
  });
}

function CustomSqlReport({ report, fullPage = false }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await runQuery({ sql: report.sql });
        if (active) setRows(result.rows ?? []);
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
  }, [report.sql]);

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  if (loading) return <ReportSkeleton lines={4} />;
  if (error) return <p className="report-error">{error}</p>;

  if (rows.length === 0) {
    return <div className="report-empty"><p>Query returned no rows.</p></div>;
  }

  if (isChartKind(report.widget_kind)) {
    const config = parseChartConfig(report.chart_config);
    const option = buildChartOption(report.widget_kind, rows, config);
    if (!option) {
      return <p className="report-error">No numeric column found to chart.</p>;
    }
    return <EChart option={option} height={fullPage ? 440 : 280} />;
  }

  if (report.widget_kind === "stat") {
    const row = rows[0];
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
    const valueColumn = report.value_column || pickNumericColumn(rows[0], null);
    const maxValue = rows.reduce(
      (max, row) => Math.max(max, Number(row[valueColumn]) || 0),
      0
    );

    return (
      <ul className="bar-chart-report">
        {rows.map((row, index) => {
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

  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
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
