import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getNotes } from "../../api/notesApi";
import PageHeader from "../../components/PageHeader";
import { formatNoteDate, getNoteTypeLabel, notePreview } from "../../utils/noteUtils";

function NotesRecentPage() {
  const { appName = "notes" } = useParams();
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getNotes({ recent: 1 })
      .then((result) => setNotes(result.notes ?? []))
      .catch((loadError) => setError(loadError.message));
  }, []);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Notes", to: `/app/${appName}` },
          { label: "Recent Notes" },
        ]}
        title="Recent Notes"
        subtitle="Your latest notes across all notebooks."
        actions={
          <Link to={`/app/${appName}/browse`} className="button-primary">
            Open Workspace
          </Link>
        }
      />

      {error && <p className="error">{error}</p>}

      {notes.length === 0 ? (
        <section className="panel empty-state">
          <p className="subtext">No notes yet.</p>
        </section>
      ) : (
        <div className="notes-recent-page-list">
          {notes.map((note) => (
            <article key={note.id} className="panel notes-recent-card">
              <Link to={`/app/${appName}/browse?note=${note.id}`}>
                <h2>{note.title}</h2>
              </Link>
              <p>{notePreview(note)}</p>
              <div className="notes-list-item-meta">
                <span>{getNoteTypeLabel(note.note_type)}</span>
                <span>{note.notebook_name || "Unfiled"}</span>
                {note.task_title && <span>Task: {note.task_title}</span>}
                <span>{formatNoteDate(note.updated_on)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default NotesRecentPage;
