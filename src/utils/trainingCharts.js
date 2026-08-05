import { CHART_PALETTE } from "./chartOptions";
import { formatShortDate } from "./format";

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatTrainingChartNumber(value) {
  return numberFmt.format(Number(value) || 0);
}

function chartDateLabel(value) {
  if (!value) return "—";
  const raw = String(value);
  const day = raw.slice(0, 10);
  return formatShortDate(day);
}

const baseGrid = {
  left: 8,
  right: 12,
  top: 28,
  bottom: 8,
  containLabel: true,
};

/** Best e1RM per session (max set e1RM that day) for an exercise. */
export function aggregateSessionE1rm(points = []) {
  const byDay = new Map();
  for (const point of points) {
    const day = String(point.performed_at || "").slice(0, 10);
    if (!day) continue;
    const e1rm = Number(point.e1rm) || 0;
    const current = byDay.get(day);
    if (!current || e1rm > current.e1rm) {
      byDay.set(day, { date: day, e1rm, weight: Number(point.weight) || 0, reps: Number(point.reps) || 0 });
    }
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Total set volume per session day for an exercise. */
export function aggregateSessionVolume(points = []) {
  const byDay = new Map();
  for (const point of points) {
    const day = String(point.performed_at || "").slice(0, 10);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) || 0) + (Number(point.volume) || 0));
  }
  return [...byDay.entries()]
    .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildE1rmTrendOption(points = []) {
  const series = aggregateSessionE1rm(points);
  if (series.length === 0) return null;

  return {
    color: [CHART_PALETTE[0]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: series.map((point) => point.date),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: "e1RM",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Estimated 1RM",
        type: "line",
        smooth: true,
        showSymbol: series.length <= 40,
        symbolSize: 6,
        areaStyle: { opacity: 0.14 },
        data: series.map((point) => point.e1rm),
      },
    ],
  };
}

export function buildVolumeTrendOption(points = []) {
  const series = aggregateSessionVolume(points);
  if (series.length === 0) return null;

  return {
    color: [CHART_PALETTE[1]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      data: series.map((point) => point.date),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      name: "Volume",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Session volume",
        type: "bar",
        barMaxWidth: 28,
        data: series.map((point) => point.volume),
      },
    ],
  };
}

export function buildWeeklyVolumeOption(rows = []) {
  if (!rows.length) return null;

  return {
    color: [CHART_PALETTE[2]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      data: rows.map((row) => row.week_start),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      name: "Volume",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Weekly volume",
        type: "bar",
        barMaxWidth: 32,
        data: rows.map((row) => Number(row.volume) || 0),
      },
    ],
  };
}

export function buildTopE1rmOption(rows = []) {
  if (!rows.length) return null;
  const ordered = [...rows].reverse();

  return {
    color: [CHART_PALETTE[3]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    grid: { ...baseGrid, left: 12 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    yAxis: {
      type: "category",
      data: ordered.map((row) => row.exercise_name),
      axisLabel: { width: 110, overflow: "truncate" },
    },
    series: [
      {
        name: "Best e1RM",
        type: "bar",
        barMaxWidth: 22,
        data: ordered.map((row) => Number(row.e1rm) || 0),
      },
    ],
  };
}

export function buildMuscleVolumeOption(rows = []) {
  if (!rows.length) return null;

  return {
    color: CHART_PALETTE,
    tooltip: {
      trigger: "item",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    legend: { bottom: 0, type: "scroll" },
    series: [
      {
        name: "Volume",
        type: "pie",
        radius: ["38%", "62%"],
        center: ["50%", "44%"],
        data: rows.map((row) => ({
          name: row.muscle_group,
          value: Number(row.volume) || 0,
        })),
        label: {
          formatter: "{b}\n{d}%",
          fontSize: 11,
          lineHeight: 14,
        },
      },
    ],
  };
}

/** Session duration (sum of intervals) for a cardio exercise. */
export function aggregateSessionDuration(points = []) {
  const byDay = new Map();
  for (const point of points) {
    const day = String(point.performed_at || "").slice(0, 10);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) || 0) + (Number(point.duration_mins) || 0));
  }
  return [...byDay.entries()]
    .map(([date, duration_mins]) => ({
      date,
      duration_mins: Math.round(duration_mins * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildCardioDurationOption(points = []) {
  const series = aggregateSessionDuration(points);
  if (series.length === 0) return null;

  return {
    color: [CHART_PALETTE[4]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${formatTrainingChartNumber(value)} min`,
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: series.map((point) => point.date),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      name: "Minutes",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Duration",
        type: "line",
        smooth: true,
        showSymbol: series.length <= 40,
        symbolSize: 6,
        areaStyle: { opacity: 0.14 },
        data: series.map((point) => point.duration_mins),
      },
    ],
  };
}

export function buildWeeklyCardioOption(rows = []) {
  if (!rows.length) return null;

  return {
    color: [CHART_PALETTE[5]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${formatTrainingChartNumber(value)} min`,
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      data: rows.map((row) => row.week_start),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      name: "Minutes",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Weekly cardio",
        type: "bar",
        barMaxWidth: 32,
        data: rows.map((row) => Number(row.duration_mins) || 0),
      },
    ],
  };
}

export function buildBodyWeightOption(points = []) {
  if (points.length < 2) return null;

  return {
    color: [CHART_PALETTE[4]],
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatTrainingChartNumber(value),
    },
    grid: baseGrid,
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: points.map((point) => point.measured_on),
      axisLabel: {
        formatter: chartDateLabel,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: "Weight",
      axisLabel: { formatter: (value) => formatTrainingChartNumber(value) },
      splitLine: { lineStyle: { opacity: 0.25 } },
    },
    series: [
      {
        name: "Body weight",
        type: "line",
        smooth: true,
        showSymbol: points.length <= 40,
        symbolSize: 6,
        areaStyle: { opacity: 0.14 },
        data: points.map((point) => Number(point.body_weight) || 0),
      },
    ],
  };
}
