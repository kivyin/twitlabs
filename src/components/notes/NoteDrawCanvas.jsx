import { useCallback, useEffect, useRef, useState } from "react";
import { parseNoteDrawing, serializeNoteDrawing } from "../../utils/noteDrawing";

const PEN_SIZES = [1, 2, 3, 5, 8, 12, 16];

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawStroke(ctx, stroke) {
  const points = stroke.points ?? [];
  if (points.length === 0) {
    return;
  }

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color ?? "#111827";
  }

  ctx.lineWidth = stroke.width ?? 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }

  ctx.stroke();
}

function redrawCanvas(canvas, drawing, activeStroke = null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of drawing.strokes) {
    drawStroke(ctx, stroke);
  }

  if (activeStroke) {
    drawStroke(ctx, activeStroke);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function NoteDrawCanvas({
  value = "",
  onChange,
  overlay = false,
  interactive = false,
  tool = "pen",
  penColor = "#111827",
  penWidth = 2,
  onClearRequest,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(parseNoteDrawing(value));
  const activeStrokeRef = useRef(null);
  const drawingRefActive = useRef(false);
  const [ready, setReady] = useState(false);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const width = container.clientWidth;
    const height = Math.max(container.clientHeight, overlay ? container.clientHeight : 480);
    const ratio = window.devicePixelRatio || 1;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    redrawCanvas(canvas, drawingRef.current, activeStrokeRef.current);
  }, [overlay]);

  useEffect(() => {
    drawingRef.current = parseNoteDrawing(value);
    const canvas = canvasRef.current;
    if (canvas) {
      redrawCanvas(canvas, drawingRef.current);
    }
  }, [value]);

  useEffect(() => {
    resizeCanvas();
    setReady(true);

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const commitDrawing = () => {
    onChange?.(serializeNoteDrawing(drawingRef.current));
  };

  const handlePointerDown = (event) => {
    if (!interactive || event.button !== 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drawingRefActive.current = true;
    activeStrokeRef.current = {
      tool: tool === "eraser" ? "eraser" : "pen",
      color: penColor,
      width: penWidth,
      points: [getPoint(event, canvas)],
    };
    redrawCanvas(canvas, drawingRef.current, activeStrokeRef.current);
  };

  const handlePointerMove = (event) => {
    if (!interactive || !drawingRefActive.current) {
      return;
    }

    const canvas = canvasRef.current;
    const stroke = activeStrokeRef.current;
    if (!canvas || !stroke) {
      return;
    }

    event.preventDefault();
    stroke.points.push(getPoint(event, canvas));
    redrawCanvas(canvas, drawingRef.current, stroke);
  };

  const finishStroke = () => {
    if (!drawingRefActive.current) {
      return;
    }

    drawingRefActive.current = false;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;

    if (stroke && stroke.points.length > 0) {
      drawingRef.current = {
        ...drawingRef.current,
        strokes: [...drawingRef.current.strokes, stroke],
      };
      redrawCanvas(canvasRef.current, drawingRef.current);
      commitDrawing();
    }
  };

  useEffect(() => {
    if (!onClearRequest) {
      return undefined;
    }

    onClearRequest.current = () => {
      drawingRef.current = { version: 1, strokes: [] };
      redrawCanvas(canvasRef.current, drawingRef.current);
      onChange?.(serializeNoteDrawing(drawingRef.current));
    };

    return () => {
      onClearRequest.current = null;
    };
  }, [onChange, onClearRequest]);

  const wrapClassName = [
    "note-draw-canvas-wrap",
    overlay ? "note-draw-canvas-wrap--overlay" : "",
    interactive ? "note-draw-canvas-wrap--interactive" : "",
    interactive && tool === "eraser" ? "note-draw-canvas-wrap--eraser" : "",
    ready ? "" : "note-draw-canvas-wrap--loading",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={wrapClassName}>
      <canvas
        ref={canvasRef}
        className="note-draw-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        onPointerCancel={finishStroke}
        aria-label={tool === "eraser" ? "Eraser canvas" : "Drawing canvas"}
      />
    </div>
  );
}

export { PEN_SIZES };
export default NoteDrawCanvas;
