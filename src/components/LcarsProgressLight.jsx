import { useEffect, useRef, useState } from "react";
import { subscribeLcarsPulse } from "../utils/lcarsPulseClock";

const BLOB_WIDTH_PX = 23;
const BLOB_GAP_PX = 2;
/** Faster than the shared nav pulse (480ms). */
const PROGRESS_STEP_MS = 200;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyProgressTick(track, tick, setBlobState) {
  if (!track) return;

  const width = track.clientWidth;
  if (width <= 0) return;

  const edgePad = BLOB_WIDTH_PX / 2 + 2;
  const maxOffset = Math.max(BLOB_WIDTH_PX, width / 2 - edgePad);
  const spacing = BLOB_WIDTH_PX + BLOB_GAP_PX;
  const stationCount = Math.max(2, Math.round(maxOffset / spacing) + 1);

  // ON, OFF, ON next… outer station stays ON until the cycle snaps back.
  const phaseCount = stationCount * 2 - 1;
  const phase = tick % phaseCount;
  let station;
  let on;
  if (phase >= phaseCount - 1) {
    station = stationCount - 1;
    on = true;
  } else {
    station = Math.floor(phase / 2);
    on = phase % 2 === 0;
  }

  const offset = stationCount === 1 ? 0 : (station / (stationCount - 1)) * maxOffset;
  const leftPct = ((width / 2 - offset) / width) * 100;
  const rightPct = ((width / 2 + offset) / width) * 100;

  setBlobState({ leftPct, rightPct, on });
}

/**
 * Binary scanner lights that step from center to both edges of the track.
 * Starts with the shared LCARS clock, then steps a bit faster than the nav chase.
 */
function LcarsProgressLight() {
  const trackRef = useRef(null);
  const [blobState, setBlobState] = useState({
    leftPct: 50,
    rightPct: 50,
    on: true,
  });

  useEffect(() => {
    if (prefersReducedMotion()) {
      setBlobState({ leftPct: 28, rightPct: 72, on: true });
      return undefined;
    }

    let localTick = 0;
    let progressTimer = null;

    const startProgressTimer = () => {
      applyProgressTick(trackRef.current, localTick, setBlobState);
      if (progressTimer != null) {
        window.clearInterval(progressTimer);
      }
      progressTimer = window.setInterval(() => {
        localTick += 1;
        applyProgressTick(trackRef.current, localTick, setBlobState);
      }, PROGRESS_STEP_MS);
    };

    const unsubscribe = subscribeLcarsPulse((sharedTick) => {
      // Shared clock resets to 0 when it (re)starts — realign both.
      if (sharedTick === 0) {
        localTick = 0;
        startProgressTimer();
        return;
      }
      // Mounted after the clock was already running: start immediately.
      if (progressTimer == null) {
        localTick = 0;
        startProgressTimer();
      }
    });

    return () => {
      unsubscribe();
      if (progressTimer != null) {
        window.clearInterval(progressTimer);
      }
    };
  }, []);

  return (
    <div className="lcars-progress-light" aria-hidden="true">
      <span ref={trackRef} className="lcars-progress-light-track">
        <span
          className={`lcars-progress-light-blob lcars-progress-light-blob--left${
            blobState.on ? " is-on" : ""
          }`}
          style={{ left: `${blobState.leftPct}%` }}
        />
        <span
          className={`lcars-progress-light-blob lcars-progress-light-blob--right${
            blobState.on ? " is-on" : ""
          }`}
          style={{ left: `${blobState.rightPct}%` }}
        />
      </span>
    </div>
  );
}

export default LcarsProgressLight;
