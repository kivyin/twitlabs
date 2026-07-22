import { useEffect, useRef, useState } from "react";
import { NOTE_TYPES } from "../../utils/noteUtils";
import NotesModal from "./NotesModal";

const CREATE_VARIANTS = {
  notebook: {
    title: "New notebook",
    subtitle: "Notebooks are the top level of your notes hierarchy.",
    nameLabel: "Notebook name",
    namePlaceholder: "Work, Personal, Research…",
    submitLabel: "Create notebook",
    showColor: true,
    showDescription: true,
    defaultColor: "#0f766e",
  },
  subject: {
    title: "New subject",
    subtitle: "Subjects group related topics inside a notebook.",
    nameLabel: "Subject name",
    namePlaceholder: "Meetings, Projects, Reference…",
    submitLabel: "Create subject",
    showColor: true,
    showDescription: true,
    defaultColor: "#14b8a6",
  },
  topic: {
    title: "New topic",
    subtitle: "Topics hold your notes within a subject.",
    nameLabel: "Topic name",
    namePlaceholder: "Q3 planning, API design…",
    submitLabel: "Create topic",
    showDescription: true,
  },
  subtopic: {
    title: "New sub-topic",
    subtitle: "Nest topics for deeper organization.",
    nameLabel: "Sub-topic name",
    namePlaceholder: "Research notes, Action items…",
    submitLabel: "Create sub-topic",
    showDescription: true,
  },
  note: {
    title: "New note",
    subtitle: "Create a note in the selected notebook, subject, or topic.",
    nameLabel: "Note title",
    namePlaceholder: "Untitled note",
    submitLabel: "Create note",
    showType: true,
  },
  subnote: {
    title: "New sub-note",
    subtitle: "Add a nested note under the current page.",
    nameLabel: "Sub-note title",
    namePlaceholder: "Follow-up, appendix…",
    submitLabel: "Create sub-note",
    showType: true,
  },
};

const EDIT_VARIANTS = {
  notebook: {
    title: "Edit notebook",
    subtitle: "Update the notebook name, color, or description.",
    nameLabel: "Notebook name",
    submitLabel: "Save notebook",
    showColor: true,
    showDescription: true,
    showArchive: true,
  },
  subject: {
    title: "Edit subject",
    subtitle: "Update the subject name, color, or description.",
    nameLabel: "Subject name",
    submitLabel: "Save subject",
    showColor: true,
    showDescription: true,
  },
  topic: {
    title: "Edit topic",
    subtitle: "Update the topic name or description.",
    nameLabel: "Topic name",
    submitLabel: "Save topic",
    showDescription: true,
  },
};

function NotesCreateModal({
  variant,
  mode = "create",
  initialValues = {},
  selectionLabel = "",
  open,
  onClose,
  onSubmit,
  saving = false,
  error = "",
}) {
  const config =
    mode === "edit"
      ? EDIT_VARIANTS[variant] ?? EDIT_VARIANTS.notebook
      : CREATE_VARIANTS[variant] ?? CREATE_VARIANTS.note;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(config.defaultColor ?? initialValues.color ?? "#0f766e");
  const [noteType, setNoteType] = useState("general");
  const [isArchived, setIsArchived] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName(initialValues.name ?? "");
    setDescription(initialValues.description ?? "");
    setColor(initialValues.color ?? config.defaultColor ?? "#0f766e");
    setNoteType(initialValues.note_type ?? "general");
    setIsArchived(Boolean(initialValues.is_archived));
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, initialValues, config.defaultColor, variant, mode]);

  if (!open) {
    return null;
  }

  const subtitle =
    (variant === "note" || variant === "subnote") && selectionLabel
      ? `Create a note in ${selectionLabel}.`
      : config.subtitle;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      description: config.showDescription ? description.trim() : undefined,
      color: config.showColor ? color : undefined,
      note_type: config.showType ? noteType : undefined,
      is_archived: config.showArchive ? isArchived : undefined,
    });
  };

  return (
    <NotesModal
      title={config.title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="submit"
            form="notes-create-form"
            className="button-primary"
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : config.submitLabel}
          </button>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </>
      }
    >
      <form id="notes-create-form" className="form notes-create-form" onSubmit={handleSubmit}>
        <label>
          {config.nameLabel}
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={config.namePlaceholder}
            required
          />
        </label>

        {config.showDescription && (
          <label>
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
          </label>
        )}

        {config.showColor && (
          <label className="notes-color-field">
            Color
            <div className="notes-color-input-row">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label="Choose color"
              />
              <span className="notes-color-value">{color}</span>
            </div>
          </label>
        )}

        {config.showType && (
          <label>
            Note type
            <select value={noteType} onChange={(event) => setNoteType(event.target.value)}>
              {NOTE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {config.showArchive && (
          <label className="checkbox-field">
            <span className="checkbox-row">
              <input
                type="checkbox"
                checked={isArchived}
                onChange={(event) => setIsArchived(event.target.checked)}
              />
              <span>Archive this notebook</span>
            </span>
          </label>
        )}

        {error && <p className="error">{error}</p>}
      </form>
    </NotesModal>
  );
}

export default NotesCreateModal;
