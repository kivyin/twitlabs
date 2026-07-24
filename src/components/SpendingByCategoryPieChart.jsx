import { useEffect, useMemo, useState } from "react";
import { runQuery } from "../api/dbApi";
import EChart from "./EChart";
import { formatCurrency } from "../utils/format";
import { shouldShowSpendingByCategoryChart } from "../utils/accounts";
import { buildChartOption } from "../utils/chartOptions";

const RANGE_OPTIONS = [
  { value: 1, label: "This month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 0, label: "All time" },
];

function startOfRange(months) {
  if (!months) return null;
  if (months === 1) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}-01`;
  }
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Pie chart of expense spending by category.
 * Pass accountId to scope to one account; omit for all accounts (transactions page).
 * Hidden for loan and site account types when accountTypeName is provided.
 */
function SpendingByCategoryPieChart({
  accountId = null,
  accountTypeName = "",
  title = "Spending by category",
  defaultMonths = 1,
  height = 300,
}) {
  const [months, setMonths] = useState(defaultMonths);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visible = accountId ? shouldShowSpendingByCategoryChart(accountTypeName) : true;

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const cutoff = startOfRange(months);
        const params = [];
        const filters = ["LOWER(ct.name) NOT IN ('income', 'transfer')"];

        if (accountId != null && accountId !== "") {
          filters.push("line.account_id = ?");
          params.push(accountId);
        }

        if (cutoff) {
          filters.push("line.transaction_date >= ?");
          params.push(cutoff);
        }

        const result = await runQuery({
          table: "transactions",
          sql: `
            SELECT c.name AS label, COALESCE(SUM(ABS(line.amount)), 0) AS value
            FROM (
              SELECT ts.category_id, ts.amount, t.transaction_date, t.account_id
              FROM transactions t
              JOIN transaction_splits ts ON ts.transaction_id = t.id
              WHERE t.transaction_kind = 'split'
              UNION ALL
              SELECT t.category_id, t.amount, t.transaction_date, t.account_id
              FROM transactions t
              WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
            ) line
            JOIN categories c ON c.id = line.category_id
            JOIN category_types ct ON ct.id = c.type_id
            WHERE ${filters.join(" AND ")}
            GROUP BY c.id, c.name
            HAVING value > 0
            ORDER BY value DESC
            LIMIT 12
          `,
          params,
        });

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
  }, [accountId, months, visible]);

  const option = useMemo(() => {
    if (rows.length === 0) return null;
    return buildChartOption("pie", rows, {
      xColumn: "label",
      valueColumns: ["value"],
      valueFormat: "currency",
      legend: true,
      showLabels: true,
    });
  }, [rows]);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [rows]
  );

  if (!visible) {
    return null;
  }

  return (
    <section className="spending-category-pie">
      <div className="account-trend-head">
        <div>
          <h2>{title}</h2>
          <p className="subtext">
            Expense categories
            {total > 0 ? ` · ${formatCurrency(total)} total` : ""}
          </p>
        </div>
        <label className="month-picker-label">
          Range
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="subtext">Loading spending...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="subtext account-trend-empty">No expense spending in this range.</p>
      )}
      {!loading && !error && option && <EChart option={option} height={height} />}
    </section>
  );
}

export default SpendingByCategoryPieChart;
