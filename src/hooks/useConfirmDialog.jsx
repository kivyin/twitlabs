import { useCallback, useState } from "react";
import ConfirmModal from "../components/common/ConfirmModal";

/**
 * Promise-based confirm dialog for any app / CRUD action.
 * Renders the shared ConfirmModal so prompts stay consistent hub-wide.
 *
 * Usage:
 *   const { confirm, confirmModal } = useConfirmDialog();
 *   if (!(await confirm({ title: "Delete?", message: "…" }))) return;
 *   …render {confirmModal} near the page root…
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        title: options.title || "Confirm",
        message: options.message || "Are you sure?",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        confirmVariant: options.confirmVariant || "danger",
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setState((prev) => {
      prev?.resolve?.(result);
      return null;
    });
  }, []);

  const confirmModal = state ? (
    <ConfirmModal
      open
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      confirmVariant={state.confirmVariant}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { confirm, confirmModal };
}

export default useConfirmDialog;
