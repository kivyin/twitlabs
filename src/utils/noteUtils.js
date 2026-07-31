export const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "meeting", label: "Meeting" },
  { value: "idea", label: "Idea" },
  { value: "reference", label: "Reference" },
  { value: "journal", label: "Journal" },
  { value: "checklist", label: "Checklist" },
];

export function getNoteTypeLabel(value) {
  return NOTE_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function notePreview(note, maxLength = 120) {
  const plain = note.content_plain || stripHtml(note.content_html);
  if (!plain) return "Empty note";
  const limit = Number(maxLength) > 0 ? Number(maxLength) : 120;
  return plain.length > limit ? `${plain.slice(0, limit)}…` : plain;
}

export function formatNoteDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildSelectionLabel(selection, tree = []) {
  if (selection.subjectId) {
    for (const notebook of tree) {
      const subject = notebook.subjects?.find((item) => item.id === selection.subjectId);
      if (subject) return `${notebook.name} › ${subject.name}`;
    }
  }
  if (selection.notebookId) {
    const notebook = tree.find((item) => item.id === selection.notebookId);
    if (notebook) return notebook.name;
  }
  return "All notebooks";
}

function findInNotes(notes, noteId, path) {
  for (const note of notes ?? []) {
    if (note.id === noteId) {
      return path;
    }
    const nested = findInNotes(note.notes, noteId, [...path, `note-${note.id}`]);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function findNoteExpandKeys(tree, noteId) {
  for (const notebook of tree) {
    const base = [`notebook-${notebook.id}`];
    const inNotebook = findInNotes(notebook.notes, noteId, base);
    if (inNotebook) {
      return inNotebook;
    }

    for (const subject of notebook.subjects ?? []) {
      const subjectPath = [...base, `subject-${subject.id}`];
      const inSubject = findInNotes(subject.notes, noteId, subjectPath);
      if (inSubject) {
        return inSubject;
      }
    }
  }
  return [];
}

export function buildNotesBrowsePath(
  appName = "notes",
  { notebookId, subjectId, noteId, q } = {}
) {
  const params = new URLSearchParams();
  if (notebookId) params.set("notebook", String(notebookId));
  if (subjectId) params.set("subject", String(subjectId));
  if (noteId) params.set("note", String(noteId));
  if (q) params.set("q", String(q));
  const query = params.toString();
  return `/app/${appName}/browse${query ? `?${query}` : ""}`;
}

export function parseNotesBrowseParams(searchParams) {
  const notebook = searchParams.get("notebook");
  const subject = searchParams.get("subject");
  const note = searchParams.get("note");
  const q = searchParams.get("q") ?? "";

  return {
    notebookId: notebook ? Number(notebook) : null,
    subjectId: subject ? Number(subject) : null,
    noteId: note ? Number(note) : null,
    q,
  };
}

export function findNotebookInTree(tree, notebookId) {
  return (tree ?? []).find((item) => item.id === notebookId) ?? null;
}

export function findSubjectInTree(tree, subjectId) {
  for (const notebook of tree ?? []) {
    const subject = (notebook.subjects ?? []).find((item) => item.id === subjectId);
    if (subject) {
      return { notebook, subject };
    }
  }
  return null;
}
