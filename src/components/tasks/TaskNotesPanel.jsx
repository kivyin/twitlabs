import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createNote,
  createNotebook,
  createSubject,
  getNotes,
  getNotesTree,
  updateNote,
} from "../../api/notesApi";
import { NOTE_TYPES } from "../../utils/noteUtils";

const CREATE_NEW = "__create_new__";

function TaskNotesPanel({ taskId, taskTitle = "", appName = "notes" }) {
  const [tree, setTree] = useState([]);
  const [linkedNotes, setLinkedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [notebookId, setNotebookId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [noteId, setNoteId] = useState("");

  const [newNotebookName, setNewNotebookName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState(taskTitle || "");
  const [noteType, setNoteType] = useState("general");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [treeResult, notesResult] = await Promise.all([
          getNotesTree(),
          getNotes({ task_id: taskId }),
        ]);
        if (!active) return;
        setTree(treeResult.tree ?? []);
        setLinkedNotes(notesResult.notes ?? []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
        setTree([]);
        setLinkedNotes([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [taskId]);

  const refresh = async () => {
    const [treeResult, notesResult] = await Promise.all([
      getNotesTree(),
      getNotes({ task_id: taskId }),
    ]);
    setTree(treeResult.tree ?? []);
    setLinkedNotes(notesResult.notes ?? []);
  };

  const selectedNotebook = useMemo(
    () => tree.find((item) => String(item.id) === String(notebookId)) ?? null,
    [notebookId, tree]
  );
  const subjects = useMemo(() => selectedNotebook?.subjects ?? [], [selectedNotebook]);
  const selectedSubject = useMemo(
    () => subjects.find((item) => String(item.id) === String(subjectId)) ?? null,
    [subjectId, subjects]
  );

  const placementNotes = useMemo(() => {
    if (selectedSubject) {
      return selectedSubject.notes ?? [];
    }
    if (selectedNotebook) {
      return selectedNotebook.notes ?? [];
    }
    return [];
  }, [selectedNotebook, selectedSubject]);

  const linkableNotes = useMemo(
    () =>
      placementNotes.filter(
        (note) => !linkedNotes.some((linked) => Number(linked.id) === Number(note.id))
      ),
    [linkedNotes, placementNotes]
  );

  const creatingNotebook = notebookId === CREATE_NEW;
  const creatingSubject = subjectId === CREATE_NEW;
  const creatingNote = !noteId || noteId === CREATE_NEW;

  const handleNotebookChange = (value) => {
    setNotebookId(value);
    setSubjectId("");
    setNoteId("");
    setNewSubjectName("");
  };

  const handleSubjectChange = (value) => {
    setSubjectId(value);
    setNoteId("");
  };

  const ensurePlacement = async () => {
    let resolvedNotebookId = notebookId;
    let resolvedSubjectId = subjectId;

    if (creatingNotebook) {
      const name = newNotebookName.trim();
      if (!name) {
        throw new Error("Enter a notebook name.");
      }
      const result = await createNotebook({ name });
      resolvedNotebookId = String(result.notebook.id);
    }

    if (!resolvedNotebookId || resolvedNotebookId === CREATE_NEW) {
      throw new Error("Select or create a notebook.");
    }

    if (creatingSubject) {
      const name = newSubjectName.trim();
      if (!name) {
        throw new Error("Enter a subject name.");
      }
      const result = await createSubject({
        notebook_id: Number(resolvedNotebookId),
        name,
      });
      resolvedSubjectId = String(result.subject.id);
    }

    return {
      notebook_id: Number(resolvedNotebookId),
      subject_id:
        resolvedSubjectId && resolvedSubjectId !== CREATE_NEW
          ? Number(resolvedSubjectId)
          : null,
    };
  };

  const handleCreateOrLink = async () => {
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const placement = await ensurePlacement();

      if (noteId && noteId !== CREATE_NEW) {
        await updateNote(noteId, {
          task_id: Number(taskId),
          notebook_id: placement.notebook_id,
          subject_id: placement.subject_id,
        });
        setStatus("Existing note linked to this task.");
      } else {
        const title = newNoteTitle.trim() || taskTitle.trim() || "Untitled note";
        await createNote({
          title,
          note_type: noteType,
          task_id: Number(taskId),
          notebook_id: placement.notebook_id,
          subject_id: placement.subject_id,
        });
        setStatus("Note created and linked to this task.");
      }

      setNotebookId("");
      setSubjectId("");
      setNoteId("");
      setNewNotebookName("");
      setNewSubjectName("");
      setNewNoteTitle(taskTitle || "");
      await refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (note) => {
    setSaving(true);
    setError("");
    setStatus("");

    try {
      await updateNote(note.id, { task_id: null });
      setStatus(`Unlinked “${note.title}”.`);
      await refresh();
    } catch (unlinkError) {
      setError(unlinkError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="task-notes-section">
        <h2>Notes</h2>
        <p className="subtext">Loading notes...</p>
      </section>
    );
  }

  return (
    <section className="task-notes-section">
      <div className="task-notes-head">
        <div>
          <h2>Notes</h2>
          <p className="subtext">
            Create or link a note in a notebook. You can also create a subject if needed.
          </p>
        </div>
        <Link className="linkish-button" to={`/app/${appName}/browse`}>
          Open Notes
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {status && <p className="status-text">{status}</p>}

      <div className="task-notes-linked">
        <h3>Linked notes</h3>
        {linkedNotes.length === 0 ? (
          <p className="subtext">No notes linked to this task yet.</p>
        ) : (
          <ul className="task-notes-list">
            {linkedNotes.map((note) => (
              <li key={note.id}>
                <div>
                  <Link
                    to={`/app/${appName}/browse?note=${note.id}`}
                    className="record-link"
                  >
                    {note.title || "Untitled note"}
                  </Link>
                  <p className="subtext">
                    {[note.notebook_name, note.subject_name]
                      .filter(Boolean)
                      .join(" › ") || "Notes"}
                  </p>
                </div>
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => handleUnlink(note)}
                  disabled={saving}
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="task-notes-create">
        <h3>Create or link a note</h3>

        <div className="form-grid two-col">
          <label>
            Notebook
            <select
              value={notebookId}
              onChange={(event) => handleNotebookChange(event.target.value)}
            >
              <option value="">Select notebook</option>
              {tree.map((notebook) => (
                <option key={notebook.id} value={notebook.id}>
                  {notebook.name}
                </option>
              ))}
              <option value={CREATE_NEW}>+ Create new notebook…</option>
            </select>
          </label>

          {creatingNotebook ? (
            <label>
              New notebook name
              <input
                type="text"
                value={newNotebookName}
                onChange={(event) => setNewNotebookName(event.target.value)}
                placeholder="Tasks, Work, Personal…"
              />
            </label>
          ) : (
            <span />
          )}

          <label>
            Subject
            <select
              value={subjectId}
              onChange={(event) => handleSubjectChange(event.target.value)}
              disabled={!notebookId}
            >
              <option value="">No subject (notebook level)</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
              <option value={CREATE_NEW}>+ Create new subject…</option>
            </select>
          </label>

          {creatingSubject ? (
            <label>
              New subject name
              <input
                type="text"
                value={newSubjectName}
                onChange={(event) => setNewSubjectName(event.target.value)}
                placeholder="Projects, Meetings…"
              />
            </label>
          ) : (
            <span />
          )}

          <label>
            Note
            <select
              value={noteId || CREATE_NEW}
              onChange={(event) => setNoteId(event.target.value)}
              disabled={!notebookId}
            >
              <option value={CREATE_NEW}>+ Create new note…</option>
              {linkableNotes.map((note) => (
                <option key={note.id} value={note.id}>
                  Link: {note.title || "Untitled note"}
                </option>
              ))}
            </select>
          </label>

          {creatingNote ? (
            <>
              <label>
                Note title
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(event) => setNewNoteTitle(event.target.value)}
                  placeholder={taskTitle || "Untitled note"}
                />
              </label>
              <label>
                Note type
                <select value={noteType} onChange={(event) => setNoteType(event.target.value)}>
                  {NOTE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="button-primary"
            onClick={handleCreateOrLink}
            disabled={saving || !notebookId}
          >
            {saving
              ? "Saving..."
              : creatingNote
                ? "Create note for this task"
                : "Link selected note"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default TaskNotesPanel;
