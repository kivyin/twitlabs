import { useEffect, useState } from "react";
import { runQuery } from "../../api/dbApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";

function TotalBalanceReport() {
  const [total, setTotal] = useState(null);
  const [accountCount, setAccountCount] = useState(0);
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
              COALESCE(SUM(balance), 0) AS total,
              COUNT(*) AS account_count
            FROM accounts
          `,
        });
        if (!active) return;
        const row = result.rows?.[0] ?? {};
        setTotal(Number(row.total) || 0);
        setAccountCount(Number(row.account_count) || 0);
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

  if (loading) return <ReportSkeleton lines={2} />;
  if (error) return <p className="report-error">{error}</p>;

  return (
    <div className="stat-report">
      <p className="stat-value">{formatCurrency(total)}</p>
      <p className="stat-meta">
        {accountCount} account{accountCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default TotalBalanceReport;
