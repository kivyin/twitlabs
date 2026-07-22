import { useEffect, useMemo, useState } from "react";
import { findNoteExpandKeys, formatNoteDate, getNoteTypeLabel, notePreview } from "../../utils/noteUtils";

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={`notes-outline-chevron${expanded ? " expanded" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function OutlineActions({ onAdd, onEdit, addTitle, editTitle }) {
  return (
    <span className="notes-outline-actions">
      {onAdd && (
        <button type="button" className="notes-outline-action" title={addTitle} onClick={onAdd}>
          +
        </button>
      )}
      {onEdit && (
        <button type="button" className="notes-outline-action" title={editTitle} onClick={onEdit}>
          <EditIcon />
        </button>
      )}
    </span>
  );
}

function NoteOutlineNodes({
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
      <li key={note.id} className="notes-outline-node notes-outline-note" data-depth={depth}>
        <div className={`notes-outline-row${isActive ? " active" : ""}`}>
          <button
            type="button"
            className={`notes-outline-toggle${hasChildren ? "" : " placeholder"}`}
            aria-label={expanded ? "Collapse sub-notes" : "Expand sub-notes"}
            aria-expanded={hasChildren ? expanded : undefined}
            onClick={() => hasChildren && onToggleCollapse(key)}
            disabled={!hasChildren}
          >
            {hasChildren ? <ChevronIcon expanded={expanded} /> : null}
          </button>

          <button
            type="button"
            className="notes-outline-label"
            onClick={() => onSelectNote(note.id)}
          >
            <span className="notes-outline-text">
              {note.is_pinned && <span className="notes-outline-pin">Pinned</span>}
              {note.title}
            </span>
          </button>
        </div>

        {hasChildren && expanded && (
          <ul className="notes-outline-children">
            <NoteOutlineNodes
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

function TopicOutlineNodes({
  topics,
  notebookId,
  subjectId,
  selection,
  selectedNoteId,
  collapsedKeys,
  onToggleCollapse,
  onSelect,
  onSelectNote,
  onCreate,
  onEdit,
  depth = 2,
}) {
  return topics.map((topic) => {
    const key = `topic-${topic.id}`;
    const subtopics = topic.subtopics ?? [];
    const topicNotes = topic.notes ?? [];
    const hasChildren = subtopics.length > 0 || topicNotes.length > 0;
    const expanded = !collapsedKeys.has(key);
    const isActive = selection.topicId === topic.id && !selectedNoteId;

    return (
      <li key={topic.id} className="notes-outline-node" data-depth={depth}>
        <div className={`notes-outline-row${isActive ? " active" : ""}`}>
          <button
            type="button"
            className={`notes-outline-toggle${hasChildren ? "" : " placeholder"}`}
            aria-label={expanded ? "Collapse topic" : "Expand topic"}
            aria-expanded={hasChildren ? expanded : undefined}
            onClick={() => hasChildren && onToggleCollapse(key)}
            disabled={!hasChildren}
          >
            {hasChildren ? <ChevronIcon expanded={expanded} /> : null}
          </button>

          <button
            type="button"
            className="notes-outline-label"
            onClick={() =>
              onSelect({ notebookId, subjectId, topicId: topic.id })
            }
          >
            <span className="notes-outline-text">{topic.name}</span>
          </button>

          <OutlineActions
            addTitle="Add sub-topic"
            editTitle="Edit topic"
            onAdd={() => onCreate("subtopic", { subjectId, parentTopicId: topic.id })}
            onEdit={() =>
              onEdit("topic", {
                id: topic.id,
                name: topic.name,
                description: topic.description ?? "",
              })
            }
          />
        </div>

        {hasChildren && expanded && (
          <ul className="notes-outline-children">
            <TopicOutlineNodes
              topics={subtopics}
              notebookId={notebookId}
              subjectId={subjectId}
              selection={selection}
              selectedNoteId={selectedNoteId}
              collapsedKeys={collapsedKeys}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              onSelectNote={onSelectNote}
              onCreate={onCreate}
              onEdit={onEdit}
              depth={depth + 1}
            />
            <NoteOutlineNodes
              notes={topicNotes}
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

function NotesSearchResults({ results, selectedNoteId, onSelectNote }) {
  if (results.length === 0) {
    return <p className="subtext notes-sidebar-empty">No notes match your search.</p>;
  }

  return (
    <div className="notes-sidebar-results">
      <p className="notes-sidebar-results-count subtext">{results.length} results</p>
      <div className="notes-sidebar-results-list">
        {results.map((note) => (
          <button
            key={note.id}
            type="button"
            className={`notes-sidebar-result${selectedNoteId === note.id ? " active" : ""}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="notes-list-item-top">
              <strong>{note.title}</strong>
              {note.is_pinned && <span className="notes-pin-badge">Pinned</span>}
            </div>
            <p>{notePreview(note)}</p>
            <div className="notes-list-item-meta">
              {note.notebook_name && <span>{note.notebook_name}</span>}
              <span>{getNoteTypeLabel(note.note_type)}</span>
              <span>{formatNoteDate(note.updated_on)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NotesTreePanel({
  tree,
  selection,
  search,
  onSearchChange,
  searchResults,
  selectedNoteId,
  onSelectNote,
  onSelect,
  onCreate,
  onEdit,
}) {
  const [collapsedKeys, setCollapsedKeys] = useState(new Set());

  const notebookKeys = useMemo(
    () => new Set(tree.map((notebook) => `notebook-${notebook.id}`)),
    [tree]
  );

  useEffect(() => {
    setCollapsedKeys((current) => {
      const next = new Set(current);
      for (const key of next) {
        if (key.startsWith("notebook-") && !notebookKeys.has(key)) {
          next.delete(key);
        }
      }
      return next;
    });
  }, [notebookKeys]);

  useEffect(() => {
    if (!selectedNoteId || search.trim()) {
      return;
    }

    const expandKeys = findNoteExpandKeys(tree, selectedNoteId);
    if (expandKeys.length === 0) {
      return;
    }

    setCollapsedKeys((current) => {
      const next = new Set(current);
      let changed = false;
      for (const key of expandKeys) {
        if (next.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [selectedNoteId, tree, search]);

  const toggleCollapse = (key) => {
    setCollapsedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <aside className="notes-tree-panel panel notes-outline-panel">
      <label className="notes-sidebar-search">
        Search all notes
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title or content"
        />
      </label>

      {search.trim() ? (
        <NotesSearchResults
          results={searchResults}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
        />
      ) : (
        <>
          <div className="notes-tree-header">
            <h2>Outline</h2>
            <button type="button" className="linkish-button" onClick={() => onCreate("notebook")}>
              + Notebook
            </button>
          </div>

          {tree.length === 0 ? (
            <p className="subtext">Create your first notebook to get started.</p>
          ) : (
            <ul className="notes-outline">
          {tree.map((notebook) => {
            const notebookKey = `notebook-${notebook.id}`;
            const subjects = notebook.subjects ?? [];
            const notebookNotes = notebook.notes ?? [];
            const hasChildren = subjects.length > 0 || notebookNotes.length > 0;
            const notebookExpanded = !collapsedKeys.has(notebookKey);
            const notebookActive =
              selection.notebookId === notebook.id &&
              !selection.subjectId &&
              !selection.topicId &&
              !selectedNoteId;

            return (
              <li key={notebook.id} className="notes-outline-node" data-depth="0">
                <div className={`notes-outline-row notes-outline-row-notebook${notebookActive ? " active" : ""}`}>
                  <button
                    type="button"
                    className={`notes-outline-toggle${hasChildren ? "" : " placeholder"}`}
                    aria-label={notebookExpanded ? "Collapse notebook" : "Expand notebook"}
                    aria-expanded={hasChildren ? notebookExpanded : undefined}
                    onClick={() => hasChildren && toggleCollapse(notebookKey)}
                    disabled={!hasChildren}
                  >
                    {hasChildren ? <ChevronIcon expanded={notebookExpanded} /> : null}
                  </button>

                  <button
                    type="button"
                    className="notes-outline-label"
                    onClick={() =>
                      onSelect({ notebookId: notebook.id, subjectId: null, topicId: null })
                    }
                  >
                    <span className="notes-outline-text">{notebook.name}</span>
                  </button>

                  <OutlineActions
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

                {hasChildren && notebookExpanded && (
                  <ul className="notes-outline-children">
                    {subjects.map((subject) => {
                      const subjectKey = `subject-${subject.id}`;
                      const topics = subject.topics ?? [];
                      const subjectNotes = subject.notes ?? [];
                      const subjectHasChildren = topics.length > 0 || subjectNotes.length > 0;
                      const subjectExpanded = !collapsedKeys.has(subjectKey);
                      const subjectActive =
                        selection.subjectId === subject.id && !selection.topicId && !selectedNoteId;

                      return (
                        <li key={subject.id} className="notes-outline-node" data-depth="1">
                          <div className={`notes-outline-row${subjectActive ? " active" : ""}`}>
                            <button
                              type="button"
                              className={`notes-outline-toggle${subjectHasChildren ? "" : " placeholder"}`}
                              aria-label={subjectExpanded ? "Collapse subject" : "Expand subject"}
                              aria-expanded={subjectHasChildren ? subjectExpanded : undefined}
                              onClick={() => subjectHasChildren && toggleCollapse(subjectKey)}
                              disabled={!subjectHasChildren}
                            >
                              {subjectHasChildren ? <ChevronIcon expanded={subjectExpanded} /> : null}
                            </button>

                            <button
                              type="button"
                              className="notes-outline-label"
                              onClick={() =>
                                onSelect({
                                  notebookId: notebook.id,
                                  subjectId: subject.id,
                                  topicId: null,
                                })
                              }
                            >
                              <span className="notes-outline-text">{subject.name}</span>
                            </button>

                            <OutlineActions
                              addTitle="Add topic"
                              editTitle="Edit subject"
                              onAdd={() =>
                                onCreate("topic", {
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

                          {subjectHasChildren && subjectExpanded && (
                            <ul className="notes-outline-children">
                              <TopicOutlineNodes
                                topics={topics}
                                notebookId={notebook.id}
                                subjectId={subject.id}
                                selection={selection}
                                selectedNoteId={selectedNoteId}
                                collapsedKeys={collapsedKeys}
                                onToggleCollapse={toggleCollapse}
                                onSelect={onSelect}
                                onSelectNote={onSelectNote}
                                onCreate={onCreate}
                                onEdit={onEdit}
                              />
                              <NoteOutlineNodes
                                notes={subjectNotes}
                                depth={2}
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
                    <NoteOutlineNodes
                      notes={notebookNotes}
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
            </ul>
          )}
        </>
      )}
    </aside>
  );
}

export default NotesTreePanel;
