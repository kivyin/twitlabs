export const EMPTY_NOTE_DRAWING = { version: 1, strokes: [] };

export function parseNoteDrawing(value) {
  if (!value) {
    return { ...EMPTY_NOTE_DRAWING, strokes: [] };
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed && Array.isArray(parsed.strokes)) {
      return {
        version: parsed.version ?? 1,
        strokes: parsed.strokes.map((stroke) => ({
          tool: stroke.tool === "eraser" ? "eraser" : "pen",
          color: stroke.color ?? "#111827",
          width: Number(stroke.width) || 2,
          points: Array.isArray(stroke.points) ? stroke.points : [],
        })),
      };
    }
  } catch {
    // Ignore invalid stored drawing payloads.
  }

  return { ...EMPTY_NOTE_DRAWING, strokes: [] };
}

export function serializeNoteDrawing(drawing) {
  return JSON.stringify({
    version: 1,
    strokes: drawing?.strokes ?? [],
  });
}

export function normalizeNoteContentMode(mode) {
  if (mode === "draw" || mode === "text" || mode === "mixed") {
    return mode;
  }
  return "mixed";
}
