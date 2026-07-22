import { useEffect, useMemo, useState } from "react";
import { getSpendingTrends } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { downloadCsv } from "../../utils/reportExport";
import { formatCurrency, formatMonthLabel } from "../../utils/format";

function SpendingTrendsReport({ fullPage = false }) {
  const [months, setMonths] = useState(fullPage ? 12 : 6);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getSpendingTrends(months);
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
  }, [months]);

  const maxSpent = useMemo(
    () => rows.reduce((max, row) => Math.max(max, Number(row.spent) || 0), 0),
    [rows]
  );

  const handleExport = () => {
    downloadCsv(
      rows.map((row) => ({
        month: row.month,
        spent: row.spent,
      })),
      `spending-trends-${months}m.csv`,
      [
        { key: "month", label: "month" },
        { key: "spent", label: "spent" },
      ]
    );
  };

  if (loading) return <ReportSkeleton lines={fullPage ? 8 : 5} />;
  if (error) return <p className="report-error">{error}</p>;

  return (
    <div className="spending-trends-report">
      <div className="report-toolbar">
        <label className="month-picker-label">
          Months
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            {[6, 12, 18, 24, 36].map((value) => (
              <option key={value} value={value}>
                Last {value} months
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
          <p>No spending data in this range.</p>
        </div>
      ) : (
        <ul className="bar-chart-report">
          {rows.map((row) => {
            const spent = Number(row.spent) || 0;
            const width = maxSpent > 0 ? Math.max((spent / maxSpent) * 100, 4) : 0;
            return (
              <li key={row.month}>
                <div className="bar-chart-label-row">
                  <span>{formatMonthLabel(row.month)}</span>
                  <span>{formatCurrency(spent)}</span>
                </div>
                <div className="bar-chart-track">
                  <div className="bar-chart-fill spending" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SpendingTrendsReport;
