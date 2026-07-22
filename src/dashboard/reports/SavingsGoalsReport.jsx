import { useEffect, useState } from "react";
import { getGoals, syncGoalFromAccount } from "../../api/budgetApi";
import BrowseLink from "../../components/BrowseLink";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";

function SavingsGoalsReport({ appName = "budget" }) {
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);

  const loadGoals = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getGoals();
      setGoals(result.goals ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleSync = async (goalId) => {
    setSyncingId(goalId);
    try {
      await syncGoalFromAccount(goalId);
      await loadGoals();
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) return <ReportSkeleton lines={4} />;

  return (
    <div className="savings-goals-report">
      {error && <p className="report-error">{error}</p>}

      {!error && goals.length === 0 && (
        <div className="report-empty">
          <p>No savings goals yet.</p>
          <BrowseLink to={`/app/${appName}/goals/new`} className="report-empty-link">
            Create a goal
          </BrowseLink>
        </div>
      )}

      {!error && goals.length > 0 && (
        <ul className="budget-progress-list">
          {goals.map((goal) => {
            const percent = Math.min((goal.percent_complete ?? 0) * 100, 100);
            return (
              <li key={goal.id} className={goal.is_complete ? "goal-complete" : undefined}>
                <div className="budget-progress-head">
                  <span>{goal.name}</span>
                  <span>
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </span>
                </div>
                <div className="bar-chart-track">
                  <div className="bar-chart-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="goal-meta-row">
                  <span className="stat-meta">
                    {goal.is_complete
                      ? "Goal reached"
                      : `${formatCurrency(goal.remaining_amount)} to go`}
                    {goal.target_date ? ` · Target ${goal.target_date}` : ""}
                  </span>
                  {goal.account_id && (
                    <button
                      type="button"
                      className="button-small"
                      onClick={() => handleSync(goal.id)}
                      disabled={syncingId === goal.id}
                    >
                      {syncingId === goal.id ? "Syncing..." : "Sync from account"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SavingsGoalsReport;
