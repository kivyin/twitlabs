import { useEffect, useRef, useState } from "react";
import NoteDrawCanvas, { PEN_SIZES } from "./NoteDrawCanvas";
import RichTextEditor from "./RichTextEditor";

function NoteContentEditor({
  contentHtml = "",
  onContentHtmlChange,
  onImagesLocalized,
  contentDrawing = "",
  onContentDrawingChange,
  showGrid = false,
  onShowGridChange,
  isFullscreen = false,
  onFullscreenChange,
  readOnly = false,
}) {
  const [activeTool, setActiveTool] = useState("type");
  const [penColor, setPenColor] = useState("#111827");
  const [penWidth, setPenWidth] = useState(4);
  const clearDrawingRef = useRef(null);
  const editorFocusRef = useRef(null);
  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onFullscreenChange?.(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onFullscreenChange]);

  const focusEditor = () => {
    requestAnimationFrame(() => {
      editorFocusRef.current?.focus?.({ preventScroll: true });
    });
  };

  const selectTypeTool = () => {
    setActiveTool("type");
    focusEditor();
  };

  const tool = readOnly ? "type" : activeTool;
  const drawingActive = !readOnly && (tool === "pen" || tool === "eraser");

  return (
    <div
      className={`note-content-editor${isFullscreen ? " note-content-editor--fullscreen" : ""}${
        readOnly ? " note-content-editor--readonly" : ""
      }`}
    >
      {!readOnly && (
        <div className="note-editor-tools">
          <div className="note-content-toolbar" role="toolbar" aria-label="Note editor tools">
            <div className="note-content-toolbar-group note-content-mode-switch">
              <button
                type="button"
                className={`note-content-toolbar-button${activeTool === "type" ? " active" : ""}`}
                onClick={selectTypeTool}
              >
                Type
              </button>
              <button
                type="button"
                className={`note-content-toolbar-button${activeTool === "pen" ? " active" : ""}`}
                onClick={() => setActiveTool("pen")}
              >
                Pen
              </button>
              <button
                type="button"
                className={`note-content-toolbar-button${activeTool === "eraser" ? " active" : ""}`}
                onClick={() => setActiveTool("eraser")}
              >
                Eraser
              </button>
            </div>

            <button
              type="button"
              className={`note-content-toolbar-button${showGrid ? " active" : ""}`}
              onClick={() => onShowGridChange?.(!showGrid)}
            >
              Grid
            </button>

            <button
              type="button"
              className="note-content-toolbar-button"
              onClick={() => onFullscreenChange?.(!isFullscreen)}
            >
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>

            {drawingActive && (
              <div className="note-content-toolbar-group note-draw-tools">
                {tool === "pen" && (
                  <label className="note-draw-tool">
                    Color
                    <input
                      type="color"
                      value={penColor}
                      onChange={(event) => setPenColor(event.target.value)}
                      aria-label="Pen color"
                    />
                  </label>
                )}
                <label className="note-draw-tool">
                  Size
                  <select
                    value={penWidth}
                    onChange={(event) => setPenWidth(Number(event.target.value))}
                    aria-label={tool === "eraser" ? "Eraser size" : "Pen size"}
                  >
                    {PEN_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}px
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="note-content-toolbar-button"
                  onClick={() => clearDrawingRef.current?.()}
                >
                  Clear drawing
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="note-content-body">
        <RichTextEditor
          ref={editorFocusRef}
          value={contentHtml}
          onChange={onContentHtmlChange}
          onImagesLocalized={onImagesLocalized}
          mixed
          showGrid={showGrid}
          textActive={!drawingActive}
          readOnly={readOnly}
          placeholder={
            readOnly
              ? ""
              : "Type here, paste/drop images, or switch to Pen to draw on top of your note."
          }
          overlay={
            <NoteDrawCanvas
              overlay
              interactive={drawingActive}
              tool={tool === "eraser" ? "eraser" : "pen"}
              value={contentDrawing}
              onChange={onContentDrawingChange}
              penColor={penColor}
              penWidth={penWidth}
              onClearRequest={clearDrawingRef}
            />
          }
        />
      </div>
    </div>
  );
}

export default NoteContentEditor;
