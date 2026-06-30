function ConfirmModal({ title, message, onCancel, onConfirm, confirmLabel = "Confirm" }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="row">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
