import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getCalendarUsers,
  updateCalendarEvent,
} from "../../api/calendarApi";
import { useAuth } from "../../context/AuthContext";
import {
  addDays,
  buildEventSegments,
  buildMonthCells,
  colorForEvent,
  eventDisplayTitle,
  eventOccurrenceKey,
  formatDateTimeLocal,
  formatDayHeading,
  formatEventTimeRange,
  formatMonthTitle,
  formatWeekday,
  HOUR_LABELS,
  minutesOfDay,
  startOfDay,
  startOfWeek,
  toDateKey,
} from "../../utils/calendarUtils";
import { userHasCalendarEditAccess, userHasCalendarViewOnly } from "../../utils/roles";
import CalendarEventModal from "./CalendarEventModal";
import CalendarShoppingModal from "./CalendarShoppingModal";

const HOUR_HEIGHT = 56;
const SLOT_MINUTES = 30;

function CalendarPage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles ?? [];
  const canEdit = userHasCalendarEditAccess(roles, isAdmin);
  const viewOnly = userHasCalendarViewOnly(roles, isAdmin);

  const [viewMode, setViewMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [modal, setModal] = useState({ open: false, mode: "create", event: null, defaults: null });
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const gridRef = useRef(null);
  const didScrollRef = useRef(false);

  const weekStart = useMemo(() => startOfWeek(anchorDate, 0), [anchorDate]);
  const dayCount = viewMode === "day" ? 1 : 7;
  const rangeStart = useMemo(
    () => (viewMode === "day" ? startOfDay(anchorDate) : weekStart),
    [anchorDate, viewMode, weekStart]
  );
  const rangeEnd = useMemo(() => addDays(rangeStart, dayCount), [dayCount, rangeStart]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "month") return formatMonthTitle(anchorDate);
    if (viewMode === "day") {
      return `${formatWeekday(anchorDate)} ${anchorDate.toLocaleDateString()}`;
    }
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }, [anchorDate, viewMode, weekStart]);

  const loadEvents = useCallback(
    async ({ showLoading = false } = {}) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        let from;
        let to;
        if (viewMode === "month") {
          const cells = buildMonthCells(anchorDate);
          from = formatDateTimeLocal(cells[0].date);
          to = formatDateTimeLocal(addDays(cells[41].date, 1));
        } else {
          from = formatDateTimeLocal(rangeStart);
          to = formatDateTimeLocal(rangeEnd);
        }
        const payload = await getCalendarEvents({ from, to });
        setEvents(payload.events || []);
      } catch (loadError) {
        setError(loadError.message || "Could not load events.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [anchorDate, rangeEnd, rangeStart, viewMode]
  );

  useEffect(() => {
    void loadEvents({ showLoading: true });
  }, [loadEvents]);

  useEffect(() => {
    let cancelled = false;
    getCalendarUsers()
      .then((payload) => {
        if (!cancelled) setUsers(payload.users || []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!viewOnly) return undefined;
    const timer = window.setInterval(() => {
      void loadEvents({ showLoading: false });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [viewOnly, loadEvents]);

  useEffect(() => {
    document.documentElement.dataset.calendarKiosk = "1";
    return () => {
      delete document.documentElement.dataset.calendarKiosk;
    };
  }, []);

  useEffect(() => {
    if (viewMode === "month" || !gridRef.current || didScrollRef.current) return;
    const minutes = minutesOfDay(new Date());
    gridRef.current.scrollTop = Math.max(0, (minutes / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 2);
    didScrollRef.current = true;
  }, [viewMode, loading]);

  const dayColumns = useMemo(() => {
    if (viewMode === "month") return [];
    return Array.from({ length: dayCount }, (_, index) => {
      const date = addDays(rangeStart, index);
      return {
        date,
        dateKey: toDateKey(date),
        label: formatDayHeading(date),
        isToday: toDateKey(date) === toDateKey(now),
      };
    });
  }, [dayCount, now, rangeStart, viewMode]);

  const segmentsByDay = useMemo(() => {
    const map = {};
    for (const column of dayColumns) {
      map[column.dateKey] = [];
    }
    for (const event of events) {
      for (const segment of buildEventSegments(event, rangeStart, dayCount)) {
        if (!map[segment.dateKey]) map[segment.dateKey] = [];
        map[segment.dateKey].push(segment);
      }
    }
    return map;
  }, [dayColumns, dayCount, events, rangeStart]);

  const monthCells = useMemo(
    () => (viewMode === "month" ? buildMonthCells(anchorDate) : []),
    [anchorDate, viewMode]
  );

  const openCreateAt = (date, hour, minute = 0) => {
    if (!canEdit) return;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setModal({ open: true, mode: "create", event: null, defaults: { start, end, title: "Works" } });
  };

  const openEvent = (event) => {
    setModal({ open: true, mode: "edit", event, defaults: null });
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modal.mode === "edit" && modal.event?.id) {
        await updateCalendarEvent(modal.event.id, payload);
      } else {
        await createCalendarEvent(payload);
      }
      setModal({ open: false, mode: "create", event: null, defaults: null });
      await loadEvents({ showLoading: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.event?.id) return;
    setSaving(true);
    try {
      await deleteCalendarEvent(modal.event.id);
      setModal({ open: false, mode: "create", event: null, defaults: null });
      await loadEvents({ showLoading: false });
    } finally {
      setSaving(false);
    }
  };

  const shiftRange = (direction) => {
    didScrollRef.current = false;
    if (viewMode === "month") {
      setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1));
      return;
    }
    if (viewMode === "day") {
      setAnchorDate(addDays(anchorDate, direction));
      return;
    }
    setAnchorDate(addDays(anchorDate, direction * 7));
  };

  const goToday = () => {
    didScrollRef.current = false;
    setAnchorDate(startOfDay(new Date()));
  };

  const nowLineTop =
    viewMode !== "month" && toDateKey(now) >= toDateKey(rangeStart) && toDateKey(now) < toDateKey(rangeEnd)
      ? (minutesOfDay(now) / 60) * HOUR_HEIGHT
      : null;

  const shell = (
    <div
      className="calendar-app calendar-app-kiosk"
      data-days={viewMode === "month" ? undefined : String(dayCount)}
    >
      <div className="calendar-topbar">
        {viewOnly ? (
          <button
            type="button"
            className="calendar-touch-btn ghost"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="calendar-touch-btn ghost"
            onClick={() => navigate("/", { replace: true })}
          >
            ← Back
          </button>
        )}
        <h1 className="calendar-topbar-title">Calendar</h1>
        <button
          type="button"
          className="calendar-touch-btn primary"
          onClick={() => setShoppingOpen(true)}
        >
          Shopping
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-toolbar-nav">
          <button type="button" className="calendar-touch-btn" onClick={() => shiftRange(-1)}>
            Prev
          </button>
          <button type="button" className="calendar-touch-btn" onClick={goToday}>
            Today
          </button>
          <button type="button" className="calendar-touch-btn" onClick={() => shiftRange(1)}>
            Next
          </button>
        </div>
        <h2 className="calendar-range-label">{rangeLabel}</h2>
        <div className="calendar-toolbar-views">
          {["day", "week", "month"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`calendar-touch-btn${viewMode === mode ? " active" : ""}`}
              onClick={() => {
                didScrollRef.current = false;
                setViewMode(mode);
              }}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
          {canEdit && (
            <button
              type="button"
              className="calendar-touch-btn primary"
              onClick={() => openCreateAt(anchorDate, Math.max(8, new Date().getHours()), 0)}
            >
              Add event
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="subtext">Loading calendar…</p>}

      {viewMode === "month" ? (
        <div className="calendar-month">
          <div className="calendar-month-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="calendar-month-grid">
            {monthCells.map((cell) => {
              const dayEvents = events.filter((event) => {
                const segs = buildEventSegments(event, cell.date, 1);
                return segs.length > 0;
              });
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={`calendar-month-cell${cell.inMonth ? "" : " outside"}${
                    cell.isToday ? " today" : ""
                  }`}
                  onClick={() => {
                    setAnchorDate(cell.date);
                    setViewMode("day");
                    if (canEdit && dayEvents.length === 0) {
                      openCreateAt(cell.date, 9, 0);
                    }
                  }}
                >
                  <span className="calendar-month-daynum">{cell.date.getDate()}</span>
                  <div className="calendar-month-events">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={eventOccurrenceKey(event, cell.dateKey)}
                        className="calendar-month-pill"
                        style={{ background: colorForEvent(event) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEvent(event);
                        }}
                      >
                        {event.is_recurring ? "↻ " : ""}
                        {eventDisplayTitle(event)}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="calendar-month-more">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="calendar-week-shell" ref={gridRef}>
          <div className="calendar-week-header">
            <div className="calendar-gutter" />
            {dayColumns.map((column) => (
              <div
                key={column.dateKey}
                className={`calendar-day-heading${column.isToday ? " today" : ""}`}
              >
                {column.label}
              </div>
            ))}
          </div>
          <div
            className="calendar-week-body"
            style={{ height: 24 * HOUR_HEIGHT }}
          >
            <div className="calendar-gutter calendar-hour-gutter">
              {HOUR_LABELS.map((label, hour) => (
                <div key={label} className="calendar-hour-label" style={{ height: HOUR_HEIGHT }}>
                  {label}
                </div>
              ))}
            </div>
            {dayColumns.map((column) => (
              <div
                key={column.dateKey}
                className={`calendar-day-column${column.isToday ? " today" : ""}`}
                onClick={(e) => {
                  if (e.target.closest(".calendar-event-block")) return;
                  const slots = e.currentTarget.querySelector(".calendar-day-slots");
                  const bounds = slots.getBoundingClientRect();
                  const relativeY = e.clientY - bounds.top;
                  const minutes = Math.max(
                    0,
                    Math.min(24 * 60 - SLOT_MINUTES, (relativeY / HOUR_HEIGHT) * 60)
                  );
                  const snapped = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
                  openCreateAt(column.date, Math.floor(snapped / 60), snapped % 60);
                }}
              >
                <div className="calendar-day-slots">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="calendar-hour-slot" style={{ height: HOUR_HEIGHT }} />
                  ))}
                      {(segmentsByDay[column.dateKey] || []).map((segment) => {
                    const top = (segment.startMinutes / 60) * HOUR_HEIGHT;
                    const height = Math.max(
                      28,
                      ((segment.endMinutes - segment.startMinutes) / 60) * HOUR_HEIGHT - 2
                    );
                    const event = segment.event;
                    return (
                      <button
                        key={`${eventOccurrenceKey(event)}-${segment.dateKey}`}
                        type="button"
                        className={`calendar-event-block${
                          segment.continuesBefore ? " continues-before" : ""
                        }${segment.continuesAfter ? " continues-after" : ""}${
                          event.is_recurring ? " is-recurring" : ""
                        }`}
                        style={{
                          top,
                          height,
                          background: colorForEvent(event),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEvent(event);
                        }}
                      >
                        <strong>
                          {event.is_recurring ? "↻ " : ""}
                          {eventDisplayTitle(event)}
                        </strong>
                        <span>
                          {formatEventTimeRange(event.start_at, event.end_at, {
                            allDay: event.all_day,
                          })}
                        </span>
                      </button>
                    );
                  })}
                  {column.isToday && nowLineTop != null && (
                    <div className="calendar-now-line" style={{ top: nowLineTop }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CalendarEventModal
        open={modal.open}
        mode={modal.mode}
        event={modal.event}
        defaults={modal.defaults}
        users={users}
        canEdit={canEdit}
        saving={saving}
        onClose={() => setModal({ open: false, mode: "create", event: null, defaults: null })}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <CalendarShoppingModal open={shoppingOpen} onClose={() => setShoppingOpen(false)} />
    </div>
  );

  return shell;
}

export default CalendarPage;
