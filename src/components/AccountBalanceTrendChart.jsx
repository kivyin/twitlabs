import { useEffect, useMemo, useState } from "react";
import { runQuery } from "../api/dbApi";
import EChart from "./EChart";
import { formatCurrency, formatShortDate } from "../utils/format";
import { isLiabilityAccountType } from "../utils/money";
import { isSiteAccountType } from "../utils/accounts";
import { CHART_PALETTE } from "../utils/chartOptions";

const RANGE_OPTIONS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 0, label: "All time" },
];

function startOfRange(months) {
  if (!months) return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Build end-of-day running balances from opening balance + transactions.
 * Returns points chronologically for the chart.
 */
export function buildAccountBalanceSeries(openingBalance, transactions, months = 6) {
  const cutoff = startOfRange(months);
  let balance = Number(openingBalance) || 0;
  let balanceBeforeCutoff = balance;
  const points = [];

  for (const row of transactions) {
    const date = String(row.transaction_date ?? "").slice(0, 10);
    if (!date) continue;

    balance += Number(row.amount) || 0;

    if (cutoff && date < cutoff) {
      balanceBeforeCutoff = balance;
      continue;
    }

    if (points.length > 0 && points[points.length - 1].date === date) {
      points[points.length - 1].balance = balance;
    } else {
      points.push({ date, balance });
    }
  }

  if (cutoff) {
    if (points.length === 0 || points[0].date !== cutoff) {
      points.unshift({ date: cutoff, balance: balanceBeforeCutoff });
    }
  } else if (points.length === 0) {
    points.push({ date: new Date().toISOString().slice(0, 10), balance });
  }

  return points;
}

function AccountBalanceTrendChart({
  accountId,
  accountTypeName = "",
  openingBalance = 0,
}) {
  const [months, setMonths] = useState(6);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSite = isSiteAccountType(accountTypeName);
  const isLiability = isLiabilityAccountType(accountTypeName);
  const seriesLabel = isLiability ? "Amount owed" : "Balance";

  useEffect(() => {
    if (!accountId || isSite) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await runQuery({
          table: "transactions",
          sql: `
            SELECT transaction_date, amount
            FROM transactions
            WHERE account_id = ?
            ORDER BY transaction_date ASC, id ASC
          `,
          params: [accountId],
        });
        if (active) {
          setTransactions(result.rows ?? []);
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
  }, [accountId, isSite]);

  const points = useMemo(
    () => buildAccountBalanceSeries(openingBalance, transactions, months),
    [months, openingBalance, transactions]
  );

  const option = useMemo(() => {
    if (points.length === 0) return null;

    return {
      color: [CHART_PALETTE[0]],
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatCurrency(value),
      },
      grid: {
        left: 8,
        right: 12,
        top: 28,
        bottom: 8,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((point) => point.date),
        axisLabel: {
          formatter: (value) => formatShortDate(value),
          hideOverlap: true,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          formatter: (value) => formatCurrency(value),
        },
        splitLine: {
          lineStyle: { opacity: 0.25 },
        },
      },
      series: [
        {
          name: seriesLabel,
          type: "line",
          smooth: true,
          showSymbol: points.length <= 48,
          symbolSize: 6,
          areaStyle: { opacity: 0.14 },
          data: points.map((point) => point.balance),
        },
      ],
    };
  }, [points, seriesLabel]);

  if (isSite) {
    return null;
  }

  return (
    <section className="account-trend-panel">
      <div className="account-trend-head">
        <div>
          <h2>{seriesLabel} trend</h2>
          <p className="subtext">Running balance over time from posted transactions</p>
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

      {loading && <p className="subtext">Loading trend...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && transactions.length === 0 && (
        <p className="subtext account-trend-empty">
          No transactions yet — the chart will fill in as activity posts.
        </p>
      )}
      {!loading && !error && option && <EChart option={option} height={280} />}
    </section>
  );
}

export default AccountBalanceTrendChart;
