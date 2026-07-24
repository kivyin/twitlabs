import { useEffect, useMemo, useRef, useState } from "react";
import UserMenuButton from "./UserMenuButton";

function LcarsBarStrip({ className, bars }) {
  return (
    <div className={className} aria-hidden="true">
      {bars.map((bar) => (
        <span
          key={bar.key}
          className={`lcars-strip-bar lcars-strip-bar--${bar.tone}${bar.flex ? " is-flex" : ""}`}
          style={bar.width ? { width: bar.width } : undefined}
        />
      ))}
    </div>
  );
}

const MID_BARS = [
  { key: "m1", tone: "orange", width: "18%" },
  { key: "m2", tone: "blue", width: "28%" },
  { key: "m3", tone: "tan", width: "14%" },
  { key: "m4", tone: "peach", flex: true },
  { key: "m5", tone: "lavender", width: "10%" },
];

const FOOT_BARS = [
  { key: "f1", tone: "orange", width: "12%" },
  { key: "f2", tone: "blue", width: "16%" },
  { key: "f3", tone: "gold", width: "9%" },
  { key: "f4", tone: "violet", width: "11%" },
  { key: "f5", tone: "teal", width: "8%" },
  { key: "f6", tone: "red", width: "7%" },
  { key: "f7", tone: "tan", flex: true },
  { key: "f8", tone: "lavender", width: "10%" },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
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

function formatLcarsClock(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const star = formatStarChronology(date);
  return {
    stardate: star.stardate,
    startime: star.startime,
    date: `${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${String(date.getFullYear()).slice(2)}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

/**
 * TNG-style star chronology for the LCARS brand clock.
 * Star Date = year index + day-of-year. Star Time = progress through today (0–1000).
 */
function formatStarChronology(date) {
  const year = date.getFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const startOfDay = Date.UTC(year, date.getMonth(), date.getDate());
  const now = Date.UTC(
    year,
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  const dayOfYear = (startOfDay - startOfYear) / 86_400_000;
  const stardate = (year % 100) * 1000 + (dayOfYear / daysInYear) * 1000;
  const startime = ((now - startOfDay) / 86_400_000) * 1000;
  return {
    stardate: stardate.toFixed(1),
    startime: startime.toFixed(1),
  };
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function LcarsMiniCalendar({ open, onClose, rootRef }) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!open) return undefined;

    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());

    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, rootRef, today]);

  if (!open) return null;

  const cells = buildMonthCells(viewYear, viewMonth);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div className="lcars-mini-calendar" role="dialog" aria-label="Calendar">
      <div className="lcars-mini-calendar-head">
        <button type="button" className="lcars-mini-calendar-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <strong>
          {MONTHS[viewMonth]} {viewYear}
        </strong>
        <button type="button" className="lcars-mini-calendar-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="lcars-mini-calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="lcars-mini-calendar-grid">
        {cells.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="lcars-mini-calendar-day is-empty" />;
          }
          const isToday = sameDay(date, today);
          return (
            <span
              key={date.toISOString()}
              className={`lcars-mini-calendar-day${isToday ? " is-today" : ""}`}
              aria-current={isToday ? "date" : undefined}
            >
              {date.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function LcarsChronometer({ onSignOut, displayName }) {
  const rootRef = useRef(null);
  const [clock, setClock] = useState(() => formatLcarsClock(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatLcarsClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="lcars-mid-clock" ref={rootRef}>
      <div className="lcars-mid-clock-readout" aria-live="polite">
        <span className="lcars-mid-clock-chip lcars-mid-clock-chip--stardate">
          <small>Star Date</small>
          {clock.stardate}
        </span>
        <span className="lcars-mid-clock-chip lcars-mid-clock-chip--startime">
          <small>Star Time</small>
          {clock.startime}
        </span>
        <span className="lcars-mid-clock-chip">
          <small>Date</small>
          {clock.date}
        </span>
        <span className="lcars-mid-clock-chip">
          <small>Time</small>
          {clock.time}
        </span>
      </div>
      <button
        type="button"
        className={`lcars-mid-clock-calendar-button${calendarOpen ? " active" : ""}`}
        aria-label="Open calendar"
        aria-expanded={calendarOpen}
        title="Calendar"
        onClick={() => setCalendarOpen((open) => !open)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="1" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>
      {onSignOut ? (
        <UserMenuButton
          className="lcars-mid-clock-user-menu"
          displayName={displayName}
          onSignOut={onSignOut}
        />
      ) : null}
      <LcarsMiniCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} rootRef={rootRef} />
    </div>
  );
}

/** Decorative mid-band between record details and page content */
function LcarsMidBand() {
  return (
    <div className="lcars-mid-band" aria-hidden="true">
      <LcarsBarStrip className="lcars-mid-bars" bars={MID_BARS} />
    </div>
  );
}

function LcarsFootBand() {
  return <LcarsBarStrip className="lcars-foot-band" bars={FOOT_BARS} />;
}

function LcarsFrameBrand({ title, onSignOut, displayName }) {
  return (
    <div className="lcars-frame-brand">
      <span className="lcars-frame-brand-bar lcars-frame-brand-bar--lead" aria-hidden="true" />
      <span className="lcars-frame-brand-title">{title}</span>
      <LcarsChronometer onSignOut={onSignOut} displayName={displayName} />
    </div>
  );
}

export { LcarsFootBand, LcarsFrameBrand, LcarsMidBand, formatLcarsClock };
export default LcarsMidBand;
