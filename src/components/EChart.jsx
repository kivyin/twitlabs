import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { useTheme } from "../context/ThemeContext";
import { applyEchartsTheme, readChartThemeTokens } from "../utils/chartTheme";

/**
 * Thin wrapper around Apache ECharts that handles init, disposal,
 * container resizing, and re-rendering when the app theme changes.
 */
function EChart({ option, height = 260, style }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = echarts.init(container, null, { renderer: "canvas" });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !option || !container) return;

    const tokens = readChartThemeTokens(container);
    const themedOption = applyEchartsTheme(option, tokens);
    chart.setOption(themedOption, { notMerge: true });
  }, [option, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="echart-container"
      style={{ width: "100%", height, ...style }}
      data-chart-theme={resolvedTheme}
    />
  );
}

export default EChart;
