import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { calculateDebtPayoff } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";

function DebtPlannerReport({ appName = "budget" }) {
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState("100");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const payload = await calculateDebtPayoff({
          strategy,
          extraPayment: Number(extraPayment) || 0,
        });
        if (active) {
          setResult(payload);
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
  }, [strategy, extraPayment]);

  if (loading && !result) return <ReportSkeleton lines={4} />;

  return (
    <div className="debt-planner-report">
      <div className="debt-planner-controls">
        <label>
          Strategy
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
            <option value="avalanche">Avalanche (highest APR first)</option>
            <option value="snowball">Snowball (smallest balance first)</option>
          </select>
        </label>
        <label>
          Extra monthly payment
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraPayment}
            onChange={(event) => setExtraPayment(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="report-error">{error}</p>}

      {result && !error && result.debts.length === 0 && (
        <div className="report-empty">
          <p>No credit card debt found.</p>
          <Link to={`/app/${appName}/accounts`} className="report-empty-link">
            Review accounts
          </Link>
        </div>
      )}

      {result && result.debts.length > 0 && (
        <>
          <div className="debt-planner-summary">
            <div>
              <span className="register-summary-label">Debt-free in</span>
              <strong>{result.months} months</strong>
            </div>
            <div>
              <span className="register-summary-label">Total interest</span>
              <strong>{formatCurrency(result.total_interest)}</strong>
            </div>
          </div>

          <ul className="debt-payoff-order">
            {result.debts.map((debt, index) => (
              <li key={debt.id}>
                <span>{index + 1}.</span>
                <span>{debt.name}</span>
                <span>{formatCurrency(debt.starting_balance)}</span>
                <span className="stat-meta">{debt.apr ? `${debt.apr}% APR` : "No APR set"}</span>
              </li>
            ))}
          </ul>

          {result.debts.some((debt) => !debt.apr) && (
            <p className="subtext">
              Set APR and minimum payment on credit card accounts for more accurate projections.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default DebtPlannerReport;
