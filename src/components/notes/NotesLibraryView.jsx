import { formatNoteDate, getNoteTypeLabel, notePreview } from "../../utils/noteUtils";

function NotesLibraryView({
  notebooks,
  search,
  onSearchChange,
  searchResults,
  onOpenNotebook,
  onCreateNotebook,
  onEditNotebook,
  onOpenNote,
}) {
  const query = search.trim();
  const showingSearch = Boolean(query);

  return (
    <section className="notes-library panel">
      <div className="notes-library-header">
        <div>
          <h2>Notebooks</h2>
          <p className="subtext">Open a notebook, or search every note like a knowledge base.</p>
        </div>
        <button type="button" className="button-primary" onClick={onCreateNotebook}>
          New notebook
        </button>
      </div>

      <label className="notes-library-search">
        Search all notebooks
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search titles and note content"
        />
      </label>

      {showingSearch ? (
        <div className="notes-kb-results">
          <p className="notes-kb-results-count subtext">
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for “{query}”
          </p>
          {searchResults.length === 0 ? (
            <p className="subtext">No notes match that search.</p>
          ) : (
            <div className="notes-kb-results-list">
              {searchResults.map((note) => (
                <article key={note.id} className="notes-kb-card">
                  <button
                    type="button"
                    className="notes-kb-card-link"
                    onClick={() => onOpenNote(note)}
                  >
                    <h3>{note.title || "Untitled note"}</h3>
                    <p>{notePreview(note)}</p>
                  </button>
                  <div className="notes-list-item-meta">
                    <span>{getNoteTypeLabel(note.note_type)}</span>
                    <span>
                      {[note.notebook_name, note.subject_name]
                        .filter(Boolean)
                        .join(" › ") || "Unfiled"}
                    </span>
                    <span>{formatNoteDate(note.updated_on)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : notebooks.length === 0 ? (
        <div className="notes-library-empty">
          <h3>Create your first notebook</h3>
          <p className="subtext">Notebooks hold subjects and notes.</p>
          <button type="button" className="button-primary" onClick={onCreateNotebook}>
            New notebook
          </button>
        </div>
      ) : (
        <div className="notes-notebook-grid notes-library-grid">
          {notebooks.map((notebook) => (
            <article
              key={notebook.id}
              className="notes-notebook-card notes-library-card"
              style={{
                "--note-tab-color": notebook.color || "var(--brand)",
                borderColor: notebook.color || undefined,
              }}
            >
              <button
                type="button"
                className="notes-library-card-open"
                onClick={() => onOpenNotebook(notebook.id)}
              >
                <span className="notes-library-card-swatch" aria-hidden="true" />
                <strong>{notebook.name}</strong>
                <span>
                  {notebook.subjects?.length ?? 0} subject
                  {(notebook.subjects?.length ?? 0) === 1 ? "" : "s"}
                </span>
                {notebook.description ? (
                  <span className="notes-library-card-desc">{notebook.description}</span>
                ) : null}
              </button>
              <div className="notes-library-card-actions">
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => onEditNotebook(notebook)}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
          <button
            type="button"
            className="notes-notebook-card notes-library-card notes-library-card--create"
            onClick={onCreateNotebook}
          >
            <strong>+ New notebook</strong>
            <span>Start another binder</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default NotesLibraryView;
