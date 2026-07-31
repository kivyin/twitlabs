/** Shared LCARS pulse clock so nav chase + header scanner start/stay in sync. */
export const LCARS_PULSE_STEP_MS = 480;

let tick = 0;
let timerId = null;
const listeners = new Set();

function emit() {
  for (const listener of listeners) {
    try {
      listener(tick);
    } catch {
      // Ignore subscriber errors so one bad listener cannot stop the clock.
    }
  }
}

function startClock() {
  if (timerId != null) return;
  tick = 0;
  emit();
  timerId = window.setInterval(() => {
    tick += 1;
    emit();
  }, LCARS_PULSE_STEP_MS);
}

function stopClock() {
  if (timerId != null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  tick = 0;
}

/** Subscribe to the shared pulse. Clock starts at 0 when the first listener joins. */
export function subscribeLcarsPulse(listener) {
  listeners.add(listener);
  startClock();
  listener(tick);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopClock();
    }
  };
}
