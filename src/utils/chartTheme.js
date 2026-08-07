import { CHART_PALETTE as DEFAULT_CHART_PALETTE } from "./chartOptions";

/** High-contrast LCARS series colors (orange / gold / teal / blue family). */
export const LCARS_CHART_PALETTE = [
  "#ff9933",
  "#ffd580",
  "#66ccaa",
  "#8da6ff",
  "#b0b8ff",
  "#cc6699",
  "#ffcc99",
  "#ff5555",
  "#d2a679",
  "#66ff99",
];

export const IRONMAN_CHART_PALETTE = [
  "#29d7ff",
  "#ff7a1a",
  "#3dffb0",
  "#7aefff",
  "#ffb347",
  "#4aa8ff",
  "#ff5a3d",
  "#a8fff0",
  "#c8e7ff",
  "#ff9a2e",
];

function paletteFromCss(fallback) {
  if (typeof window === "undefined") return fallback;
  const fromCss = [];
  for (let i = 1; i <= 10; i += 1) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--chart-${i}`)
      .trim();
    if (value) fromCss.push(value);
  }
  return fromCss.length > 0 ? fromCss : fallback;
}

export function getChartPalette(themeName = "") {
  if (themeName === "lcars") {
    return paletteFromCss(LCARS_CHART_PALETTE);
  }
  if (themeName === "studiotwitty" || themeName === "ironman") {
    return paletteFromCss(IRONMAN_CHART_PALETTE);
  }
  return DEFAULT_CHART_PALETTE;
}

function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Read theme tokens for charts from CSS variables + optional element color.
 */
export function readChartThemeTokens(element) {
  const theme =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") || "light"
      : "light";
  const computed = element ? getComputedStyle(element) : null;
  const textFallback =
    theme === "lcars" ? "#ffd580" : theme === "studiotwitty" ? "#e8f7ff" : "#888888";
  const surfaceFallback =
    theme === "lcars" ? "#0a0a0c" : theme === "studiotwitty" ? "#071018" : "#ffffff";
  const text = computed?.color?.trim() || cssVar("--text", textFallback);
  const muted = cssVar("--muted-text", text);
  const border = cssVar("--border", "rgba(128,128,128,0.35)");
  const surface = cssVar("--surface", surfaceFallback);
  const surface2 = cssVar("--surface-2", surface);

  return {
    theme,
    text,
    muted,
    border,
    surface,
    surface2,
    fontFamily: computed?.fontFamily || cssVar("--font-sans", "sans-serif"),
    palette: getChartPalette(theme),
  };
}

function remapColorValue(color, tokens) {
  if (color == null) return tokens.palette;
  if (Array.isArray(color)) {
    return color.map((entry, index) => {
      if (typeof entry === "string") {
        const idx = DEFAULT_CHART_PALETTE.findIndex(
          (c) => c.toLowerCase() === entry.toLowerCase()
        );
        if (idx >= 0) return tokens.palette[idx % tokens.palette.length];
      }
      return tokens.palette[index % tokens.palette.length];
    });
  }
  if (typeof color === "string") {
    const idx = DEFAULT_CHART_PALETTE.findIndex(
      (entry) => entry.toLowerCase() === color.toLowerCase()
    );
    if (idx >= 0) return tokens.palette[idx % tokens.palette.length];
  }
  return color;
}

function styleAxis(axis, tokens) {
  if (axis == null) {
    return {
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { lineStyle: { color: tokens.border } },
      axisLabel: { color: tokens.muted },
      splitLine: { lineStyle: { color: tokens.border, opacity: 0.4 } },
      nameTextStyle: { color: tokens.muted },
    };
  }
  if (Array.isArray(axis)) {
    return axis.map((entry) => styleAxis(entry, tokens));
  }

  return {
    ...axis,
    axisLine: {
      show: axis.axisLine?.show !== false,
      ...(axis.axisLine || {}),
      lineStyle: {
        ...(axis.axisLine?.lineStyle || {}),
        color: tokens.border,
      },
    },
    axisTick: {
      ...(axis.axisTick || {}),
      lineStyle: {
        ...(axis.axisTick?.lineStyle || {}),
        color: tokens.border,
      },
    },
    axisLabel: {
      ...(axis.axisLabel || {}),
      color: tokens.muted,
    },
    splitLine: {
      show: axis.splitLine?.show !== false,
      ...(axis.splitLine || {}),
      lineStyle: {
        ...(axis.splitLine?.lineStyle || {}),
        color: tokens.border,
        opacity: axis.splitLine?.lineStyle?.opacity ?? 0.4,
      },
    },
    nameTextStyle: {
      ...(axis.nameTextStyle || {}),
      color: tokens.muted,
    },
  };
}

function styleSeries(series, tokens) {
  if (!series) return series;
  const list = Array.isArray(series) ? series : [series];
  const styled = list.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const next = { ...entry };
    if (next.itemStyle && typeof next.itemStyle === "object" && next.itemStyle.color) {
      next.itemStyle = {
        ...next.itemStyle,
        color: remapColorValue(next.itemStyle.color, tokens),
      };
    }
    if (next.label && typeof next.label === "object") {
      next.label = { ...next.label, color: tokens.text };
    }
    if (next.labelLine && typeof next.labelLine === "object") {
      next.labelLine = {
        ...next.labelLine,
        lineStyle: {
          ...(next.labelLine.lineStyle || {}),
          color: tokens.muted,
        },
      };
    }
    if (next.lineStyle && typeof next.lineStyle === "object" && !next.lineStyle.color) {
      next.lineStyle = { width: 2, ...next.lineStyle };
    }
    if (Array.isArray(next.data)) {
      next.data = next.data.map((point) => {
        if (!point || typeof point !== "object" || Array.isArray(point)) return point;
        if (!point.itemStyle?.color) return point;
        return {
          ...point,
          itemStyle: {
            ...point.itemStyle,
            color: remapColorValue(point.itemStyle.color, tokens),
          },
        };
      });
    }
    return next;
  });
  return Array.isArray(series) ? styled : styled[0];
}

/**
 * Merge theme-aware colors/axis/tooltip/legend into an ECharts option.
 * Fixes low-contrast charts on LCARS (and improves dark/light consistency).
 */
export function applyEchartsTheme(option, tokens) {
  if (!option) return option;

  const legendBase =
    option.legend === false
      ? false
      : {
          ...(typeof option.legend === "object" ? option.legend : {}),
          textStyle: {
            ...((typeof option.legend === "object" && option.legend.textStyle) || {}),
            color: tokens.text,
          },
        };

  const tooltipBase = {
    ...(option.tooltip || {}),
    backgroundColor: tokens.surface2,
    borderColor: tokens.border,
    textStyle: {
      ...(option.tooltip?.textStyle || {}),
      color: tokens.text,
    },
  };

  return {
    ...option,
    backgroundColor: "transparent",
    color: remapColorValue(option.color, tokens),
    textStyle: {
      ...(option.textStyle || {}),
      color: tokens.text,
      fontFamily: tokens.fontFamily,
    },
    legend: legendBase,
    tooltip: tooltipBase,
    xAxis: styleAxis(option.xAxis, tokens),
    yAxis: styleAxis(option.yAxis, tokens),
    series: styleSeries(option.series, tokens),
  };
}
