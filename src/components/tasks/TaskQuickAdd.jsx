import { useState } from "react";
import { createTask } from "../../api/tasksApi";

function TaskQuickAdd({ defaultStatus = "todo", projectId = null, onCreated }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");

    try {
      const result = await createTask({
        title: trimmed,
        status: defaultStatus,
        project_id: projectId,
      });
      setTitle("");
      onCreated?.(result.task);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="task-quick-add" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task and press Enter"
        aria-label="Quick add task"
      />
      <button type="submit" disabled={saving || !title.trim()}>
        {saving ? "Adding..." : "Add"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default TaskQuickAdd;
