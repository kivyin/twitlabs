import { useEffect, useState } from "react";
import { getBudgetVsActual } from "../../api/budgetApi";
import BrowseLink from "../../components/BrowseLink";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency, formatMonthLabel, currentMonthValue } from "../../utils/format";

function BudgetVsActualReport({ appName = "budget" }) {
  const [month, setMonth] = useState(currentMonthValue());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getBudgetVsActual(month);
        if (active) {
          setRows(result.rows ?? []);
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
  }, [month]);

  if (loading) return <ReportSkeleton lines={5} />;

  return (
    <div className="budget-vs-actual-report">
      <div className="budget-vs-actual-toolbar">
        <label className="month-picker-label">
          Month
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <span className="stat-meta">{formatMonthLabel(month)}</span>
      </div>

      {error && <p className="report-error">{error}</p>}

      {!error && rows.length === 0 && (
        <div className="report-empty">
          <p>No budgets set for this month.</p>
          <BrowseLink to={`/app/${appName}/budgets/new`} className="report-empty-link">
            Create a budget
          </BrowseLink>
        </div>
      )}

      {!error && rows.length > 0 && (
        <ul className="budget-progress-list">
          {rows.map((row) => {
            const percent = Math.min((row.percent_used ?? 0) * 100, 100);
            const overBudget = row.over_budget;

            return (
              <li key={row.budget_id} className={overBudget ? "over-budget" : undefined}>
                <div className="budget-progress-head">
                  <span>{row.category_name}</span>
                  <span>
                    {formatCurrency(row.spent_amount)} / {formatCurrency(row.budget_amount)}
                  </span>
                </div>
                <div className="bar-chart-track">
                  <div
                    className={`bar-chart-fill ${overBudget ? "over" : ""}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="budget-progress-meta">
                  <span>
                    {overBudget ? "Over budget" : "Remaining"}:{" "}
                    <strong className={overBudget ? "expense" : undefined}>
                      {formatCurrency(Math.abs(row.remaining_amount))}
                    </strong>
                  </span>
                  <span>{Math.round((row.percent_used ?? 0) * 100)}% used</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default BudgetVsActualReport;
