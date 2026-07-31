import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getTasks } from "../../api/tasksApi";
import { deleteNote, getNote, updateNote } from "../../api/notesApi";
import ConfirmModal from "../common/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { formatNoteDate, getNoteTypeLabel, NOTE_TYPES } from "../../utils/noteUtils";
import { normalizeNoteContentMode } from "../../utils/noteDrawing";
import NoteContentEditor from "./NoteContentEditor";

function NoteEditorPanel({
  appName,
  noteId,
  selection,
  startInEditMode = false,
  onSaved,
  onDeleted,
  onCreateSubNote,
  onNoteLoaded,
  onChromeChange,
}) {
  const { canAccessApp } = useAuth();
  const [form, setForm] = useState({
    title: "",
    note_type: "general",
    content_html: "",
    content_mode: "mixed",
    content_drawing: "",
    show_grid: false,
    task_id: "",
    is_pinned: false,
  });
  const [isEditing, setIsEditing] = useState(Boolean(startInEditMode));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subNotes, setSubNotes] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const onNoteLoadedRef = useRef(onNoteLoaded);
  const onChromeChangeRef = useRef(onChromeChange);
  const startInEditModeRef = useRef(startInEditMode);
  const formRef = useRef(form);
  const metaRef = useRef(meta);

  useEffect(() => {
    onNoteLoadedRef.current = onNoteLoaded;
  }, [onNoteLoaded]);

  useEffect(() => {
    onChromeChangeRef.current = onChromeChange;
  }, [onChromeChange]);

  useEffect(() => {
    startInEditModeRef.current = startInEditMode;
  }, [startInEditMode]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setStatus("");
      setIsEditing(Boolean(startInEditModeRef.current));
      setIsFullscreen(false);

      try {
        const result = await getNote(noteId);
        if (!active) return;
        const note = result.note;
        setForm({
          title: note.title ?? "",
          note_type: note.note_type ?? "general",
          content_html: note.content_html ?? "",
          content_mode: normalizeNoteContentMode(note.content_mode),
          content_drawing: note.content_drawing ?? "",
          show_grid: Boolean(note.show_grid),
          task_id: note.task_id ? String(note.task_id) : "",
          is_pinned: Boolean(note.is_pinned),
        });
        setSubNotes(note.sub_notes ?? []);
        setMeta(note);
        onNoteLoadedRef.current?.(note);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      onChromeChangeRef.current?.(null);
    };
  }, [noteId]);

  useEffect(() => {
    if (!canAccessApp("tasks")) return;

    getTasks({ view: "all" })
      .then((result) => setTaskOptions(result.tasks ?? []))
      .catch(() => setTaskOptions([]));
  }, [canAccessApp]);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setStatus("");

    const current = formRef.current;
    const payload = {
      title: current.title.trim(),
      note_type: current.note_type,
      content_html: current.content_html,
      content_mode: "mixed",
      content_drawing: current.content_drawing,
      show_grid: current.show_grid,
      task_id: current.task_id || null,
      is_pinned: current.is_pinned,
      notebook_id: selection.notebookId,
      subject_id: selection.subjectId,
    };

    try {
      const result = await updateNote(noteId, payload);
      setStatus("Saved.");
      setMeta(result.note);
      onSaved?.(result.note);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote(noteId);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleDoneEditing = () => {
    setIsEditing(false);
    setIsFullscreen(false);
    setStatus("");
  };

  const handleImagesLocalized = async (contentHtml) => {
    setForm((current) => ({ ...current, content_html: contentHtml }));
    try {
      const current = formRef.current;
      const result = await updateNote(noteId, {
        title: current.title.trim(),
        note_type: current.note_type,
        content_html: contentHtml,
        content_mode: "mixed",
        content_drawing: current.content_drawing,
        show_grid: current.show_grid,
        task_id: current.task_id || null,
        is_pinned: current.is_pinned,
        notebook_id: selection.notebookId,
        subject_id: selection.subjectId,
      });
      setMeta(result.note);
      setStatus("Images saved into this note.");
      onSaved?.(result.note);
    } catch {
      setStatus("Images embedded locally — click Save to keep them.");
    }
  };

  useEffect(() => {
    if (loading) {
      onChromeChangeRef.current?.(null);
      return;
    }

    onChromeChangeRef.current?.({
      title: form.title ?? "",
      displayTitle: form.title.trim() || "Untitled note",
      isEditing,
      saving,
      isPinned: form.is_pinned,
      onTitleChange: (title) =>
        setForm((current) => ({ ...current, title })),
      onEdit: () => setIsEditing(true),
      onDone: handleDoneEditing,
      onSave: () => {
        void handleSave();
      },
      onDelete: () => setShowDeleteConfirm(true),
      onTogglePin: () =>
        setForm((current) => ({ ...current, is_pinned: !current.is_pinned })),
    });
  }, [loading, form.title, form.is_pinned, isEditing, saving]);

  if (loading) {
    return (
      <section className="notes-editor-panel panel">
        <p className="subtext">Loading note...</p>
      </section>
    );
  }

  const linkedTask = taskOptions.find((task) => String(task.id) === String(form.task_id));
  const readOnly = !isEditing;

  return (
    <>
      <section
        className={`notes-editor-panel panel${isFullscreen ? " notes-editor-panel--fullscreen" : ""}${
          readOnly ? " notes-editor-panel--readonly" : ""
        }`}
      >
        {!isFullscreen &&
          (readOnly ? (
            <div className="notes-editor-meta notes-editor-meta--readonly">
              <span className="notes-view-meta-item">
                <span className="notes-view-meta-label">Type</span>
                {getNoteTypeLabel(form.note_type)}
              </span>
              {linkedTask && (
                <span className="notes-view-meta-item">
                  <span className="notes-view-meta-label">Task</span>
                  {linkedTask.title}
                </span>
              )}
              {meta.updated_on && (
                <span className="notes-view-meta-item">
                  <span className="notes-view-meta-label">Updated</span>
                  {formatNoteDate(meta.updated_on)}
                </span>
              )}
              {meta.parent_note_title && (
                <span className="notes-view-meta-item">
                  <span className="notes-view-meta-label">Sub-note of</span>
                  {meta.parent_note_title}
                </span>
              )}
            </div>
          ) : (
            <div className="notes-editor-meta panel inset-panel">
              <label>
                Note type
                <select
                  value={form.note_type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, note_type: event.target.value }))
                  }
                >
                  {NOTE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {canAccessApp("tasks") && (
                <label>
                  Linked task
                  <select
                    value={form.task_id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, task_id: event.target.value }))
                    }
                  >
                    <option value="">No linked task</option>
                    {taskOptions.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {meta.parent_note_title && (
                <p className="subtext notes-parent-note">Sub-note of: {meta.parent_note_title}</p>
              )}
            </div>
          ))}

        <div className="notes-editor-content">
          <NoteContentEditor
            contentHtml={form.content_html}
            onContentHtmlChange={(contentHtml) =>
              setForm((current) => ({ ...current, content_html: contentHtml }))
            }
            onImagesLocalized={handleImagesLocalized}
            contentDrawing={form.content_drawing}
            onContentDrawingChange={(contentDrawing) =>
              setForm((current) => ({ ...current, content_drawing: contentDrawing }))
            }
            showGrid={form.show_grid}
            onShowGridChange={(showGrid) =>
              setForm((current) => ({ ...current, show_grid: showGrid }))
            }
            isFullscreen={isFullscreen}
            onFullscreenChange={setIsFullscreen}
            readOnly={readOnly}
          />
        </div>

        {!isFullscreen && (
          <>
            {error && <p className="error">{error}</p>}
            {status && <p className="status-text">{status}</p>}

            <section className="notes-subnotes panel inset-panel">
              <div className="notes-subnotes-header">
                <h3>Sub-notes</h3>
                {!readOnly && (
                  <button type="button" className="linkish-button" onClick={() => onCreateSubNote?.(noteId)}>
                    + Add sub-note
                  </button>
                )}
              </div>
              {subNotes.length === 0 ? (
                <p className="subtext">No sub-notes yet.</p>
              ) : (
                <ul className="notes-subnotes-list">
                  {subNotes.map((subNote) => (
                    <li key={subNote.id}>
                      <Link to={`/app/${appName}/browse?note=${subNote.id}`}>
                        <strong>{subNote.title}</strong>
                      </Link>
                      <span>{getNoteTypeLabel(subNote.note_type)}</span>
                      <span>{formatNoteDate(subNote.updated_on)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {isFullscreen && (
          <>
            {error && <p className="error">{error}</p>}
            {status && <p className="status-text">{status}</p>}
          </>
        )}
      </section>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete note?"
          message="This will permanently delete the note and all of its sub-notes."
          confirmLabel="Delete note"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

export default NoteEditorPanel;
