import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPomodoroStats, getTasks } from "../../api/tasksApi";
import PageHeader from "../../components/PageHeader";
import PomodoroTimer from "../../components/tasks/PomodoroTimer";
import { formatFocusDuration } from "../../utils/taskUtils";

function PomodoroPage() {
  const { appName = "tasks" } = useParams();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [taskResult, statsResult] = await Promise.all([
        getTasks({ view: "all" }),
        getPomodoroStats(7),
      ]);
      setTasks(taskResult.tasks ?? []);
      setStats(statsResult);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Tasks", to: `/app/${appName}` },
          { label: "Focus Timer" },
        ]}
        title="Focus Timer"
        subtitle="Run Pomodoro sessions linked to your tasks and review focus stats."
      />

      {error && <p className="error">{error}</p>}

      <div className="tasks-focus-layout">
        <PomodoroTimer tasks={tasks} onSessionComplete={load} />

        <section className="panel">
          <h2>Last 7 days</h2>
          <div className="tasks-focus-stats">
            <article>
              <span>Sessions</span>
              <strong>{stats?.session_count ?? 0}</strong>
            </article>
            <article>
              <span>Focus time</span>
              <strong>{formatFocusDuration(stats?.focus_seconds ?? 0)}</strong>
            </article>
          </div>

          <h3>Top focused tasks</h3>
          {(stats?.by_task ?? []).length === 0 ? (
            <p className="subtext">Complete a focus session to see stats here.</p>
          ) : (
            <ul className="tasks-focus-leaderboard">
              {stats.by_task.map((row) => (
                <li key={row.task_id ?? row.task_title ?? "none"}>
                  <span>{row.task_title || "Untitled task"}</span>
                  <span>{row.session_count} sessions · {formatFocusDuration(row.focus_seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default PomodoroPage;
