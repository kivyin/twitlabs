export const TASK_STATUSES = [
  { value: "inbox", label: "Inbox" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const TASK_PRIORITIES = [
  { value: 0, label: "None", className: "priority-none" },
  { value: 1, label: "Low", className: "priority-low" },
  { value: 2, label: "Medium", className: "priority-medium" },
  { value: 3, label: "High", className: "priority-high" },
  { value: 4, label: "Urgent", className: "priority-urgent" },
];

export const LIST_VIEWS = [
  { value: "today", label: "Today", description: "Due today, overdue, and in progress" },
  { value: "upcoming", label: "Upcoming", description: "Due in the next 7 days" },
  { value: "inbox", label: "Inbox", description: "Uncategorized tasks" },
  { value: "all", label: "All Tasks", description: "Everything except done" },
  { value: "done", label: "Completed", description: "Finished tasks" },
];

export function getStatusLabel(status) {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function getPriorityMeta(priority) {
  return TASK_PRIORITIES.find((item) => item.value === Number(priority)) ?? TASK_PRIORITIES[0];
}

export function formatDueDate(dueDate) {
  if (!dueDate) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate === today) return "Today";
  if (dueDate < today) return "Overdue";
  const date = new Date(`${dueDate}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFocusDuration(totalSeconds) {
  const seconds = Number(totalSeconds) || 0;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const DEFAULT_POMODORO_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

export function readPomodoroSettings() {
  try {
    const raw = localStorage.getItem("twitlabs-pomodoro-settings");
    if (!raw) return DEFAULT_POMODORO_SETTINGS;
    return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_POMODORO_SETTINGS;
  }
}

export function writePomodoroSettings(settings) {
  localStorage.setItem("twitlabs-pomodoro-settings", JSON.stringify(settings));
}
