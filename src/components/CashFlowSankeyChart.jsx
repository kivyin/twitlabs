import { useEffect, useMemo, useState } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { getCashFlowSankey } from "../api/budgetApi";
import { selectRows } from "../api/dbApi";
import ReportSkeleton from "../dashboard/ReportSkeleton";
import { useTheme } from "../context/ThemeContext";
import { currentMonthValue, formatCurrency, formatMonthLabel } from "../utils/format";
import { rowsToSankeyData, SANKEY_HUB_ID } from "../utils/sankeyData";

const INCOME_COLORS = ["#047857", "#0d9488", "#059669", "#14b8a6", "#34d399", "#6ee7b7"];
const EXPENSE_COLORS = ["#dc2626", "#ea580c", "#d97706", "#e11d48", "#f97316", "#fb7185"];
const HUB_COLOR = "#2563eb";

function readCssColor(variableName, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
}

function buildNodeColorMap(nodes) {
  const colors = {};
  let incomeIndex = 0;
  let expenseIndex = 0;

  for (const node of nodes) {
    if (node.id === SANKEY_HUB_ID) {
      colors[node.id] = HUB_COLOR;
    } else if (String(node.id).startsWith("income:")) {
      colors[node.id] = INCOME_COLORS[incomeIndex % INCOME_COLORS.length];
      incomeIndex += 1;
    } else {
      colors[node.id] = EXPENSE_COLORS[expenseIndex % EXPENSE_COLORS.length];
      expenseIndex += 1;
    }
  }

  return colors;
}

function CashFlowSankeyChart({
  accountId: controlledAccountId,
  onAccountChange,
  month: controlledMonth,
  onMonthChange,
  compact = false,
  fullPage = false,
  showMonthPicker = true,
  showAccountFilter = false,
  title = null,
  defaultMonth = null,
}) {
  const { resolvedTheme } = useTheme();
  const [internalMonth, setInternalMonth] = useState(defaultMonth || currentMonthValue());
  const [internalAccountId, setInternalAccountId] = useState("");
  const [accountOptions, setAccountOptions] = useState([]);

  const month = controlledMonth ?? internalMonth;
  const setMonth = onMonthChange ?? setInternalMonth;
  const isAccountControlled = controlledAccountId !== undefined;
  const accountId = isAccountControlled
    ? controlledAccountId === "" || controlledAccountId == null
      ? null
      : controlledAccountId
    : internalAccountId || null;
  const setAccountId = onAccountChange ?? setInternalAccountId;

  const [payload, setPayload] = useState({ income: [], expenses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!showAccountFilter) return undefined;
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
  }, [showAccountFilter]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getCashFlowSankey({ month, accountId });
        if (active) {
          setPayload(result);
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
  }, [accountId, month]);

  const chartData = useMemo(
    () => rowsToSankeyData({ income: payload.income, expenses: payload.expenses }),
    [payload.expenses, payload.income]
  );

  const nodeColors = useMemo(() => buildNodeColorMap(chartData.nodes), [chartData.nodes]);

  const themeColors = useMemo(() => {
    void resolvedTheme;
    return {
      text: readCssColor("--text", "#0b1220"),
      muted: readCssColor("--muted-text", "#5b6678"),
      surface: readCssColor("--surface", "#ffffff"),
      border: readCssColor("--border", "#e4e9f2"),
    };
  }, [resolvedTheme]);

  const categoryCount = (payload.income?.length || 0) + (payload.expenses?.length || 0);
  const chartHeight = fullPage
    ? Math.max(420, 180 + categoryCount * 22)
    : compact
      ? Math.max(260, 140 + categoryCount * 18)
      : Math.max(320, 160 + categoryCount * 20);
  const nodeSpacing = compact
    ? Math.max(10, Math.min(18, Math.floor(240 / Math.max(categoryCount, 1))))
    : Math.max(12, Math.min(22, Math.floor(300 / Math.max(categoryCount, 1))));

  const showFilters = showMonthPicker || showAccountFilter;

  if (loading) {
    return <ReportSkeleton lines={compact ? 4 : 6} />;
  }

  return (
    <div className={`cash-flow-sankey${compact ? " cash-flow-sankey-compact" : ""}`}>
      {title && <h3 className="sankey-panel-title">{title}</h3>}

      {showFilters && (
        <div className="budget-vs-actual-toolbar sankey-toolbar">
          {showMonthPicker && (
            <label className="month-picker-label">
              Month
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </label>
          )}
          {showAccountFilter && (
            <label className="month-picker-label">
              Account
              <select
                value={accountId == null || accountId === "" ? "" : String(accountId)}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">All accounts</option>
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="stat-meta">{formatMonthLabel(month)}</span>
        </div>
      )}

      {error && <p className="report-error">{error}</p>}

      {!error && chartData.nodes.length === 0 && (
        <div className="report-empty">
          <p>
            {accountId
              ? "No categorized income or spending for this account in this month."
              : "No categorized income or spending for this month."}
          </p>
        </div>
      )}

      {!error && chartData.nodes.length > 0 && (
        <>
          <div className="sankey-summary">
            <span>
              Income <strong className="money-positive">{formatCurrency(payload.income_total)}</strong>
            </span>
            <span>
              Spending <strong className="money-negative">{formatCurrency(payload.expense_total)}</strong>
            </span>
            <span className="stat-meta">
              {payload.income?.length || 0} income · {payload.expenses?.length || 0} expense
              categories
            </span>
          </div>
          <div className="sankey-chart-wrap" style={{ height: chartHeight }}>
            <ResponsiveSankey
              data={chartData}
              margin={{ top: 12, right: compact ? 96 : 120, bottom: 12, left: compact ? 96 : 120 }}
              align="justify"
              colors={(node) => nodeColors[node.id] ?? HUB_COLOR}
              nodeOpacity={1}
              nodeHoverOthersOpacity={0.35}
              nodeThickness={18}
              nodeSpacing={nodeSpacing}
              nodeBorderWidth={0}
              nodeBorderRadius={3}
              linkOpacity={0.45}
              linkHoverOthersOpacity={0.1}
              linkContract={2}
              enableLinkGradient
              label={(node) => node.nodeLabel ?? node.id}
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={12}
              labelTextColor={themeColors.text}
              theme={{
                labels: {
                  text: {
                    fontSize: compact ? 11 : 12,
                    fontWeight: 600,
                    fill: themeColors.text,
                  },
                },
                tooltip: {
                  container: {
                    background: themeColors.surface,
                    color: themeColors.text,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  },
                },
              }}
              valueFormat={(value) => formatCurrency(value)}
            />
          </div>
          <p className="sankey-footnote subtext">
            Shows income and expense categories with activity this month. Transfers are excluded; Credit Card and other non-income types count as spending.
          </p>
        </>
      )}
    </div>
  );
}

export default CashFlowSankeyChart;
