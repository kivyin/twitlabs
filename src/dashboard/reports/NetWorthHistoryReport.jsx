import { useEffect, useMemo, useState } from "react";
import {
  captureNetWorthSnapshot,
  getNetWorth,
  getNetWorthHistory,
} from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency, formatMonthLabel } from "../../utils/format";

function NetWorthHistoryReport() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [currentResult, historyResult] = await Promise.all([
        getNetWorth(),
        getNetWorthHistory(),
      ]);
      setCurrent(currentResult);
      setHistory(historyResult.history ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maxNetWorth = useMemo(
    () => history.reduce((max, row) => Math.max(max, Number(row.net_worth) || 0), 0),
    [history]
  );

  const handleCapture = async () => {
    setCapturing(true);
    setStatus("");
    try {
      await captureNetWorthSnapshot();
      setStatus("Saved this month's net worth snapshot.");
      await load();
    } catch (captureError) {
      setError(captureError.message);
    } finally {
      setCapturing(false);
    }
  };

  if (loading) return <ReportSkeleton lines={5} />;

  return (
    <div className="net-worth-report">
      {current && (
        <div className="net-worth-summary">
          <div>
            <span className="register-summary-label">Net worth now</span>
            <strong>{formatCurrency(current.net_worth)}</strong>
          </div>
          <div>
            <span className="register-summary-label">Assets</span>
            <strong>{formatCurrency(current.assets_total)}</strong>
          </div>
          <div>
            <span className="register-summary-label">Liabilities</span>
            <strong>{formatCurrency(current.liabilities_total)}</strong>
          </div>
        </div>
      )}

      <div className="net-worth-toolbar">
        <button type="button" className="button-small" onClick={handleCapture} disabled={capturing}>
          {capturing ? "Saving..." : "Save monthly snapshot"}
        </button>
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="report-error">{error}</p>}

      {!error && history.length === 0 && (
        <div className="report-empty">
          <p>No net worth history yet. Save a snapshot to start tracking.</p>
        </div>
      )}

      {!error && history.length > 0 && (
        <ul className="bar-chart-report">
          {history.map((row) => {
            const value = Number(row.net_worth) || 0;
            const width = maxNetWorth > 0 ? Math.max((value / maxNetWorth) * 100, 4) : 0;
            return (
              <li key={row.snapshot_month}>
                <div className="bar-chart-label-row">
                  <span>{formatMonthLabel(row.snapshot_month)}</span>
                  <span>{formatCurrency(value)}</span>
                </div>
                <div className="bar-chart-track">
                  <div className="bar-chart-fill net-worth-fill" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NetWorthHistoryReport;
