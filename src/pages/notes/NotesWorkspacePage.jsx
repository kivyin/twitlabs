import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createNotebook,
  createNote,
  createSubject,
  createTopic,
  getNotes,
  getNotesTree,
  updateNotebook,
  updateSubject,
  updateTopic,
} from "../../api/notesApi";
import PageHeader from "../../components/PageHeader";
import NoteEditorPanel from "../../components/notes/NoteEditorPanel";
import NotesCreateModal from "../../components/notes/NotesCreateModal";
import NotesTreePanel from "../../components/notes/NotesTreePanel";
import { buildSelectionLabel } from "../../utils/noteUtils";

function NotesWorkspacePage() {
  const { appName = "notes" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tree, setTree] = useState([]);
  const [selection, setSelection] = useState({
    notebookId: null,
    subjectId: null,
    topicId: null,
  });
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const selectionLabel = useMemo(
    () => buildSelectionLabel(selection, tree),
    [selection, tree]
  );
  const hasSelection = Boolean(
    selection.notebookId || selection.subjectId || selection.topicId
  );

  const loadSearchResults = useCallback(async () => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const result = await getNotes({
      search: query,
      top_level_only: "0",
    });
    setSearchResults(result.notes ?? []);
  }, [search]);

  const loadTree = useCallback(async () => {
    const result = await getNotesTree();
    setTree(result.tree ?? []);
    return result.tree ?? [];
  }, []);

  useEffect(() => {
    loadTree().catch((loadError) => setError(loadError.message));
  }, [loadTree]);

  useEffect(() => {
    loadSearchResults().catch((loadError) => setError(loadError.message));
  }, [loadSearchResults]);

  useEffect(() => {
    const noteParam = searchParams.get("note");
    if (noteParam) {
      setSelectedNoteId(Number(noteParam));
    }
  }, [searchParams]);

  const closeModal = () => {
    if (modalSaving) return;
    setModal(null);
    setModalError("");
  };

  const openCreateModal = (variant, context = {}) => {
    setModalError("");
    setModal({ mode: "create", variant, context });
  };

  const openEditModal = (variant, context = {}) => {
    setModalError("");
    setModal({ mode: "edit", variant, context });
  };

  const handleSelectContainer = (nextSelection) => {
    setSelection(nextSelection);
    setSelectedNoteId(null);
  };

  const handleModalSubmit = async ({ name, color, description, note_type: noteType, is_archived: isArchived }) => {
    if (!modal) return;

    setModalSaving(true);
    setModalError("");

    try {
      if (modal.mode === "edit") {
        if (modal.variant === "notebook") {
          await updateNotebook(modal.context.id, {
            name,
            color,
            description,
            is_archived: isArchived,
          });
          if (isArchived && selection.notebookId === modal.context.id) {
            setSelection({ notebookId: null, subjectId: null, topicId: null });
          }
        } else if (modal.variant === "subject") {
          await updateSubject(modal.context.id, { name, color, description });
        } else if (modal.variant === "topic") {
          await updateTopic(modal.context.id, { name, description });
        }
        await loadTree();
      } else if (modal.variant === "notebook") {
        await createNotebook({ name, color, description });
        await loadTree();
      } else if (modal.variant === "subject") {
        await createSubject({
          notebook_id: modal.context.notebookId,
          name,
          color,
          description,
        });
        await loadTree();
      } else if (modal.variant === "topic") {
        await createTopic({
          subject_id: modal.context.subjectId,
          name,
          description,
        });
        await loadTree();
      } else if (modal.variant === "subtopic") {
        await createTopic({
          subject_id: modal.context.subjectId,
          parent_topic_id: modal.context.parentTopicId,
          name,
          description,
        });
        await loadTree();
      } else if (modal.variant === "note") {
        const result = await createNote({
          title: name,
          note_type: noteType,
          notebook_id: selection.notebookId,
          subject_id: selection.subjectId,
          topic_id: selection.topicId,
        });
        setSelectedNoteId(result.note.id);
        navigate(`/app/${appName}/browse?note=${result.note.id}`);
        await Promise.all([loadTree(), loadSearchResults()]);
      } else if (modal.variant === "subnote") {
        const result = await createNote({
          title: name,
          note_type: noteType,
          parent_note_id: modal.context.parentNoteId,
          notebook_id: selection.notebookId,
          subject_id: selection.subjectId,
          topic_id: selection.topicId,
        });
        setSelectedNoteId(result.note.id);
        navigate(`/app/${appName}/browse?note=${result.note.id}`);
        await Promise.all([loadTree(), loadSearchResults()]);
      }

      closeModal();
    } catch (submitError) {
      setModalError(submitError.message);
    } finally {
      setModalSaving(false);
    }
  };

  const handleNoteSaved = async (note) => {
    setSelectedNoteId(note.id);
    navigate(`/app/${appName}/browse?note=${note.id}`);
    await Promise.all([loadSearchResults(), loadTree()]);
  };

  const handleNoteLoaded = useCallback((note) => {
    setSelection((current) => {
      const next = {
        notebookId: note.notebook_id ?? null,
        subjectId: note.subject_id ?? null,
        topicId: note.topic_id ?? null,
      };

      if (
        current.notebookId === next.notebookId &&
        current.subjectId === next.subjectId &&
        current.topicId === next.topicId
      ) {
        return current;
      }

      return next;
    });
  }, []);

  const handleSelectNote = (noteId) => {
    setSelectedNoteId(noteId);
    navigate(`/app/${appName}/browse?note=${noteId}`);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Notes", to: `/app/${appName}` },
          { label: "Workspace" },
        ]}
        title="Notes Workspace"
        subtitle="Notebook → Subject → Topic hierarchy with rich notes, sub-notes, and task links."
        actions={
          <>
            <button type="button" className="button-primary" onClick={() => openCreateModal("note")}>
              New Note
            </button>
            <Link to={`/app/${appName}`} className="linkish-button">
              Notes Home
            </Link>
          </>
        }
      />

      {error && <p className="error">{error}</p>}

      <div className="notes-workspace">
        <NotesTreePanel
          tree={tree}
          selection={selection}
          search={search}
          onSearchChange={setSearch}
          searchResults={searchResults}
          selectedNoteId={selectedNoteId}
          onSelectNote={handleSelectNote}
          onSelect={handleSelectContainer}
          onCreate={(type, context) => openCreateModal(type, context)}
          onEdit={(type, context) => openEditModal(type, context)}
        />

        {selectedNoteId ? (
          <NoteEditorPanel
            appName={appName}
            noteId={selectedNoteId}
            selection={selection}
            selectionLabel={selectionLabel}
            onSaved={handleNoteSaved}
            onNoteLoaded={handleNoteLoaded}
            onDeleted={async () => {
              setSelectedNoteId(null);
              navigate(`/app/${appName}/browse`);
              await Promise.all([loadTree(), loadSearchResults()]);
            }}
            onCreateSubNote={(parentNoteId) =>
              openCreateModal("subnote", { parentNoteId })
            }
          />
        ) : (
          <section className="notes-editor-empty panel">
            {hasSelection && (
              <p className="notes-editor-breadcrumb notes-selection-context">
                {selectionLabel}
              </p>
            )}
            <h2>{hasSelection ? "Create a note here" : "Select or create a note"}</h2>
            <p className="subtext">
              {hasSelection
                ? "New notes will be saved under the location selected in the outline."
                : "Select a notebook, subject, or topic in the outline, search all notes, or click New Note."}
            </p>
            <button type="button" className="button-primary" onClick={() => openCreateModal("note")}>
              New Note
            </button>
          </section>
        )}
      </div>

      <NotesCreateModal
        variant={modal?.variant}
        mode={modal?.mode ?? "create"}
        initialValues={modal?.context ?? {}}
        selectionLabel={hasSelection ? selectionLabel : ""}
        open={Boolean(modal)}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        saving={modalSaving}
        error={modalError}
      />
    </>
  );
}

export default NotesWorkspacePage;
