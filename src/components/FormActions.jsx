import { Link } from "react-router-dom";

/**
 * Sticky command header for record create/edit forms.
 * Wrap form fields so save/cancel stay reachable while scrolling.
 */
function FormActions({
  children,
  saving = false,
  submitLabel,
  onCancel,
  cancelLabel = "Cancel",
  cancelHref,
  onDelete,
  deleteLabel = "Delete",
  heading = "Actions",
}) {
  return (
    <>
      <div className="form-command-bar" role="toolbar" aria-label={heading}>
        <div className="form-command-bar-label">
          <span className="form-command-bar-kicker">Command</span>
          <strong>{heading}</strong>
        </div>
        <div className="form-command-bar-buttons">
          {cancelHref ? (
            <Link to={cancelHref} className="linkish-button">
              {cancelLabel}
            </Link>
          ) : onCancel ? (
            <button type="button" onClick={onCancel} disabled={saving}>
              {cancelLabel}
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="danger-button" onClick={onDelete} disabled={saving}>
              {deleteLabel}
            </button>
          ) : null}
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

export default FormActions;
