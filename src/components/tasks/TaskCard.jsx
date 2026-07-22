import { Link } from "react-router-dom";
import { formatDueDate, formatFocusDuration } from "../../utils/taskUtils";
import TaskPriorityBadge from "./TaskPriorityBadge";

function TaskCard({ task, appName = "tasks", onStatusChange, draggable = false, onDragStart }) {
  const completedSubtasks = task.subtasks?.filter((item) => item.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <article
      className="task-card"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="task-card-top">
        <TaskPriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={`task-due${task.due_date < new Date().toISOString().slice(0, 10) && task.status !== "done" ? " overdue" : ""}`}>
            {formatDueDate(task.due_date)}
          </span>
        )}
      </div>

      <Link to={`/app/${appName}/task/${task.id}`} className="task-card-title">
        {task.title}
      </Link>

      {task.description && <p className="task-card-description">{task.description}</p>}

      <div className="task-card-meta">
        {task.project_name && (
          <span className="task-project-pill" style={{ borderColor: task.project_color || undefined }}>
            {task.project_name}
          </span>
        )}
        {totalSubtasks > 0 && (
          <span className="task-meta-chip">
            {completedSubtasks}/{totalSubtasks} subtasks
          </span>
        )}
        {task.pomodoro_count > 0 && (
          <span className="task-meta-chip">
            {task.pomodoro_count} pom · {formatFocusDuration(task.focus_seconds)}
          </span>
        )}
      </div>

      {task.tags?.length > 0 && (
        <div className="task-tag-row">
          {task.tags.map((tag) => (
            <span key={tag.id} className="task-tag" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {onStatusChange && task.status !== "done" && (
        <div className="task-card-actions">
          <button type="button" className="linkish-button" onClick={() => onStatusChange(task, "done")}>
            Mark done
          </button>
        </div>
      )}
    </article>
  );
}

export default TaskCard;
