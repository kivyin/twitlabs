import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-[480px]",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Accessible dialog shell: role="dialog", aria-modal, labelling, a focus
 * trap, Escape-to-close, backdrop click, and focus restoration on close.
 * Replaces the ~8 hand-rolled `.modal-backdrop` / `.modal-card` pairs
 * scattered across the app (ConfirmModal, BrandSettingsModal, ...).
 */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  initialFocusRef,
  className = "",
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const target = initialFocusRef?.current ?? getFocusable(dialogRef.current)[0] ?? dialogRef.current;
    target?.focus?.();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key === "Tab") {
        const focusable = getFocusable(dialogRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] animate-[fade-in_140ms_ease]"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[
          "app-modal w-full rounded-lg border border-border bg-surface shadow-md p-6 outline-none animate-[pop-in_160ms_ease]",
          SIZES[size] ?? SIZES.md,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title && (
          <h2 id={titleId} className="mt-0">
            {title}
          </h2>
        )}
        {description && (
          <p id={descId} className="text-muted mb-5">
            {description}
          </p>
        )}
        {children}
        {footer && (
          <div className="flex gap-2 flex-wrap justify-end pt-4 mt-4 border-t border-border">{footer}</div>
        )}
      </div>
    </div>
  );
}

export default Modal;
