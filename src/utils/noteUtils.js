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

export function notePreview(note) {
  const plain = note.content_plain || stripHtml(note.content_html);
  if (!plain) return "Empty note";
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain;
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
  if (selection.topicId) {
    for (const notebook of tree) {
      for (const subject of notebook.subjects ?? []) {
        const findTopic = (topics, path = []) => {
          for (const topic of topics ?? []) {
            const nextPath = [...path, topic.name];
            if (topic.id === selection.topicId) return nextPath.join(" › ");
            const nested = findTopic(topic.subtopics, nextPath);
            if (nested) return nested;
          }
          return null;
        };
        const label = findTopic(subject.topics);
        if (label) return `${notebook.name} › ${subject.name} › ${label}`;
      }
    }
  }
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

function findInTopics(topics, noteId, path) {
  for (const topic of topics ?? []) {
    const topicPath = [...path, `topic-${topic.id}`];
    const inNotes = findInNotes(topic.notes, noteId, topicPath);
    if (inNotes) {
      return inNotes;
    }
    const inSubtopics = findInTopics(topic.subtopics, noteId, topicPath);
    if (inSubtopics) {
      return inSubtopics;
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

      const inTopics = findInTopics(subject.topics, noteId, subjectPath);
      if (inTopics) {
        return inTopics;
      }
    }
  }
  return [];
}
