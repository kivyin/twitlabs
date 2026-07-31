import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getNotes, getNotesSummary, getNotesTree } from "../../api/notesApi";
import PageHeader from "../../components/PageHeader";
import {
  buildNotesBrowsePath,
  formatNoteDate,
  getNoteTypeLabel,
  notePreview,
} from "../../utils/noteUtils";

function NotesHomePage() {
  const appName = "notes";
  const [summary, setSummary] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [summaryResult, recentResult, treeResult] = await Promise.all([
          getNotesSummary(),
          getNotes({ recent: 1 }),
          getNotesTree(),
        ]);
        setSummary(summaryResult.summary);
        setRecentNotes(recentResult.notes ?? []);
        setNotebooks(treeResult.tree ?? []);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    load();
  }, []);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Notes" }]}
        title="Notes"
        subtitle="OneNote-style notebooks with subjects, rich text, sub-notes, and task links."
        actions={
          <Link to={`/app/${appName}/browse`} className="button-primary">
            Open Workspace
          </Link>
        }
      />

      {error && <p className="error">{error}</p>}

      <section className="notes-summary-grid">
        <article className="panel notes-stat-card">
          <span>Notebooks</span>
          <strong>{summary?.notebook_count ?? 0}</strong>
        </article>
        <article className="panel notes-stat-card">
          <span>Notes</span>
          <strong>{summary?.note_count ?? 0}</strong>
        </article>
        <article className="panel notes-stat-card">
          <span>Pinned</span>
          <strong>{summary?.pinned_count ?? 0}</strong>
        </article>
      </section>

      <div className="notes-home-layout">
        <section className="panel">
          <div className="notes-section-header">
            <h2>Your Notebooks</h2>
            <Link to={`/app/${appName}/browse`}>Manage in workspace</Link>
          </div>
          {notebooks.length === 0 ? (
            <p className="subtext">No notebooks yet. Open the workspace to create one.</p>
          ) : (
            <div className="notes-notebook-grid">
              {notebooks.map((notebook) => (
                <Link
                  key={notebook.id}
                  to={buildNotesBrowsePath(appName, { notebookId: notebook.id })}
                  className="notes-notebook-card"
                  style={{ borderColor: notebook.color }}
                >
                  <strong>{notebook.name}</strong>
                  <span>{notebook.subjects?.length ?? 0} subjects</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="notes-section-header">
            <h2>Recent Notes</h2>
            <Link to={`/app/${appName}/recent`}>View all</Link>
          </div>
          {recentNotes.length === 0 ? (
            <p className="subtext">No notes yet.</p>
          ) : (
            <ul className="notes-recent-list">
              {recentNotes.slice(0, 8).map((note) => (
                <li key={note.id}>
                  <Link to={`/app/${appName}/browse?note=${note.id}`}>
                    <strong>{note.title}</strong>
                  </Link>
                  <p>{notePreview(note)}</p>
                  <div className="notes-list-item-meta">
                    <span>{getNoteTypeLabel(note.note_type)}</span>
                    <span>{note.notebook_name || "Unfiled"}</span>
                    <span>{formatNoteDate(note.updated_on)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default NotesHomePage;
