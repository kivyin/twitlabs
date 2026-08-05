const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateTimeLocal(value) {
  if (!value) return null;
  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return null;
  const [, y, m, d, hh = "0", mm = "0", ss = "0"] = match;
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss)
  );
}

export function formatDateTimeLocal(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${toDateKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}`;
}

export function formatDateInput(date) {
  return toDateKey(date);
}

export function formatTimeInput(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function combineDateAndTime(dateStr, timeStr) {
  const time = timeStr && timeStr.length === 5 ? `${timeStr}:00` : timeStr || "00:00:00";
  return `${dateStr}T${time}`;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date, weekStartsOn = 0) {
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return startOfDay(addDays(date, -diff));
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatWeekday(date) {
  return WEEKDAY_SHORT[date.getDay()];
}

export function formatDayHeading(date) {
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatMonthTitle(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatEventTimeRange(startAt, endAt, { allDay = false } = {}) {
  if (allDay) {
    const start = parseDateTimeLocal(startAt);
    const end = parseDateTimeLocal(endAt);
    if (!start || !end) return "All day";
    if (toDateKey(start) === toDateKey(end)) {
      return "All day";
    }
    return `${formatDayHeading(start)} – ${formatDayHeading(end)}`;
  }
  const start = parseDateTimeLocal(startAt);
  const end = parseDateTimeLocal(endAt);
  if (!start || !end) return "";
  const startLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (toDateKey(start) === toDateKey(end)) {
    return `${startLabel} – ${endLabel}`;
  }
  return `${formatDayHeading(start)} ${startLabel} → ${formatDayHeading(end)} ${endLabel}`;
}

export function eventDisplayTitle(event) {
  const name = event.assignee_name || "";
  if (name && event.title) {
    const lowerTitle = event.title.toLowerCase();
    const lowerName = name.toLowerCase();
    if (lowerTitle.includes(lowerName)) return event.title;
    return `${name} — ${event.title}`;
  }
  return event.title || name || "Event";
}

export function formatRecurrenceLabel(recurrence) {
  switch (String(recurrence || "").toLowerCase()) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Does not repeat";
  }
}

export function eventOccurrenceKey(event, fallback = "") {
  return event?.occurrence_id || `${event?.id ?? "x"}:${event?.start_at ?? fallback}`;
}

/** Minutes from local midnight. */
export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/** Split an event across days in a week/day grid (supports overnight shifts). */
export function buildEventSegments(event, rangeStart, dayCount) {
  const start = parseDateTimeLocal(event.start_at);
  const end = parseDateTimeLocal(event.end_at);
  if (!start || !end || end <= start) return [];

  const rangeEnd = addDays(rangeStart, dayCount);
  const segments = [];

  for (let i = 0; i < dayCount; i += 1) {
    const dayStart = addDays(rangeStart, i);
    const dayEnd = addDays(dayStart, 1);
    if (!(start < dayEnd && end > dayStart)) continue;

    const segStart = start > dayStart ? start : dayStart;
    const segEnd = end < dayEnd ? end : dayEnd;
    const continuesBefore = start < dayStart;
    const continuesAfter = end > dayEnd;
    let startMinutes = continuesBefore ? 0 : minutesOfDay(segStart);
    let endMinutes = continuesAfter ? 24 * 60 : minutesOfDay(segEnd);
    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(24 * 60, startMinutes + 30);
    }

    segments.push({
      event,
      dateKey: toDateKey(dayStart),
      dayIndex: i,
      start: segStart,
      end: segEnd,
      startMinutes,
      endMinutes,
      continuesBefore,
      continuesAfter,
    });
  }

  return segments;
}

export function buildMonthCells(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = startOfWeek(first, 0);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    cells.push({
      date,
      dateKey: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
      isToday: toDateKey(date) === toDateKey(new Date()),
    });
  }
  return cells;
}

export const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  const date = new Date(2000, 0, 1, hour, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
});

export const EVENT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

export function colorForEvent(event) {
  if (event?.color) return event.color;
  const seed = Number(event?.assignee_user_id) || Number(event?.id) || 0;
  return EVENT_COLORS[Math.abs(seed) % EVENT_COLORS.length];
}
