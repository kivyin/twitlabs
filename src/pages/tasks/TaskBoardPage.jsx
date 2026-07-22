import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTaskBoard, getTaskProjects, updateTaskStatus } from "../../api/tasksApi";
import PageHeader from "../../components/PageHeader";
import TaskCard from "../../components/tasks/TaskCard";
import TaskQuickAdd from "../../components/tasks/TaskQuickAdd";
import { getStatusLabel } from "../../utils/taskUtils";

function TaskBoardPage() {
  const { appName = "tasks" } = useParams();
  const [columns, setColumns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [error, setError] = useState("");

  const loadBoard = async () => {
    try {
      const [boardResult, projectResult] = await Promise.all([
        getTaskBoard(projectId || null),
        getTaskProjects(),
      ]);
      setColumns(boardResult.columns ?? []);
      setProjects(projectResult.projects ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [projectId]);

  const handleDrop = async (status) => {
    if (!draggingTaskId) return;
    const taskId = draggingTaskId;
    setDraggingTaskId(null);

    try {
      await updateTaskStatus(taskId, status);
      await loadBoard();
    } catch (dropError) {
      setError(dropError.message);
    }
  };

  const handleMarkDone = async (task) => {
    try {
      await updateTaskStatus(task.id, "done");
      await loadBoard();
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
          { label: "Board" },
        ]}
        title="Kanban Board"
        subtitle="Drag tasks between columns or capture new work quickly."
      />

      {error && <p className="error">{error}</p>}

      <section className="panel tasks-board-toolbar">
        <div className="list-record-toolbar-row">
          <div>
            <h2>Board</h2>
            <p className="subtext">Drag tasks between columns</p>
          </div>
          <div className="toolbar-actions">
            <Link to={`/app/${appName}/task/new`} className="button-primary">
              New Task
            </Link>
          </div>
        </div>
        <label>
          Project filter
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <TaskQuickAdd onCreated={loadBoard} />
      </section>

      <div className="task-board">
        {columns.map((column) => (
          <section
            key={column.status}
            className="task-board-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(column.status)}
          >
            <header className="task-board-column-header">
              <h2>{getStatusLabel(column.status)}</h2>
              <span>{column.tasks.length}</span>
            </header>
            <div className="task-board-column-body">
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  appName={appName}
                  draggable
                  onDragStart={() => setDraggingTaskId(task.id)}
                  onStatusChange={handleMarkDone}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export default TaskBoardPage;
