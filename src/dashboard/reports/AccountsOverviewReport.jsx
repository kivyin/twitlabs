import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { runQuery } from "../../api/dbApi";
import BrowseLink from "../../components/BrowseLink";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";
import { getAvailableCredit, getSignedAmountClass, isLiabilityAccountType } from "../../utils/money";

function AccountsOverviewReport({ appName = "budget" }) {
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
              a.id,
              a.name,
              at.name AS type_name,
              COALESCE(a.balance, 0) AS balance,
              a.credit_limit
            FROM accounts a
            JOIN account_types at ON at.id = a.account_type_id
            WHERE at.name != 'Site account'
            ORDER BY COALESCE(a.sort_order, a.id) ASC, a.name
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

  if (loading) return <ReportSkeleton lines={4} />;
  if (error) return <p className="report-error">{error}</p>;

  if (rows.length === 0) {
    return (
      <div className="report-empty">
        <p>No accounts yet.</p>
        <BrowseLink to={`/app/${appName}/accounts/new`} className="report-empty-link">
          Add your first account
        </BrowseLink>
      </div>
    );
  }

  return (
    <ul className="account-list-report">
      {rows.map((row) => {
        const isLiability = isLiabilityAccountType(row.type_name);
        const availableCredit = getAvailableCredit(row.balance, row.credit_limit);

        return (
        <li key={row.id}>
          <Link to={`/app/${appName}/accounts/${row.id}/register`} className="account-list-link">
            <div className="account-list-main">
              <span className="account-list-name">{row.name}</span>
              <span className="account-list-type">
                {row.type_name}
                {isLiability && availableCredit !== null
                  ? ` · ${formatCurrency(availableCredit)} available`
                  : ""}
              </span>
            </div>
            <span className={`account-list-balance ${getSignedAmountClass(row.balance)}`}>
              {isLiability ? `${formatCurrency(row.balance)} owed` : formatCurrency(row.balance)}
            </span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}

export default AccountsOverviewReport;
