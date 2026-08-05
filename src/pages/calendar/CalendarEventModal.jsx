import { useEffect, useState } from "react";
import {
  combineDateAndTime,
  EVENT_COLORS,
  formatDateInput,
  formatRecurrenceLabel,
  formatTimeInput,
  parseDateTimeLocal,
} from "../../utils/calendarUtils";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly (birthdays)" },
];

function emptyForm(defaults = {}) {
  const start = defaults.start || new Date();
  const end = defaults.end || new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: defaults.title || "Works",
    assignee_user_id: defaults.assignee_user_id ?? "",
    start_date: formatDateInput(start),
    start_time: formatTimeInput(start),
    end_date: formatDateInput(end),
    end_time: formatTimeInput(end),
    all_day: Boolean(defaults.all_day),
    recurrence: defaults.recurrence || "none",
    recurrence_until: defaults.recurrence_until || "",
    notes: defaults.notes || "",
    color: defaults.color || EVENT_COLORS[0],
  };
}

function untilDateInput(value) {
  if (!value) return "";
  const parsed = parseDateTimeLocal(value);
  return parsed ? formatDateInput(parsed) : String(value).slice(0, 10);
}

function CalendarEventModal({
  open,
  mode = "create",
  event = null,
  defaults = null,
  users = [],
  canEdit = true,
  saving = false,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(() => emptyForm());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (event) {
      // Edit the series template times, not a shifted occurrence display time.
      const start =
        parseDateTimeLocal(event.series_start_at || event.start_at) || new Date();
      const end =
        parseDateTimeLocal(event.series_end_at || event.end_at) ||
        new Date(start.getTime() + 3600000);
      setForm(
        emptyForm({
          title: event.title,
          assignee_user_id: event.assignee_user_id ?? "",
          start,
          end,
          all_day: event.all_day,
          recurrence: event.recurrence || "none",
          recurrence_until: untilDateInput(event.recurrence_until),
          notes: event.notes || "",
          color: event.color || EVENT_COLORS[0],
        })
      );
      return;
    }
    setForm(
      emptyForm({
        start: defaults?.start,
        end: defaults?.end,
        assignee_user_id: defaults?.assignee_user_id ?? "",
        title: defaults?.title,
        recurrence: defaults?.recurrence,
      })
    );
  }, [open, event, defaults]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isRecurring = form.recurrence && form.recurrence !== "none";

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!canEdit) return;
    setError("");
    try {
      const start_at = form.all_day
        ? `${form.start_date}T00:00:00`
        : combineDateAndTime(form.start_date, form.start_time);
      const end_at = form.all_day
        ? `${form.end_date}T23:59:59`
        : combineDateAndTime(form.end_date, form.end_time);
      await onSave({
        title: form.title.trim(),
        assignee_user_id: form.assignee_user_id === "" ? null : Number(form.assignee_user_id),
        start_at,
        end_at,
        all_day: form.all_day,
        recurrence: form.recurrence || "none",
        recurrence_until: isRecurring && form.recurrence_until ? form.recurrence_until : null,
        notes: form.notes,
        color: form.color,
      });
    } catch (saveError) {
      setError(saveError.message || "Could not save event.");
    }
  };

  return (
    <div className="calendar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="calendar-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "New event" : "Event details"}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="calendar-modal-header">
          <h2>{mode === "create" ? "New event" : canEdit ? "Edit event" : "Event"}</h2>
          <button type="button" className="calendar-touch-btn ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="calendar-event-form" onSubmit={handleSubmit}>
          {mode === "edit" && event?.is_recurring && (
            <p className="subtext">
              This event repeats ({formatRecurrenceLabel(event.recurrence)}). Saving or deleting
              updates the whole series.
            </p>
          )}

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
              disabled={!canEdit || saving}
              autoComplete="off"
            />
          </label>

          <label>
            Person
            <select
              value={form.assignee_user_id}
              onChange={(e) => updateField("assignee_user_id", e.target.value)}
              disabled={!canEdit || saving}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>

          <label className="calendar-checkbox-row">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => updateField("all_day", e.target.checked)}
              disabled={!canEdit || saving}
            />
            All day
          </label>

          <div className="calendar-form-row">
            <label>
              Start date
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
                required
                disabled={!canEdit || saving}
              />
            </label>
            {!form.all_day && (
              <label>
                Start time
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => updateField("start_time", e.target.value)}
                  required
                  disabled={!canEdit || saving}
                />
              </label>
            )}
          </div>

          <div className="calendar-form-row">
            <label>
              End date
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
                required
                disabled={!canEdit || saving}
              />
            </label>
            {!form.all_day && (
              <label>
                End time
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => updateField("end_time", e.target.value)}
                  required
                  disabled={!canEdit || saving}
                />
              </label>
            )}
          </div>

          <label>
            Repeat
            <select
              value={form.recurrence}
              onChange={(e) => updateField("recurrence", e.target.value)}
              disabled={!canEdit || saving}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isRecurring && (
            <label>
              Repeat until <span className="stat-meta">(optional)</span>
              <input
                type="date"
                value={form.recurrence_until}
                onChange={(e) => updateField("recurrence_until", e.target.value)}
                disabled={!canEdit || saving}
              />
            </label>
          )}

          <label>
            Color
            <div className="calendar-color-picker">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`calendar-color-swatch${form.color === color ? " selected" : ""}`}
                  style={{ background: color }}
                  aria-label={`Color ${color}`}
                  disabled={!canEdit || saving}
                  onClick={() => updateField("color", color)}
                />
              ))}
            </div>
          </label>

          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              disabled={!canEdit || saving}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <div className="calendar-modal-actions">
            {canEdit && mode === "edit" && (
              <button
                type="button"
                className="danger-button calendar-touch-btn"
                disabled={saving}
                onClick={async () => {
                  try {
                    await onDelete?.();
                  } catch (deleteError) {
                    setError(deleteError.message || "Could not delete event.");
                  }
                }}
              >
                {event?.is_recurring ? "Delete series" : "Delete"}
              </button>
            )}
            <div className="calendar-modal-actions-right">
              <button type="button" className="calendar-touch-btn ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              {canEdit && (
                <button type="submit" className="calendar-touch-btn primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CalendarEventModal;
