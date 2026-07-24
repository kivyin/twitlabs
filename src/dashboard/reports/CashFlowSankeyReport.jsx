import { useEffect, useState } from "react";
import { selectRows } from "../../api/dbApi";
import CashFlowSankeyChart from "../../components/CashFlowSankeyChart";
import { currentMonthValue, shiftMonthValue } from "../../utils/format";

function CashFlowSankeyReport({ fullPage = false }) {
  const thisMonth = currentMonthValue();
  const lastMonthDefault = shiftMonthValue(thisMonth, -1);

  const [accountId, setAccountId] = useState("");
  const [leftMonth, setLeftMonth] = useState(lastMonthDefault);
  const [rightMonth, setRightMonth] = useState(thisMonth);
  const [accountOptions, setAccountOptions] = useState([]);

  useEffect(() => {
    let active = true;
    selectRows({ table: "accounts", limit: 500 })
      .then((result) => {
        if (!active) return;
        const rows = result.rows ?? [];
        setAccountOptions(
          rows
            .map((row) => ({
              value: String(row.id),
              label: row.name || `Account ${row.id}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      })
      .catch(() => {
        if (active) setAccountOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolvedAccountId = accountId || null;

  return (
    <div className={`cash-flow-sankey-report${fullPage ? " is-full-page" : ""}`}>
      <div className="budget-vs-actual-toolbar sankey-toolbar sankey-shared-filters">
        <label className="month-picker-label">
          Account
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">All accounts</option>
            {accountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="stat-meta">
          Left defaults to last month, right to this month. Change either date independently.
        </span>
      </div>

      <div className="sankey-compare-grid">
        <div className="sankey-compare-panel">
          <CashFlowSankeyChart
            title="Last month"
            accountId={resolvedAccountId}
            month={leftMonth}
            onMonthChange={setLeftMonth}
            showMonthPicker
            showAccountFilter={false}
            fullPage={fullPage}
            compact={!fullPage}
          />
        </div>
        <div className="sankey-compare-panel">
          <CashFlowSankeyChart
            title="This month"
            accountId={resolvedAccountId}
            month={rightMonth}
            onMonthChange={setRightMonth}
            showMonthPicker
            showAccountFilter={false}
            fullPage={fullPage}
            compact={!fullPage}
          />
        </div>
      </div>
    </div>
  );
}

export default CashFlowSankeyReport;
