import { useEffect, useState } from "react";

function LcarsBarStrip({ className, bars }) {
  return (
    <div className={className} aria-hidden="true">
      {bars.map((bar) => (
        <span
          key={bar.key}
          className={`lcars-strip-bar lcars-strip-bar--${bar.tone}${bar.flex ? " is-flex" : ""}`}
          style={bar.width ? { width: bar.width } : undefined}
        />
      ))}
    </div>
  );
}

const MID_BARS = [
  { key: "m1", tone: "orange", width: "18%" },
  { key: "m2", tone: "blue", width: "28%" },
  { key: "m3", tone: "tan", width: "14%" },
  { key: "m4", tone: "peach", flex: true },
  { key: "m5", tone: "lavender", width: "10%" },
];

const FOOT_BARS = [
  { key: "f1", tone: "orange", width: "12%" },
  { key: "f2", tone: "blue", width: "16%" },
  { key: "f3", tone: "gold", width: "9%" },
  { key: "f4", tone: "violet", width: "11%" },
  { key: "f5", tone: "teal", width: "8%" },
  { key: "f6", tone: "red", width: "7%" },
  { key: "f7", tone: "tan", flex: true },
  { key: "f8", tone: "lavender", width: "10%" },
];

function formatLcarsClock(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${String(date.getFullYear()).slice(2)}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

/** Decorative mid-band between record details and page content */
function LcarsMidBand() {
  const [clock, setClock] = useState(() => formatLcarsClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatLcarsClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="lcars-mid-band">
      <LcarsBarStrip className="lcars-mid-bars" bars={MID_BARS} />
      <div className="lcars-mid-clock">
        <span className="lcars-mid-clock-chip">
          <small>Date</small>
          {clock.date}
        </span>
        <span className="lcars-mid-clock-chip">
          <small>Time</small>
          {clock.time}
        </span>
      </div>
    </div>
  );
}

function LcarsFootBand() {
  return <LcarsBarStrip className="lcars-foot-band" bars={FOOT_BARS} />;
}

function LcarsFrameBrand({ title }) {
  return (
    <div className="lcars-frame-brand" aria-hidden="true">
      <span className="lcars-frame-brand-bar lcars-frame-brand-bar--lead" />
      <span className="lcars-frame-brand-title">{title}</span>
      <span className="lcars-frame-brand-bar lcars-frame-brand-bar--trail" />
    </div>
  );
}

export { LcarsFootBand, LcarsFrameBrand, LcarsMidBand };
export default LcarsMidBand;
