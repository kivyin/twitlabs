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
 * On small screens the body scrolls so title/actions stay reachable.
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
      className="app-modal-backdrop fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-[var(--overlay-backdrop)] backdrop-blur-[2px] animate-[fade-in_140ms_ease]"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="app-modal-frame flex min-h-full items-center justify-center p-3 sm:p-4"
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
            "app-modal w-full rounded-lg border border-border bg-surface shadow-md outline-none animate-[pop-in_160ms_ease] flex flex-col",
            SIZES[size] ?? SIZES.md,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {(title || description) && (
            <div className="app-modal-header shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
              {title && (
                <h2 id={titleId} className="mt-0 mb-0">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-muted mt-2 mb-0">
                  {description}
                </p>
              )}
            </div>
          )}
          <div className="app-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {children}
          </div>
          {footer && (
            <div className="app-modal-footer shrink-0 flex gap-2 flex-wrap justify-end px-5 py-4 sm:px-6 border-t border-border">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
