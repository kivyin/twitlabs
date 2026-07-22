import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTaskProjects, getTasks, updateTaskStatus } from "../../api/tasksApi";
import PageHeader from "../../components/PageHeader";
import TaskCard from "../../components/tasks/TaskCard";
import TaskQuickAdd from "../../components/tasks/TaskQuickAdd";
import { LIST_VIEWS } from "../../utils/taskUtils";

function TasksListPage() {
  const { appName = "tasks", view: routeView } = useParams();
  const view = routeView || "today";
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const viewMeta = useMemo(
    () => LIST_VIEWS.find((item) => item.value === view) ?? LIST_VIEWS[0],
    [view]
  );

  const loadTasks = async () => {
    try {
      const [taskResult, projectResult] = await Promise.all([
        getTasks({
          view,
          project_id: projectId || undefined,
          search: search || undefined,
        }),
        getTaskProjects(),
      ]);
      setTasks(taskResult.tasks ?? []);
      setProjects(projectResult.projects ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [view, projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleMarkDone = async (task) => {
    try {
      await updateTaskStatus(task.id, "done");
      await loadTasks();
    } catch (doneError) {
      setError(doneError.message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Tasks", to: `/app/${appName}` },
          { label: viewMeta.label },
        ]}
        title={viewMeta.label}
        subtitle={viewMeta.description}
      />

      <section className="tasks-view-tabs">
        {LIST_VIEWS.map((item) => (
          <Link
            key={item.value}
            to={`/app/${appName}/list/${item.value}`}
            className={item.value === view ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </section>

      <section className="panel tasks-list-toolbar">
        <div className="list-record-toolbar-row">
          <div>
            <h2>{viewMeta.label}</h2>
            <p className="subtext">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="toolbar-actions">
            <Link to={`/app/${appName}/task/new`} className="button-primary">
              New Task
            </Link>
          </div>
        </div>
        <label>
          Project
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
          />
        </label>
        <TaskQuickAdd defaultStatus={view === "inbox" ? "inbox" : "todo"} onCreated={loadTasks} />
      </section>

      {error && <p className="error">{error}</p>}

      {tasks.length === 0 ? (
        <section className="panel empty-state">
          <p className="subtext">No tasks in this view yet.</p>
        </section>
      ) : (
        <div className="tasks-list-grid">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} appName={appName} onStatusChange={handleMarkDone} />
          ))}
        </div>
      )}
    </>
  );
}

export default TasksListPage;
