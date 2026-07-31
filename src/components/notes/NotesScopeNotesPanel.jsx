import { useEffect, useState } from "react";
import { getNotes } from "../../api/notesApi";
import { formatNoteDate, getNoteTypeLabel, notePreview } from "../../utils/noteUtils";
import NoteTypeIcon from "./NoteTypeIcon";

function NotesScopeNotesPanel({
  selection,
  selectionLabel,
  onOpenNote,
  onNewNote,
  onNewSubject,
}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasSubject = Boolean(selection.subjectId);
  const title = hasSubject ? "Notes in this subject" : "Notes in this notebook";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selection.notebookId) {
        setNotes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const filters = {
          notebook_id: selection.notebookId,
          top_level_only: "0",
        };
        if (selection.subjectId) filters.subject_id = selection.subjectId;

        const result = await getNotes(filters);
        if (!cancelled) {
          setNotes(result.notes ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setNotes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selection.notebookId, selection.subjectId]);

  return (
    <section className="notes-scope-panel panel">
      <div className="notes-scope-panel-actions">
        <button type="button" className="button-primary" onClick={onNewNote}>
          New Note
        </button>
        {!hasSubject && (
          <button type="button" className="button" onClick={onNewSubject}>
            New Subject
          </button>
        )}
      </div>

      <div className="notes-scope-panel-header">
        <h2>{title}</h2>
        {selectionLabel ? <p className="subtext">{selectionLabel}</p> : null}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="subtext">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="subtext">No notes here yet. Create one to get started.</p>
      ) : (
        <ul className="notes-scope-list">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="notes-scope-list-item"
                onClick={() => onOpenNote(note.id)}
              >
                <span className="notes-scope-list-title">
                  <NoteTypeIcon type={note.note_type} />
                  {note.title || "Untitled note"}
                </span>
                <span className="notes-scope-list-preview">{notePreview(note, 100)}</span>
                <span className="notes-list-item-meta">
                  <span>{getNoteTypeLabel(note.note_type)}</span>
                  {note.subject_name ? <span>{note.subject_name}</span> : null}
                  <span>{formatNoteDate(note.updated_on)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default NotesScopeNotesPanel;
