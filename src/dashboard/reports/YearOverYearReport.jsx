import { useEffect, useMemo, useState } from "react";
import { getYearOverYearReport } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { downloadCsv } from "../../utils/reportExport";
import { formatCurrency } from "../../utils/format";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function YearOverYearReport({ fullPage = false }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getYearOverYearReport(month);
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
  }, [month]);

  const maxSpent = useMemo(
    () => rows.reduce((max, row) => Math.max(max, Number(row.spent) || 0), 0),
    [rows]
  );

  const monthLabel = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? "";

  const handleExport = () => {
    downloadCsv(rows, `year-over-year-${monthLabel.toLowerCase()}.csv`, [
      { key: "year", label: "year" },
      { key: "income", label: "income" },
      { key: "spent", label: "spent" },
    ]);
  };

  if (loading) return <ReportSkeleton lines={fullPage ? 6 : 4} />;
  if (error) return <p className="report-error">{error}</p>;

  return (
    <div className="year-over-year-report">
      <div className="report-toolbar">
        <label className="month-picker-label">
          Compare month
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {fullPage && rows.length > 0 && (
          <button type="button" className="button-small" onClick={handleExport}>
            Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="report-empty">
          <p>No data for {monthLabel} across prior years.</p>
        </div>
      ) : (
        <>
          <p className="stat-meta">Spending in {monthLabel} by year</p>
          <ul className="bar-chart-report">
            {rows.map((row) => {
              const spent = Number(row.spent) || 0;
              const width = maxSpent > 0 ? Math.max((spent / maxSpent) * 100, 4) : 0;
              return (
                <li key={row.year}>
                  <div className="bar-chart-label-row">
                    <span>{row.year}</span>
                    <span>{formatCurrency(spent)}</span>
                  </div>
                  <div className="bar-chart-track">
                    <div className="bar-chart-fill spending" style={{ width: `${width}%` }} />
                  </div>
                  <div className="stat-meta">Income: {formatCurrency(row.income)}</div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default YearOverYearReport;
