import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDecisionItem,
  clearDecisionItems,
  getDecisionPicker,
  removeDecisionItem,
} from "../../api/decisionsApi";
import PageHeader from "../../components/PageHeader";

const SPIN_DURATION_MS = 4200;
const FULL_TURNS = 6;

function ConfettiBurst({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const particles = [];
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

    const resize = () => {
      const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const width = () => canvas.clientWidth;
    const height = () => canvas.clientHeight;

    for (let i = 0; i < 120; i += 1) {
      particles.push({
        x: width() * 0.5 + (Math.random() - 0.5) * 80,
        y: height() * 0.35,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 4,
        size: Math.random() * 7 + 3,
        color: colors[i % colors.length],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let frame = 0;
    let raf = 0;
    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width(), height());
      for (const p of particles) {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life -= 0.008;
        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (frame < 160) {
        raf = window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width(), height());
      }
    };
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="decision-confetti" aria-hidden="true" />;
}

function DecisionWheel({ items, rotation, spinning, canSpin, onSpin }) {
  const size = 340;
  const radius = size / 2;
  const count = Math.max(items.length, 1);
  const slice = 360 / count;

  const segments = useMemo(() => {
    if (items.length === 0) {
      return [
        {
          id: "empty",
          label: "Add options",
          color: "#94a3b8",
          start: 0,
          end: 360,
        },
      ];
    }
    return items.map((item, index) => ({
      ...item,
      start: index * slice,
      end: (index + 1) * slice,
    }));
  }, [items, slice]);

  const polar = (angleDeg, distance) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: radius + distance * Math.cos(rad),
      y: radius + distance * Math.sin(rad),
    };
  };

  const slicePath = (start, end) => {
    const large = end - start > 180 ? 1 : 0;
    const startPt = polar(start, radius - 4);
    const endPt = polar(end, radius - 4);
    return `M ${radius} ${radius} L ${startPt.x} ${startPt.y} A ${radius - 4} ${radius - 4} 0 ${large} 1 ${endPt.x} ${endPt.y} Z`;
  };

  return (
    <div className={`decision-wheel-wrap${spinning ? " is-spinning" : ""}`}>
      <div className="decision-wheel-pointer" aria-hidden="true" />
      <svg
        className="decision-wheel"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {segments.map((segment) => {
          const mid = (segment.start + segment.end) / 2;
          const labelPos = polar(mid, radius * 0.62);
          return (
            <g key={segment.id}>
              <path d={slicePath(segment.start, segment.end)} fill={segment.color || "#64748b"} />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="#fff"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
              >
                {String(segment.label).length > 14
                  ? `${String(segment.label).slice(0, 12)}…`
                  : segment.label}
              </text>
            </g>
          );
        })}
      </svg>
      <button
        type="button"
        className="decision-wheel-hub"
        onClick={onSpin}
        disabled={!canSpin || spinning}
        aria-label={spinning ? "Spinning" : "Spin the wheel"}
        title={canSpin ? "Spin" : "Add at least two options to spin"}
      >
        {spinning ? "…" : "SPIN"}
      </button>
    </div>
  );
}

function DecisionPickerPage() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [removeWinnerAfter, setRemoveWinnerAfter] = useState(false);
  const spinTimeoutRef = useRef(null);

  useEffect(() => {
    let active = true;
    getDecisionPicker()
      .then((payload) => {
        if (!active) return;
        setItems(payload.items ?? []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const applyState = (payload) => {
    setItems(payload.items ?? []);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const label = draft.trim();
    if (!label || spinning) return;
    setError("");
    try {
      const payload = await addDecisionItem(label);
      applyState(payload);
      setDraft("");
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const handleRemove = async (itemId) => {
    if (spinning) return;
    setError("");
    try {
      const payload = await removeDecisionItem(itemId);
      applyState(payload);
      if (winner?.id === itemId) setWinner(null);
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const handleClear = async () => {
    if (spinning) return;
    setError("");
    try {
      const payload = await clearDecisionItems();
      applyState(payload);
      setWinner(null);
    } catch (clearError) {
      setError(clearError.message);
    }
  };

  const handleSpin = () => {
    if (spinning || items.length < 2) return;
    setError("");
    setWinner(null);

    const winnerIndex = Math.floor(Math.random() * items.length);
    const slice = 360 / items.length;
    // Pointer is at top (0°). Segment center for index i is at i*slice + slice/2.
    // After rotate(R), local angle L appears at (L + R) mod 360 — land center at 0°.
    const targetCenter = winnerIndex * slice + slice / 2;
    const desiredMod = (360 - (targetCenter % 360)) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (desiredMod - currentMod + 360) % 360;
    const finalRotation = rotation + FULL_TURNS * 360 + delta;

    setSpinning(true);
    setRotation(finalRotation);

    spinTimeoutRef.current = window.setTimeout(async () => {
      const selected = items[winnerIndex];
      setWinner(selected);
      setConfettiKey((key) => key + 1);
      setSpinning(false);

      if (removeWinnerAfter && selected?.id) {
        try {
          const payload = await removeDecisionItem(selected.id);
          applyState(payload);
        } catch (removeError) {
          setError(removeError.message);
        }
      }
    }, SPIN_DURATION_MS);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Decision Picker" }]}
        title="Decision Picker"
        subtitle="Add options, spin the wheel, and let chance choose."
      />

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="subtext">Loading your list…</p> : null}

      <div className="decision-picker-layout">
        <section className="panel decision-wheel-panel">
          <div className="decision-wheel-stage">
            <ConfettiBurst key={confettiKey} active={confettiKey > 0} />
            <DecisionWheel
              items={items}
              rotation={rotation}
              spinning={spinning}
              canSpin={items.length >= 2}
              onSpin={handleSpin}
            />
          </div>

          <div className="decision-spin-actions">
            <button
              type="button"
              className="button-primary decision-spin-button"
              onClick={handleSpin}
              disabled={spinning || items.length < 2}
            >
              {spinning ? "Spinning…" : winner ? "Re-spin" : "Spin"}
            </button>
            <label className="decision-remove-toggle">
              <input
                type="checkbox"
                checked={removeWinnerAfter}
                onChange={(event) => setRemoveWinnerAfter(event.target.checked)}
                disabled={spinning}
              />
              Remove winning item after spin
            </label>
          </div>

          {winner ? (
            <div className="decision-winner" role="status">
              <span className="decision-winner-label">Winner</span>
              <strong style={{ color: winner.color || "var(--brand)" }}>{winner.label}</strong>
              {!removeWinnerAfter ? (
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => handleRemove(winner.id)}
                  disabled={spinning}
                >
                  Remove this option
                </button>
              ) : null}
            </div>
          ) : (
            <p className="subtext decision-hint">
              {items.length < 2
                ? "Add at least two options to spin."
                : "Click Spin or the center hub to choose randomly."}
            </p>
          )}
        </section>

        <section className="panel decision-list-panel">
          <div className="decision-list-header">
            <h2>Options</h2>
            {items.length > 0 ? (
              <button type="button" className="linkish-button" onClick={handleClear} disabled={spinning}>
                Clear all
              </button>
            ) : null}
          </div>

          <form className="decision-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add an option…"
              maxLength={80}
              disabled={spinning}
              aria-label="New option"
            />
            <button type="submit" className="button-primary" disabled={spinning || !draft.trim()}>
              Add
            </button>
          </form>

          {items.length === 0 ? (
            <p className="subtext">No options yet. Add dinner spots, chores, movie picks—anything.</p>
          ) : (
            <ul className="decision-item-list">
              {items.map((item) => (
                <li key={item.id} className="decision-item-row">
                  <span
                    className="decision-item-swatch"
                    style={{ background: item.color || "#64748b" }}
                    aria-hidden="true"
                  />
                  <span className="decision-item-label">{item.label}</span>
                  <button
                    type="button"
                    className="decision-item-remove"
                    onClick={() => handleRemove(item.id)}
                    disabled={spinning}
                    aria-label={`Remove ${item.label}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default DecisionPickerPage;
