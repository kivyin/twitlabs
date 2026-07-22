import { useEffect, useState } from "react";
import { runQuery } from "../../api/dbApi";
import BrowseLink from "../../components/BrowseLink";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency, formatShortDate } from "../../utils/format";
import { getSignedAmountClass } from "../../utils/money";

function RecentTransactionsReport({ appName = "budget" }) {
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
            SELECT
              t.id,
              t.transaction_date,
              COALESCE(t.description, 'Transaction') AS description,
              t.amount,
              a.name AS account_name,
              c.name AS category_name
            FROM transactions t
            JOIN accounts a ON a.id = t.account_id
            JOIN categories c ON c.id = t.category_id
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT 8
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

  if (loading) return <ReportSkeleton lines={5} />;
  if (error) return <p className="report-error">{error}</p>;

  if (rows.length === 0) {
    return (
      <div className="report-empty">
        <p>No transactions recorded yet.</p>
        <BrowseLink to={`/app/${appName}/transactions/new`} className="report-empty-link">
          Record a transaction
        </BrowseLink>
      </div>
    );
  }

  return (
    <ul className="transaction-list-report">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="transaction-list-main">
            <span className="transaction-list-title">{row.description}</span>
            <span className="transaction-list-meta">
              {formatShortDate(row.transaction_date)} · {row.account_name} · {row.category_name}
            </span>
          </div>
          <span className={`transaction-list-amount ${getSignedAmountClass(row.amount)}`}>
            {formatCurrency(row.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default RecentTransactionsReport;
