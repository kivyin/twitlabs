function NotesModal({ title, subtitle, children, footer, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-card notes-modal${wide ? " notes-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="notes-modal-header">
          <h2 id="notes-modal-title">{title}</h2>
          {subtitle && <p className="subtext">{subtitle}</p>}
        </div>

        <div className="notes-modal-body">{children}</div>

        {footer && <div className="form-actions notes-modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

export default NotesModal;
