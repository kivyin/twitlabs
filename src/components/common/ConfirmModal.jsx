import { useRef } from "react";
import { Button, Modal } from "../ui";

/**
 * Shared confirmation dialog built on the accessible Modal shell.
 * Prefer `useConfirmDialog()` for async confirm flows in any app/CRUD page.
 * Prefer this component directly when you already manage open state.
 * Do not use window.confirm.
 */
function ConfirmModal({
  open = true,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  confirmVariant = "danger",
}) {
  const confirmRef = useRef(null);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) {
          onCancel?.();
        }
      }}
      title={title}
      description={message}
      size="sm"
      closeOnBackdrop={!busy}
      initialFocusRef={confirmRef}
      className="confirm-modal"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export default ConfirmModal;
