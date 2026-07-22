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
  selectionLabel,
  onSaved,
  onDeleted,
  onCreateSubNote,
  onNoteLoaded,
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

  useEffect(() => {
    onNoteLoadedRef.current = onNoteLoaded;
  }, [onNoteLoaded]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

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
        setIsFullscreen(false);
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

    const payload = {
      title: form.title.trim(),
      note_type: form.note_type,
      content_html: form.content_html,
      content_mode: "mixed",
      content_drawing: form.content_drawing,
      show_grid: form.show_grid,
      task_id: form.task_id || null,
      is_pinned: form.is_pinned,
      notebook_id: selection.notebookId,
      subject_id: selection.subjectId,
      topic_id: selection.topicId,
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

  if (loading) {
    return (
      <section className="notes-editor-panel panel">
        <p className="subtext">Loading note...</p>
      </section>
    );
  }

  const placementLabel =
    meta.notebook_name
      ? [meta.notebook_name, meta.subject_name, meta.topic_name].filter(Boolean).join(" › ")
      : selectionLabel && selectionLabel !== "All notebooks"
        ? selectionLabel
        : "";

  return (
    <>
      <section className={`notes-editor-panel panel${isFullscreen ? " notes-editor-panel--fullscreen" : ""}`}>
        <div className="notes-editor-header">
          <div className="notes-editor-heading">
            {placementLabel && (
              <p className="notes-editor-breadcrumb">{placementLabel}</p>
            )}
            <input
              type="text"
              className="notes-title-input"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Note title"
            />
          </div>
          <div className="notes-editor-actions">
            <label className="notes-pin-toggle">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(event) =>
                  setForm((current) => ({ ...current, is_pinned: event.target.checked }))
                }
              />
              Pin
            </label>
            <button type="button" className="button-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className="danger-button" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </button>
          </div>
        </div>

        {!isFullscreen && (
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
        )}

        <div className="notes-editor-content">
          <NoteContentEditor
            contentHtml={form.content_html}
            onContentHtmlChange={(contentHtml) =>
              setForm((current) => ({ ...current, content_html: contentHtml }))
            }
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
          />
        </div>

        {!isFullscreen && (
        <>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-text">{status}</p>}

        <section className="notes-subnotes panel inset-panel">
          <div className="notes-subnotes-header">
            <h3>Sub-notes</h3>
            <button type="button" className="linkish-button" onClick={() => onCreateSubNote?.(noteId)}>
              + Add sub-note
            </button>
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
