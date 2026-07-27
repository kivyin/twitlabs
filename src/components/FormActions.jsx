import { Link } from "react-router-dom";

/**
 * Sticky command header for record create/edit forms.
 * Wrap form fields so save/cancel stay reachable while scrolling.
 *
 * variant:
 * - "command" (default): bordered command bar with kicker
 * - "section-head": matches register-transactions-head (title left, actions right)
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
  subtitle,
  variant = "command",
}) {
  const isSectionHead = variant === "section-head";
  const cancelClassName = isSectionHead ? "button" : "linkish-button";

  const buttons = (
    <>
      {cancelHref ? (
        <Link to={cancelHref} className={cancelClassName}>
          {cancelLabel}
        </Link>
      ) : onCancel ? (
        <button
          type="button"
          className={isSectionHead ? "button" : undefined}
          onClick={onCancel}
          disabled={saving}
        >
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
    </>
  );

  if (isSectionHead) {
    return (
      <>
        <div className="register-transactions-head form-section-head" role="toolbar" aria-label={heading}>
          <div>
            <h2>{heading}</h2>
            {subtitle ? <p className="subtext">{subtitle}</p> : null}
          </div>
          <div className="related-records-actions">{buttons}</div>
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <div className="form-command-bar" role="toolbar" aria-label={heading}>
        <div className="form-command-bar-label">
          <span className="form-command-bar-kicker">Command</span>
          <strong>{heading}</strong>
        </div>
        <div className="form-command-bar-buttons">{buttons}</div>
      </div>
      {children}
    </>
  );
}

export default FormActions;
