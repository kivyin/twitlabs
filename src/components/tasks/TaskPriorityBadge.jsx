import { getPriorityMeta } from "../../utils/taskUtils";

function TaskPriorityBadge({ priority }) {
  const meta = getPriorityMeta(priority);
  if (!meta.value) return null;

  return (
    <span className={`task-priority ${meta.className}`} title={meta.label}>
      {meta.label}
    </span>
  );
}

export default TaskPriorityBadge;
