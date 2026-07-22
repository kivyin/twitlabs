import { useEffect, useMemo, useState } from "react";
import { getCashFlowForecast } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { formatCurrency } from "../../utils/format";

const HORIZON_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

function CashFlowForecastReport() {
  const [days, setDays] = useState(90);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getCashFlowForecast(days);
        if (active) {
          setForecast(result);
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
  }, [days]);

  const chartPoints = useMemo(() => {
    if (!forecast?.points?.length) {
      return [];
    }
    const step = Math.max(Math.floor(forecast.points.length / 12), 1);
    return forecast.points.filter((_, index) => index % step === 0 || index === forecast.points.length - 1);
  }, [forecast]);

  const maxBalance = useMemo(
    () => chartPoints.reduce((max, point) => Math.max(max, Number(point.balance) || 0), 0),
    [chartPoints]
  );
  const minBalance = useMemo(
    () => chartPoints.reduce((min, point) => Math.min(min, Number(point.balance) || 0), Infinity),
    [chartPoints]
  );

  if (loading) return <ReportSkeleton lines={5} />;

  return (
    <div className="cash-flow-report">
      <div className="cash-flow-toolbar">
        <label className="month-picker-label">
          Horizon
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {HORIZON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="report-error">{error}</p>}

      {forecast && !error && (
        <>
          <div className="cash-flow-summary">
            <div>
              <span className="register-summary-label">Starting</span>
              <strong>{formatCurrency(forecast.starting_balance)}</strong>
            </div>
            <div>
              <span className="register-summary-label">Projected end</span>
              <strong>{formatCurrency(forecast.ending_balance)}</strong>
            </div>
            <div>
              <span className="register-summary-label">Lowest point</span>
              <strong>{formatCurrency(forecast.lowest_balance)}</strong>
              <span className="stat-meta"> on {forecast.lowest_date}</span>
            </div>
          </div>

          {forecast.lowest_balance < 0 && (
            <p className="bills-due-alert">
              Projected balance goes negative on {forecast.lowest_date}.
            </p>
          )}

          <ul className="cash-flow-chart">
            {chartPoints.map((point) => {
              const balance = Number(point.balance) || 0;
              const range = Math.max(maxBalance - minBalance, 1);
              const height = Math.max(((balance - minBalance) / range) * 100, 4);
              return (
                <li key={point.date} title={`${point.date}: ${formatCurrency(balance)}`}>
                  <div className="cash-flow-bar-wrap">
                    <div
                      className={`cash-flow-bar ${balance < 0 ? "negative" : ""}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="cash-flow-date">{point.date.slice(5)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default CashFlowForecastReport;
