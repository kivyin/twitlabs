import { formatCurrency } from "./format";

export const CHART_KINDS = [
  { id: "stat", label: "Single stat", chart: false },
  { id: "table", label: "Table", chart: false },
  { id: "bars", label: "Bar list (simple)", chart: false },
  { id: "bar", label: "Bar chart", chart: true },
  { id: "line", label: "Line chart", chart: true },
  { id: "area", label: "Area chart", chart: true },
  { id: "pie", label: "Pie chart", chart: true },
  { id: "donut", label: "Donut chart", chart: true },
  { id: "scatter", label: "Scatter plot", chart: true },
];

export const CHART_PALETTE = [
  "#5b8ff9",
  "#5ad8a6",
  "#f6bd16",
  "#e8684a",
  "#6dc8ec",
  "#9270ca",
  "#ff9d4d",
  "#269a99",
  "#ff99c3",
  "#bdd2fd",
];

export function isChartKind(kind) {
  return CHART_KINDS.some((entry) => entry.id === kind && entry.chart);
}

export function parseChartConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function firstNumericColumn(rows, exclude = []) {
  if (rows.length === 0) return null;
  return (
    Object.keys(rows[0]).find((key) => {
      if (exclude.includes(key)) return false;
      const value = rows[0][key];
      return (
        typeof value === "number" ||
        (value !== null && value !== "" && !Number.isNaN(Number(value)))
      );
    }) ?? null
  );
}

function makeValueFormatter(valueFormat) {
  if (valueFormat === "number") {
    return (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);
  }
  return (value) => formatCurrency(value);
}

/**
 * Build an ECharts option object from SQL rows plus a saved chart config.
 * config: { xColumn, valueColumns: [], seriesColumn, valueFormat, stacked, legend }
 */
export function buildChartOption(kind, rows, config = {}) {
  if (!rows || rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  const xColumn = config.xColumn && columns.includes(config.xColumn) ? config.xColumn : columns[0];
  const formatValue = makeValueFormatter(config.valueFormat);

  const configuredValues = Array.isArray(config.valueColumns)
    ? config.valueColumns.filter((column) => columns.includes(column))
    : [];
  const valueColumns =
    configuredValues.length > 0
      ? configuredValues
      : [firstNumericColumn(rows, [xColumn])].filter(Boolean);

  if (valueColumns.length === 0) return null;

  const baseTooltip = {
    trigger: kind === "pie" || kind === "donut" || kind === "scatter" ? "item" : "axis",
    valueFormatter: formatValue,
  };

  if (kind === "pie" || kind === "donut") {
    const valueColumn = valueColumns[0];
    const data = rows.map((row) => ({
      name: String(row[xColumn] ?? "—"),
      value: Math.abs(Number(row[valueColumn]) || 0),
    }));

    return {
      color: CHART_PALETTE,
      tooltip: baseTooltip,
      legend: config.legend === false ? undefined : { bottom: 0, type: "scroll" },
      series: [
        {
          type: "pie",
          radius: kind === "donut" ? ["45%", "72%"] : "72%",
          center: ["50%", "44%"],
          data,
          label: { show: data.length <= 10 },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" },
          },
        },
      ],
    };
  }

  if (kind === "scatter") {
    const yColumn = valueColumns[0];
    return {
      color: CHART_PALETTE,
      tooltip: {
        trigger: "item",
        formatter: (params) =>
          `${xColumn}: ${params.value[0]}<br/>${yColumn}: ${formatValue(params.value[1])}`,
      },
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { opacity: 0.2 } } },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { opacity: 0.2 } },
        axisLabel: { formatter: formatValue },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 10,
          data: rows.map((row) => [Number(row[xColumn]) || 0, Number(row[yColumn]) || 0]),
        },
      ],
    };
  }

  // bar / line / area — category axis charts, optionally pivoted by a series column
  const seriesColumn =
    config.seriesColumn && columns.includes(config.seriesColumn) ? config.seriesColumn : null;
  const seriesType = kind === "bar" ? "bar" : "line";
  const areaStyle = kind === "area" ? {} : undefined;
  const stack = config.stacked ? "total" : undefined;

  let categories;
  let series;

  if (seriesColumn) {
    const valueColumn = valueColumns[0];
    categories = [...new Set(rows.map((row) => String(row[xColumn] ?? "—")))];
    const seriesNames = [...new Set(rows.map((row) => String(row[seriesColumn] ?? "—")))];
    const lookup = new Map();
    for (const row of rows) {
      lookup.set(
        `${String(row[xColumn] ?? "—")}|${String(row[seriesColumn] ?? "—")}`,
        Number(row[valueColumn]) || 0
      );
    }
    series = seriesNames.map((name) => ({
      name,
      type: seriesType,
      stack,
      areaStyle,
      smooth: seriesType === "line",
      data: categories.map((category) => lookup.get(`${category}|${name}`) ?? 0),
    }));
  } else {
    categories = rows.map((row) => String(row[xColumn] ?? "—"));
    series = valueColumns.map((column) => ({
      name: column,
      type: seriesType,
      stack,
      areaStyle,
      smooth: seriesType === "line",
      data: rows.map((row) => Number(row[column]) || 0),
    }));
  }

  const showLegend = config.legend !== false && series.length > 1;

  return {
    color: CHART_PALETTE,
    tooltip: baseTooltip,
    legend: showLegend ? { bottom: 0, type: "scroll" } : undefined,
    grid: { left: 8, right: 16, top: 24, bottom: showLegend ? 28 : 8, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { hideOverlap: true },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { opacity: 0.2 } },
      axisLabel: { formatter: formatValue },
    },
    series,
  };
}
