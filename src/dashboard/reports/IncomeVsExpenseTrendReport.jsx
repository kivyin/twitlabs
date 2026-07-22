import { useEffect, useState } from "react";
import { getIncomeVsExpenseTrends } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { downloadCsv } from "../../utils/reportExport";
import { formatCurrency, formatMonthLabel } from "../../utils/format";
import { getSignedAmountClass } from "../../utils/money";

function IncomeVsExpenseTrendReport({ fullPage = false }) {
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
        const result = await getIncomeVsExpenseTrends(months);
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

  const handleExport = () => {
    downloadCsv(rows, `income-vs-expense-${months}m.csv`, [
      { key: "month", label: "month" },
      { key: "income", label: "income" },
      { key: "expense", label: "expense" },
      { key: "net", label: "net" },
    ]);
  };

  if (loading) return <ReportSkeleton lines={fullPage ? 8 : 5} />;
  if (error) return <p className="report-error">{error}</p>;

  return (
    <div className="income-expense-trend-report">
      <div className="report-toolbar">
        <label className="month-picker-label">
          Months
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            {[6, 12, 18, 24].map((value) => (
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
          <p>No income or expense data in this range.</p>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Spent</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <td>{formatMonthLabel(row.month)}</td>
                  <td className="money-positive">{formatCurrency(row.income)}</td>
                  <td className="money-negative">{formatCurrency(row.expense)}</td>
                  <td className={getSignedAmountClass(row.net)}>{formatCurrency(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default IncomeVsExpenseTrendReport;
