const VARIANTS = {
  default: "rounded-lg border border-border bg-surface shadow-xs p-6",
  inset: "rounded-md border border-border bg-surface-2 p-3.5",
  interactive:
    "rounded-lg border border-border bg-surface shadow-xs p-6 no-underline text-inherit " +
    "transition duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-md",
};

/**
 * Shared surface primitive. Consolidates the `.panel` / `.card` /
 * `.dashboard-widget` / `.report-center-card` family of one-off surfaces
 * into a single component with consistent padding + radius tokens.
 */
function Card({ variant = "default", as: Component = "div", className = "", children, ...rest }) {
  const classes = [VARIANTS[variant] ?? VARIANTS.default, className].filter(Boolean).join(" ");
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={["flex items-start justify-between gap-3 mb-3", className].filter(Boolean).join(" ")}>
      <div className="min-w-0">
        {title && <h3 className="m-0 text-[1.05rem]">{title}</h3>}
        {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export default Card;
