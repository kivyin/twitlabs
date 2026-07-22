import { useRef } from "react";
import { Button, Modal } from "../ui";

/**
 * Shared confirmation dialog built on the accessible Modal shell.
 * Use this for every destructive / confirm prompt instead of window.confirm
 * or a one-off modal card so all confirms share the same look and behavior.
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
