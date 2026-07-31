import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createNotebook,
  createNote,
  createSubject,
  deleteNotebook,
  deleteNote,
  deleteSubject,
  getNotes,
  getNotesTree,
  updateNotebook,
  updateSubject,
} from "../../api/notesApi";
import PageHeader from "../../components/PageHeader";
import ConfirmModal from "../../components/common/ConfirmModal";
import NoteEditorPanel from "../../components/notes/NoteEditorPanel";
import NotesCreateModal from "../../components/notes/NotesCreateModal";
import NotesLibraryView from "../../components/notes/NotesLibraryView";
import NotesNotebookTabs from "../../components/notes/NotesNotebookTabs";
import NotesScopeNotesPanel from "../../components/notes/NotesScopeNotesPanel";
import {
  buildNotesBrowsePath,
  buildSelectionLabel,
  findNotebookInTree,
  findSubjectInTree,
  parseNotesBrowseParams,
} from "../../utils/noteUtils";

function NotesWorkspacePage() {
  const { appName = "notes" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const browse = useMemo(() => parseNotesBrowseParams(searchParams), [searchParams]);

  const [tree, setTree] = useState([]);
  const [startNoteInEditMode, setStartNoteInEditMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [noteChrome, setNoteChrome] = useState(null);

  const selectedNoteId = browse.noteId;
  const search = browse.q;

  const selection = useMemo(
    () => ({
      notebookId: browse.notebookId,
      subjectId: browse.subjectId,
    }),
    [browse.notebookId, browse.subjectId]
  );

  const activeNotebook = useMemo(
    () => findNotebookInTree(tree, browse.notebookId),
    [tree, browse.notebookId]
  );
  const activeSubjectMatch = useMemo(
    () => (browse.subjectId ? findSubjectInTree(tree, browse.subjectId) : null),
    [tree, browse.subjectId]
  );

  const selectionLabel = useMemo(
    () => buildSelectionLabel(selection, tree),
    [selection, tree]
  );
  const inLibrary = !browse.notebookId;
  const hasSelection = Boolean(selection.notebookId || selection.subjectId);

  const navigateBrowse = useCallback(
    (next, { replace = false } = {}) => {
      navigate(buildNotesBrowsePath(appName, next), { replace });
    },
    [appName, navigate]
  );

  const loadTree = useCallback(async () => {
    const result = await getNotesTree();
    setTree(result.tree ?? []);
    return result.tree ?? [];
  }, []);

  const loadSearchResults = useCallback(async () => {
    const query = search.trim();
    if (!query || !inLibrary) {
      setSearchResults([]);
      return;
    }
    const result = await getNotes({
      search: query,
      top_level_only: "0",
    });
    setSearchResults(result.notes ?? []);
  }, [search, inLibrary]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateTree() {
      try {
        const result = await getNotesTree();
        if (!cancelled) {
          setTree(result.tree ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      }
    }

    void hydrateTree();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSearch() {
      try {
        await loadSearchResults();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      }
    }

    void hydrateSearch();
    return () => {
      cancelled = true;
    };
  }, [loadSearchResults]);

  useEffect(() => {
    if (!browse.notebookId || !tree.length) return;
    if (!activeNotebook) {
      navigateBrowse({}, { replace: true });
    }
  }, [browse.notebookId, tree, activeNotebook, navigateBrowse]);

  useEffect(() => {
    if (!selectedNoteId) {
      setNoteChrome(null);
    }
  }, [selectedNoteId]);

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
    setStartNoteInEditMode(false);
    navigateBrowse({
      notebookId: nextSelection.notebookId,
      subjectId: nextSelection.subjectId,
    });
  };

  const handleSelectNote = (noteId) => {
    setStartNoteInEditMode(false);
    navigateBrowse({
      notebookId: browse.notebookId,
      subjectId: browse.subjectId,
      noteId,
    });
  };

  const handleOpenNoteFromSearch = (note) => {
    setStartNoteInEditMode(false);
    navigateBrowse({
      notebookId: note.notebook_id ?? null,
      subjectId: note.subject_id ?? null,
      noteId: note.id,
    });
  };

  const handleSearchChange = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) params.set("q", value);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  };

  const handleModalSubmit = async ({
    name,
    color,
    description,
    note_type: noteType,
    is_archived: isArchived,
  }) => {
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
          if (isArchived && browse.notebookId === modal.context.id) {
            navigateBrowse({});
          }
        } else if (modal.variant === "subject") {
          await updateSubject(modal.context.id, { name, color, description });
        }
        await loadTree();
      } else if (modal.variant === "notebook") {
        const result = await createNotebook({ name, color, description });
        await loadTree();
        navigateBrowse({ notebookId: result.notebook.id });
      } else if (modal.variant === "subject") {
        const result = await createSubject({
          notebook_id: modal.context.notebookId,
          name,
          color,
          description,
        });
        await loadTree();
        navigateBrowse({
          notebookId: modal.context.notebookId,
          subjectId: result.subject.id,
        });
      } else if (modal.variant === "note") {
        const notebookId = modal.context.notebookId ?? selection.notebookId;
        const subjectId = modal.context.subjectId ?? selection.subjectId;
        const result = await createNote({
          title: name,
          note_type: noteType,
          notebook_id: notebookId,
          subject_id: subjectId,
        });
        setStartNoteInEditMode(true);
        navigateBrowse({
          notebookId,
          subjectId,
          noteId: result.note.id,
        });
        await Promise.all([loadTree(), loadSearchResults()]);
      } else if (modal.variant === "subnote") {
        const result = await createNote({
          title: name,
          note_type: noteType,
          parent_note_id: modal.context.parentNoteId,
          notebook_id: selection.notebookId,
          subject_id: selection.subjectId,
        });
        setStartNoteInEditMode(true);
        navigateBrowse({
          notebookId: selection.notebookId,
          subjectId: selection.subjectId,
          noteId: result.note.id,
        });
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
    navigateBrowse({
      notebookId: note.notebook_id ?? browse.notebookId,
      subjectId: note.subject_id ?? browse.subjectId,
      noteId: note.id,
    });
    await Promise.all([loadSearchResults(), loadTree()]);
  };

  const handleNoteLoaded = useCallback(
    (note) => {
      const next = {
        notebookId: note.notebook_id ?? null,
        subjectId: note.subject_id ?? null,
        noteId: note.id,
      };
      if (
        browse.notebookId === next.notebookId &&
        browse.subjectId === next.subjectId &&
        browse.noteId === next.noteId
      ) {
        return;
      }
      navigateBrowse(next, { replace: true });
    },
    [browse, navigateBrowse]
  );

  const requestDelete = (kind, entity) => {
    setDeleteTarget({ kind, entity });
  };

  const handleModalDelete = () => {
    if (!modal || modal.mode !== "edit") return;
    const { variant, context } = modal;
    closeModal();
    requestDelete(variant, context);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError("");
    try {
      const { kind, entity } = deleteTarget;
      if (kind === "notebook") {
        await deleteNotebook(entity.id);
        if (browse.notebookId === entity.id) {
          navigateBrowse({});
        }
      } else if (kind === "subject") {
        await deleteSubject(entity.id);
        navigateBrowse({
          notebookId: browse.notebookId,
          subjectId: browse.subjectId === entity.id ? null : browse.subjectId,
          noteId: browse.subjectId === entity.id ? null : browse.noteId,
        });
      } else if (kind === "note") {
        await deleteNote(entity.id);
        if (selectedNoteId === entity.id) {
          navigateBrowse({
            notebookId: browse.notebookId,
            subjectId: browse.subjectId,
          });
        }
      }
      setDeleteTarget(null);
      await Promise.all([loadTree(), loadSearchResults()]);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    const crumbs = [
      { label: "Home", to: "/" },
      { label: "Notes", to: `/app/${appName}` },
      { label: "Workspace", to: buildNotesBrowsePath(appName) },
    ];

    if (activeNotebook) {
      crumbs.push({
        label: activeNotebook.name,
        to: buildNotesBrowsePath(appName, { notebookId: activeNotebook.id }),
      });
    }

    if (activeSubjectMatch?.subject) {
      crumbs.push({
        label: activeSubjectMatch.subject.name,
        to: buildNotesBrowsePath(appName, {
          notebookId: activeNotebook?.id ?? browse.notebookId,
          subjectId: activeSubjectMatch.subject.id,
        }),
      });
    }

    if (crumbs.length > 0) {
      const last = { ...crumbs[crumbs.length - 1] };
      delete last.to;
      crumbs[crumbs.length - 1] = last;
    }

    return crumbs;
  }, [appName, activeNotebook, activeSubjectMatch, browse.notebookId]);

  const pageTitle =
    selectedNoteId && noteChrome?.isEditing ? (
      <input
        type="text"
        className="page-header-title-input"
        value={noteChrome.title ?? ""}
        onChange={(event) => noteChrome.onTitleChange?.(event.target.value)}
        placeholder="Note title"
        aria-label="Note title"
      />
    ) : selectedNoteId ? (
      noteChrome?.displayTitle || "Note"
    ) : (
      activeSubjectMatch?.subject?.name || activeNotebook?.name || "Notes Workspace"
    );

  const favoriteLabel = selectedNoteId
    ? noteChrome?.displayTitle || "Note"
    : typeof pageTitle === "string"
      ? pageTitle
      : "Notes Workspace";

  const pageSubtitle = selectedNoteId
    ? noteChrome?.isEditing
      ? "Edit the title above, then use Save when you’re done."
      : "Open Edit to change this note, or pick another note from the outline."
    : inLibrary
      ? "Browse notebooks, search your knowledge base, then drill into subjects and notes."
      : "Subjects are color tabs on the right. Notes and sub-notes nest under each subject.";

  const headerActions = selectedNoteId && noteChrome ? (
    noteChrome.isEditing ? (
      <>
        <label className="notes-pin-toggle notes-pin-toggle--header">
          <input
            type="checkbox"
            checked={noteChrome.isPinned}
            onChange={noteChrome.onTogglePin}
          />
          Pin
        </label>
        <button type="button" className="button" onClick={noteChrome.onDone}>
          Done
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={noteChrome.onSave}
          disabled={noteChrome.saving}
        >
          {noteChrome.saving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="danger-button" onClick={noteChrome.onDelete}>
          Delete
        </button>
      </>
    ) : (
      <>
        {noteChrome.isPinned ? <span className="notes-view-badge">Pinned</span> : null}
        <button type="button" className="button-primary" onClick={noteChrome.onEdit}>
          Edit
        </button>
        <button type="button" className="danger-button" onClick={noteChrome.onDelete}>
          Delete
        </button>
      </>
    )
  ) : !inLibrary ? (
    <button
      type="button"
      className="button-primary"
      onClick={() =>
        openCreateModal("note", {
          notebookId: selection.notebookId,
          subjectId: selection.subjectId,
        })
      }
    >
      New Note
    </button>
  ) : null;

  const deleteCopy = useMemo(() => {
    if (!deleteTarget) return { title: "", message: "" };
    const name = deleteTarget.entity.name || deleteTarget.entity.title || "this item";
    if (deleteTarget.kind === "notebook") {
      return {
        title: "Delete notebook?",
        message: `Delete “${name}” and all of its subjects and notes? This cannot be undone.`,
      };
    }
    if (deleteTarget.kind === "subject") {
      return {
        title: "Delete subject?",
        message: `Delete “${name}” and all notes inside it? This cannot be undone.`,
      };
    }
    return {
      title: "Delete note?",
      message: `Delete “${name}” and any sub-notes? This cannot be undone.`,
    };
  }, [deleteTarget]);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={headerActions}
        favorite={favoriteLabel}
      />

      {error && <p className="error">{error}</p>}

      {inLibrary ? (
        <div className="notes-workspace notes-workspace--library">
          <NotesLibraryView
            notebooks={tree}
            search={search}
            onSearchChange={handleSearchChange}
            searchResults={searchResults}
            onOpenNotebook={(notebookId) => navigateBrowse({ notebookId })}
            onCreateNotebook={() => openCreateModal("notebook")}
            onEditNotebook={(notebook) =>
              openEditModal("notebook", {
                id: notebook.id,
                name: notebook.name,
                description: notebook.description ?? "",
                color: notebook.color,
                is_archived: notebook.is_archived,
              })
            }
            onOpenNote={handleOpenNoteFromSearch}
          />
        </div>
      ) : (
        <div className="notes-workspace notes-workspace--notebook">
          <div className="notes-workspace-main">
            {selectedNoteId ? (
              <NoteEditorPanel
                appName={appName}
                noteId={selectedNoteId}
                selection={selection}
                startInEditMode={startNoteInEditMode}
                onSaved={handleNoteSaved}
                onNoteLoaded={handleNoteLoaded}
                onChromeChange={setNoteChrome}
                onDeleted={async () => {
                  setStartNoteInEditMode(false);
                  setNoteChrome(null);
                  navigateBrowse({
                    notebookId: browse.notebookId,
                    subjectId: browse.subjectId,
                  });
                  await Promise.all([loadTree(), loadSearchResults()]);
                }}
                onCreateSubNote={(parentNoteId) =>
                  openCreateModal("subnote", { parentNoteId })
                }
              />
            ) : (
              <NotesScopeNotesPanel
                selection={selection}
                selectionLabel={
                  activeSubjectMatch?.subject?.name || activeNotebook?.name || ""
                }
                onOpenNote={handleSelectNote}
                onNewNote={() =>
                  openCreateModal("note", {
                    notebookId: selection.notebookId,
                    subjectId: selection.subjectId,
                  })
                }
                onNewSubject={() =>
                  openCreateModal("subject", { notebookId: selection.notebookId })
                }
              />
            )}
          </div>

          <NotesNotebookTabs
            notebook={activeNotebook}
            selection={selection}
            selectedNoteId={selectedNoteId}
            onSelect={handleSelectContainer}
            onSelectNote={handleSelectNote}
            onCreate={openCreateModal}
            onEdit={openEditModal}
          />
        </div>
      )}

      <NotesCreateModal
        variant={modal?.variant}
        mode={modal?.mode ?? "create"}
        initialValues={modal?.context ?? {}}
        selectionLabel={hasSelection ? selectionLabel : ""}
        open={Boolean(modal)}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        onDelete={modal?.mode === "edit" ? handleModalDelete : undefined}
        saving={modalSaving}
        error={modalError}
      />

      {deleteTarget && (
        <ConfirmModal
          title={deleteCopy.title}
          message={deleteCopy.message}
          confirmLabel="Delete"
          busy={deleteBusy}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

export default NotesWorkspacePage;
