import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { useTheme } from "../context/ThemeContext";

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
    if (!chart || !option) return;

    // Pull the current text color from CSS so charts follow the theme.
    const computed = getComputedStyle(containerRef.current);
    const textColor = computed.color || "#888";

    chart.setOption(
      {
        backgroundColor: "transparent",
        textStyle: { color: textColor, fontFamily: computed.fontFamily },
        ...option,
      },
      { notMerge: true }
    );
  }, [option, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="echart-container"
      style={{ width: "100%", height, ...style }}
    />
  );
}

export default EChart;
