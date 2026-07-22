import { useEffect } from "react";
import DocContent from "./DocContent";

function HelpModal({ open, title, doc, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-wide doc-help-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <div className="doc-help-modal-header">
          <h2 id="help-modal-title">{title || doc?.title || "Help"}</h2>
          <button type="button" className="doc-help-close" onClick={onClose} aria-label="Close help">
            ×
          </button>
        </div>
        <DocContent doc={doc} showFullLink />
      </div>
    </div>
  );
}

export default HelpModal;
