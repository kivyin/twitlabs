import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createTask,
  deleteTask,
  getTask,
  getTaskProjects,
  getTaskTags,
  updateTask,
} from "../../api/tasksApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import FormActions from "../../components/FormActions";
import PageHeader from "../../components/PageHeader";
import PomodoroTimer from "../../components/tasks/PomodoroTimer";
import TaskNotesPanel from "../../components/tasks/TaskNotesPanel";
import { TASK_PRIORITIES, TASK_STATUSES } from "../../utils/taskUtils";

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "todo",
  priority: 0,
  project_id: "",
  due_date: "",
  due_time: "",
  estimated_minutes: "",
  tag_ids: [],
  subtasks: [],
};

function TaskDetailPage() {
  const { appName = "tasks", taskId } = useParams();
  const navigate = useNavigate();
  const isNew = !taskId || taskId === "new";
  const [form, setForm] = useState(EMPTY_FORM);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [projectResult, tagResult] = await Promise.all([
          getTaskProjects(),
          getTaskTags(),
        ]);

        if (!active) return;
        setProjects(projectResult.projects ?? []);
        setTags(tagResult.tags ?? []);

        if (!isNew) {
          const taskResult = await getTask(taskId);
          const task = taskResult.task;
          setForm({
            title: task.title ?? "",
            description: task.description ?? "",
            status: task.status ?? "todo",
            priority: Number(task.priority) || 0,
            project_id: task.project_id ? String(task.project_id) : "",
            due_date: task.due_date ?? "",
            due_time: task.due_time ?? "",
            estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
            tag_ids: (task.tags ?? []).map((tag) => tag.id),
            subtasks: task.subtasks ?? [],
          });
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isNew, taskId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTag = (tagId) => {
    setForm((current) => {
      const exists = current.tag_ids.includes(tagId);
      return {
        ...current,
        tag_ids: exists
          ? current.tag_ids.filter((id) => id !== tagId)
          : [...current.tag_ids, tagId],
      };
    });
  };

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    setForm((current) => ({
      ...current,
      subtasks: [...current.subtasks, { title, completed: false }],
    }));
    setNewSubtask("");
  };

  const toggleSubtask = (index) => {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const removeSubtask = (index) => {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: Number(form.priority),
      project_id: form.project_id || null,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      tag_ids: form.tag_ids,
      subtasks: form.subtasks,
    };

    try {
      const result = isNew
        ? await createTask(payload)
        : await updateTask(taskId, payload);
      setStatus(isNew ? "Task created." : "Task saved.");
      if (isNew) {
        navigate(`/app/${appName}/task/${result.task.id}`, { replace: true });
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;

    setDeleting(true);
    setError("");
    try {
      await deleteTask(taskId);
      setShowDeleteConfirm(false);
      navigate(`/app/${appName}/list/all`);
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="subtext">Loading task...</p>;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Tasks", to: `/app/${appName}` },
          { label: isNew ? "New Task" : form.title || "Task" },
        ]}
        title={isNew ? "New Task" : form.title || "Task"}
        subtitle="Add details, subtasks, tags, and start a focus session."
        actions={
          !isNew && (
            <button
              type="button"
              className="danger-button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              Delete
            </button>
          )
        }
      />

      <div className="task-detail-layout">
        <div className="task-detail-main">
          <form className="panel task-detail-form" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isNew ? "Create Task" : "Save Task"}
              cancelHref={`/app/${appName}/list/all`}
              cancelLabel="Back to tasks"
            >
            {error && <p className="error">{error}</p>}
            {status && <p className="status-text">{status}</p>}

            <label>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
              />
            </label>

          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="form-grid two-col">
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                {TASK_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => updateField("priority", Number(event.target.value))}
              >
                {TASK_PRIORITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Project
              <select value={form.project_id} onChange={(event) => updateField("project_id", event.target.value)}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estimated minutes
              <input
                type="number"
                min="1"
                value={form.estimated_minutes}
                onChange={(event) => updateField("estimated_minutes", event.target.value)}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(event) => updateField("due_date", event.target.value)}
              />
            </label>

            <label>
              Due time
              <input
                type="time"
                value={form.due_time}
                onChange={(event) => updateField("due_time", event.target.value)}
              />
            </label>
          </div>

          <section className="task-subtasks-section">
            <h2>Subtasks</h2>
            <ul className="task-subtask-list">
              {form.subtasks.map((subtask, index) => (
                <li key={`${subtask.title}-${index}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(subtask.completed)}
                      onChange={() => toggleSubtask(index)}
                    />
                    <span>{subtask.title}</span>
                  </label>
                  <button type="button" className="linkish-button" onClick={() => removeSubtask(index)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="task-subtask-add">
              <input
                type="text"
                value={newSubtask}
                onChange={(event) => setNewSubtask(event.target.value)}
                placeholder="Add a subtask"
              />
              <button type="button" onClick={addSubtask}>
                Add
              </button>
            </div>
          </section>

          <section className="task-tags-section">
            <h2>Tags</h2>
            <div className="task-tag-picker">
              {tags.length === 0 ? (
                <p className="subtext">
                  No tags yet. Create tags from <Link to={`/app/${appName}/projects`}>Projects</Link>.
                </p>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`task-tag-option${form.tag_ids.includes(tag.id) ? " active" : ""}`}
                    style={{ borderColor: tag.color, color: tag.color }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          </section>

          {isNew ? (
            <section className="task-notes-section">
              <h2>Notes</h2>
              <p className="subtext">Save this task first to create or link notes in a notebook.</p>
            </section>
          ) : null}
            </FormActions>
          </form>

          {!isNew && (
            <div className="panel task-notes-panel">
              <TaskNotesPanel taskId={taskId} taskTitle={form.title} appName="notes" />
            </div>
          )}
        </div>

        {!isNew && (
          <PomodoroTimer
            task={{ id: Number(taskId), title: form.title, focus_seconds: 0 }}
          />
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete task?"
          message="Delete this task? This cannot be undone from here."
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          busy={deleting}
          onCancel={() => !deleting && setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

export default TaskDetailPage;
