import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTaskSummary } from "../../api/tasksApi";
import PageHeader from "../../components/PageHeader";
import PomodoroTimer from "../../components/tasks/PomodoroTimer";
import TaskQuickAdd from "../../components/tasks/TaskQuickAdd";
import { formatFocusDuration } from "../../utils/taskUtils";

function TasksHomePage() {
  const appName = "tasks";
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      const result = await getTaskSummary();
      setSummary(result.summary);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const shortcuts = [
    { label: "Today", to: `/app/${appName}/list/today`, stat: summary?.due_today_count ?? 0 },
    { label: "Board", to: `/app/${appName}/board`, stat: summary?.in_progress_count ?? 0 },
    { label: "All Tasks", to: `/app/${appName}/list/all`, stat: summary?.open_count ?? 0 },
    { label: "Focus Timer", to: `/app/${appName}/focus`, stat: formatFocusDuration(summary?.focus_seconds_today ?? 0) },
    { label: "Projects", to: `/app/${appName}/projects`, stat: summary?.project_count ?? 0 },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tasks" }]}
        title="Tasks"
        subtitle="Plan work, track priorities, and run Pomodoro focus sessions."
      />

      {error && <p className="error">{error}</p>}

      <section className="tasks-summary-grid">
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Open</span>
          <strong>{summary?.open_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Due Today</span>
          <strong>{summary?.due_today_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Overdue</span>
          <strong className={summary?.overdue_count ? "text-danger" : ""}>{summary?.overdue_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Focus Today</span>
          <strong>{formatFocusDuration(summary?.focus_seconds_today ?? 0)}</strong>
        </article>
      </section>

      <section className="panel tasks-home-quick-add">
        <h2>Quick capture</h2>
        <TaskQuickAdd onCreated={loadSummary} />
      </section>

      <div className="tasks-home-layout">
        <section className="panel">
          <h2>Views</h2>
          <div className="tasks-shortcut-grid">
            {shortcuts.map((item) => (
              <Link key={item.label} to={item.to} className="tasks-shortcut-card">
                <span>{item.label}</span>
                <strong>{item.stat}</strong>
              </Link>
            ))}
          </div>
        </section>

        <PomodoroTimer compact />
      </div>
    </>
  );
}

export default TasksHomePage;
