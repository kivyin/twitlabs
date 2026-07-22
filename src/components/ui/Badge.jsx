const TONES = {
  neutral: "bg-surface-muted text-muted border-transparent",
  brand: "bg-brand-soft text-brand-strong border-transparent",
  success: "bg-success-soft text-success border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  warning: "bg-transparent text-warning border-warning/40",
};

/**
 * Status pill. Always pairs color with text (and an optional icon/dot) so
 * status is never conveyed by color alone — see Phase 7 (Cleared badge,
 * income/expense cue).
 */
function Badge({ tone = "neutral", icon = null, dot = false, className = "", children, ...rest }) {
  const classes = [
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
    "text-[0.74rem] font-bold uppercase tracking-wide leading-tight",
    TONES[tone] ?? TONES.neutral,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}

export default Badge;
