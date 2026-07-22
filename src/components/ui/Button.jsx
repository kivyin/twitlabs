import { forwardRef } from "react";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none " +
  "rounded-sm border font-semibold leading-none transition duration-150 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-[0.95rem]",
};

const VARIANTS = {
  primary:
    "bg-brand border-brand text-on-brand shadow-xs " +
    "hover:bg-brand-strong hover:border-brand-strong hover:shadow-brand " +
    "active:translate-y-px",
  secondary:
    "bg-surface border-border-strong text-text " +
    "hover:bg-surface-2 hover:shadow-xs active:translate-y-px",
  danger:
    "bg-danger-soft border-danger-border text-danger " +
    "hover:bg-danger-bg-soft hover:text-danger-text active:translate-y-px",
  ghost: "bg-transparent border-transparent text-brand underline underline-offset-2 hover:text-brand-strong px-1 py-0.5",
};

/**
 * Shared button primitive. Replaces the ad hoc `.button-primary` /
 * `.danger-button` / `.linkish-button` classes that were scattered across
 * the app with consistent Tailwind-authored variants driven by the same
 * design tokens (so it still themes correctly in dark/LCARS mode).
 */
const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", className = "", as: Component = "button", type, children, ...rest },
  ref,
) {
  const sizeClasses = variant === "ghost" ? "" : SIZES[size] ?? SIZES.md;
  const classes = [BASE, sizeClasses, VARIANTS[variant] ?? VARIANTS.secondary, className]
    .filter(Boolean)
    .join(" ");

  const componentProps = { ...rest, ref, className: classes };
  if (Component === "button" && !type) {
    componentProps.type = "button";
  } else if (type) {
    componentProps.type = type;
  }

  return <Component {...componentProps}>{children}</Component>;
});

const ICON_SIZES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

/**
 * Icon-only button. Always requires an accessible name via `label` (applied
 * as both `aria-label` and a `title` tooltip) instead of relying solely on
 * a bare `title` attribute, which screen readers don't reliably announce.
 */
export const IconButton = forwardRef(function IconButton(
  { label, variant = "ghost", size = "md", className = "", children, ...rest },
  ref,
) {
  if (import.meta.env?.DEV && !label && !rest["aria-label"]) {
    console.warn("IconButton: missing required `label` prop for accessible naming.");
  }

  const variantClasses =
    variant === "ghost"
      ? "bg-transparent border-transparent text-muted hover:bg-surface-2 hover:text-text"
      : VARIANTS[variant] ?? VARIANTS.secondary;

  const classes = [BASE, ICON_SIZES[size] ?? ICON_SIZES.md, "p-0", variantClasses, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
