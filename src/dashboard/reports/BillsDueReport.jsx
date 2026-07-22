import { useEffect, useState } from "react";
import { getUpcomingBills, postDueRecurringTransactions } from "../../api/budgetApi";
import BrowseLink from "../../components/BrowseLink";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";
import { getSignedAmountClass } from "../../utils/money";

function BillsDueReport({ appName = "budget" }) {
  const [bills, setBills] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState("");

  const loadBills = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getUpcomingBills(30);
      setBills(result.bills ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handlePostDue = async () => {
    setPosting(true);
    setStatus("");
    setError("");
    try {
      const result = await postDueRecurringTransactions();
      setStatus(
        result.posted_count > 0
          ? `Posted ${result.posted_count} recurring bill${result.posted_count === 1 ? "" : "s"}.`
          : "No due recurring bills to post."
      );
      await loadBills();
    } catch (postError) {
      setError(postError.message);
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <ReportSkeleton lines={4} />;

  const dueNowCount = bills.filter((bill) => bill.next_due_date <= new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="bills-due-report">
      <div className="bills-due-toolbar">
        <span className="stat-meta">Next 30 days</span>
        <button type="button" className="button-primary button-small" onClick={handlePostDue} disabled={posting}>
          {posting ? "Posting..." : "Post due bills"}
        </button>
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="report-error">{error}</p>}

      {!error && bills.length === 0 && (
        <div className="report-empty">
          <p>No upcoming recurring bills.</p>
          <BrowseLink to={`/app/${appName}/recurring_transactions/new`} className="report-empty-link">
            Add a recurring bill
          </BrowseLink>
        </div>
      )}

      {!error && bills.length > 0 && (
        <>
          {dueNowCount > 0 && (
            <p className="bills-due-alert">
              {dueNowCount} bill{dueNowCount === 1 ? "" : "s"} due now or overdue.
            </p>
          )}
          <ul className="bills-due-list">
            {bills.map((bill) => (
              <li key={bill.id}>
                <div className="bills-due-head">
                  <strong>{bill.description || bill.payee_name || bill.category_name}</strong>
                  <span className={getSignedAmountClass(bill.amount)}>{formatCurrency(bill.amount)}</span>
                </div>
                <div className="bills-due-meta">
                  <span>{bill.next_due_date}</span>
                  <span>{bill.account_name}</span>
                  <span>{bill.frequency}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default BillsDueReport;
