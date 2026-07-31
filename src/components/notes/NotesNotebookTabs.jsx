import { useState } from "react";
import NoteTypeIcon from "./NoteTypeIcon";

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={`notes-outline-chevron${expanded ? " expanded" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function TabActions({ onAdd, onEdit, addTitle, editTitle }) {
  return (
    <span className="notes-tab-actions">
      {onAdd && (
        <button type="button" className="notes-tab-action" title={addTitle} onClick={onAdd}>
          +
        </button>
      )}
      {onEdit && (
        <button type="button" className="notes-tab-action" title={editTitle} onClick={onEdit}>
          ✎
        </button>
      )}
    </span>
  );
}

function NoteNodes({
  notes,
  depth,
  selectedNoteId,
  collapsedKeys,
  onToggleCollapse,
  onSelectNote,
}) {
  return (notes ?? []).map((note) => {
    const key = `note-${note.id}`;
    const childNotes = note.notes ?? [];
    const hasChildren = childNotes.length > 0;
    const expanded = !collapsedKeys.has(key);
    const isActive = selectedNoteId === note.id;

    return (
      <li key={note.id} className="notes-tab-outline-node notes-tab-outline-note" data-depth={depth}>
        <div className={`notes-tab-outline-row${isActive ? " active" : ""}`}>
          <button
            type="button"
            className={`notes-outline-toggle${hasChildren ? "" : " placeholder"}`}
            aria-label={expanded ? "Collapse sub-notes" : "Expand sub-notes"}
            onClick={() => hasChildren && onToggleCollapse(key)}
            disabled={!hasChildren}
          >
            {hasChildren ? <ChevronIcon expanded={expanded} /> : null}
          </button>
          <button type="button" className="notes-tab-outline-label" onClick={() => onSelectNote(note.id)}>
            <NoteTypeIcon type={note.note_type} />
            <span className="notes-tab-outline-text">
              {note.is_pinned ? <span className="notes-outline-pin">Pinned</span> : null}
              {note.title || "Untitled note"}
            </span>
          </button>
        </div>
        {hasChildren && expanded && (
          <ul className="notes-tab-outline-children">
            <NoteNodes
              notes={childNotes}
              depth={depth + 1}
              selectedNoteId={selectedNoteId}
              collapsedKeys={collapsedKeys}
              onToggleCollapse={onToggleCollapse}
              onSelectNote={onSelectNote}
            />
          </ul>
        )}
      </li>
    );
  });
}

function NotesNotebookTabs({
  notebook,
  selection,
  selectedNoteId,
  onSelect,
  onSelectNote,
  onCreate,
  onEdit,
}) {
  const [collapsedKeys, setCollapsedKeys] = useState(new Set());
  const subjects = notebook?.subjects ?? [];
  const notebookNotes = notebook?.notes ?? [];
  const tabColor = notebook?.color || "var(--brand)";

  const toggleCollapse = (key) => {
    setCollapsedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!notebook) return null;

  const hasOutline = subjects.length > 0 || notebookNotes.length > 0;

  return (
    <aside
      className="notes-notebook-tabs"
      aria-label={`${notebook.name} outline`}
      style={{ "--note-tab-color": tabColor }}
    >
      <div className="notes-outline-tab">
        <div className="notes-outline-tab-header">
          <div className="notes-notebook-tabs-title">
            <span className="notes-notebook-tabs-swatch" aria-hidden="true" />
            <strong>{notebook.name}</strong>
          </div>
          <TabActions
            addTitle="Add subject"
            editTitle="Edit notebook"
            onAdd={() => onCreate("subject", { notebookId: notebook.id })}
            onEdit={() =>
              onEdit("notebook", {
                id: notebook.id,
                name: notebook.name,
                description: notebook.description ?? "",
                color: notebook.color,
                is_archived: notebook.is_archived,
              })
            }
          />
        </div>

        <div className="notes-outline-tab-body">
          {!hasOutline ? (
            <p className="subtext notes-outline-tab-empty">
              Add a subject or note to build this notebook’s outline.
            </p>
          ) : (
            <ul className="notes-tab-outline">
              {subjects.map((subject) => {
                const subjectKey = `subject-${subject.id}`;
                const subjectNotes = subject.notes ?? [];
                const hasChildren = subjectNotes.length > 0;
                const expanded = !collapsedKeys.has(subjectKey);
                const isActive = selection.subjectId === subject.id && !selectedNoteId;
                const subjectColor = subject.color || notebook.color || "#14b8a6";

                return (
                  <li
                    key={subject.id}
                    className="notes-tab-outline-node notes-tab-outline-subject"
                    style={{ "--note-tab-color": subjectColor }}
                  >
                    <div className={`notes-tab-outline-row${isActive ? " active" : ""}`}>
                      <button
                        type="button"
                        className={`notes-outline-toggle${hasChildren ? "" : " placeholder"}`}
                        aria-label={expanded ? "Collapse subject" : "Expand subject"}
                        onClick={() => hasChildren && toggleCollapse(subjectKey)}
                        disabled={!hasChildren}
                      >
                        {hasChildren ? <ChevronIcon expanded={expanded} /> : null}
                      </button>
                      <button
                        type="button"
                        className="notes-tab-outline-label"
                        onClick={() =>
                          onSelect({
                            notebookId: notebook.id,
                            subjectId: subject.id,
                          })
                        }
                      >
                        <span
                          className="notes-tab-color-swatch"
                          style={{ background: subjectColor }}
                          aria-hidden="true"
                        />
                        <span className="notes-tab-outline-text">{subject.name}</span>
                      </button>
                      <TabActions
                        addTitle="Add note"
                        editTitle="Edit subject"
                        onAdd={() =>
                          onCreate("note", {
                            notebookId: notebook.id,
                            subjectId: subject.id,
                          })
                        }
                        onEdit={() =>
                          onEdit("subject", {
                            id: subject.id,
                            name: subject.name,
                            description: subject.description ?? "",
                            color: subject.color,
                          })
                        }
                      />
                    </div>

                    {hasChildren && expanded && (
                      <ul className="notes-tab-outline-children">
                        <NoteNodes
                          notes={subjectNotes}
                          depth={1}
                          selectedNoteId={selectedNoteId}
                          collapsedKeys={collapsedKeys}
                          onToggleCollapse={toggleCollapse}
                          onSelectNote={onSelectNote}
                        />
                      </ul>
                    )}
                  </li>
                );
              })}

              <NoteNodes
                notes={notebookNotes}
                depth={0}
                selectedNoteId={selectedNoteId}
                collapsedKeys={collapsedKeys}
                onToggleCollapse={toggleCollapse}
                onSelectNote={onSelectNote}
              />
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

export default NotesNotebookTabs;
