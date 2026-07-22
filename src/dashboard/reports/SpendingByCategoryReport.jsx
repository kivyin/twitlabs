import { useEffect, useMemo, useState } from "react";
import { runQuery } from "../../api/dbApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";

function SpendingByCategoryReport() {
  const [rows, setRows] = useState([]);
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
            SELECT c.name AS label, COALESCE(SUM(ABS(line.amount)), 0) AS value
            FROM (
              SELECT ts.category_id, ts.amount, t.transaction_date
              FROM transactions t
              JOIN transaction_splits ts ON ts.transaction_id = t.id
              WHERE t.transaction_kind = 'split'
              UNION ALL
              SELECT t.category_id, t.amount, t.transaction_date
              FROM transactions t
              WHERE COALESCE(t.transaction_kind, 'standard') = 'standard'
            ) line
            JOIN categories c ON c.id = line.category_id
            JOIN category_types ct ON ct.id = c.type_id
            WHERE LOWER(ct.name) NOT IN ('income', 'transfer')
              AND strftime('%Y-%m', line.transaction_date) = strftime('%Y-%m', 'now')
            GROUP BY c.id, c.name
            ORDER BY value DESC
            LIMIT 6
          `,
        });
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
  }, []);

  const maxValue = useMemo(() => {
    return rows.reduce((max, row) => Math.max(max, Number(row.value) || 0), 0);
  }, [rows]);

  if (loading) return <ReportSkeleton lines={5} />;
  if (error) return <p className="report-error">{error}</p>;

  if (rows.length === 0) {
    return (
      <div className="report-empty">
        <p>No spending data for this month yet.</p>
      </div>
    );
  }

  return (
    <ul className="bar-chart-report">
      {rows.map((row) => {
        const value = Number(row.value) || 0;
        const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0;

        return (
          <li key={row.label}>
            <div className="bar-chart-label-row">
              <span>{row.label}</span>
              <span>{formatCurrency(value)}</span>
            </div>
            <div className="bar-chart-track">
              <div className="bar-chart-fill" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default SpendingByCategoryReport;
