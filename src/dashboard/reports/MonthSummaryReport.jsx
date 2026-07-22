import { useEffect, useState } from "react";
import { runQuery } from "../../api/dbApi";
import ReportSkeleton from "../ReportSkeleton";
import { currentMonthLabel, formatCurrency } from "../../utils/format";

function MonthSummaryReport() {
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await runQuery({
          sql: `
            SELECT
              COALESCE(SUM(CASE WHEN LOWER(ct.name) = 'income' THEN t.amount ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN LOWER(ct.name) NOT IN ('income', 'transfer') THEN t.amount ELSE 0 END), 0) AS expense
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            JOIN category_types ct ON ct.id = c.type_id
            WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
              AND strftime('%Y-%m', t.transaction_date) = strftime('%Y-%m', 'now')
          `,
        });
        if (!active) return;
        const row = result.rows?.[0] ?? {};
        setSummary({
          income: Number(row.income) || 0,
          expense: Number(row.expense) || 0,
        });
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
  }, []);

  if (loading) return <ReportSkeleton lines={3} />;
  if (error) return <p className="report-error">{error}</p>;

  const net = summary.income + summary.expense;

  return (
    <div className="month-summary-report">
      <p className="stat-meta">{currentMonthLabel()}</p>
      <div className="month-summary-grid">
        <div>
          <span className="month-summary-label">Income</span>
          <span className="month-summary-value income">{formatCurrency(summary.income)}</span>
        </div>
        <div>
          <span className="month-summary-label">Spent</span>
          <span className="month-summary-value expense">
            {formatCurrency(Math.abs(summary.expense))}
          </span>
        </div>
        <div>
          <span className="month-summary-label">Net</span>
          <span className={`month-summary-value ${net >= 0 ? "income" : "expense"}`}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MonthSummaryReport;
