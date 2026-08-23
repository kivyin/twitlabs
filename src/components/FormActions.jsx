import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

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
  extraActions,
  variant = "command",
}) {
  const { resolvedTheme } = useTheme();
  const markerId = useId();
  const [commandHost, setCommandHost] = useState(null);
  const isSectionHead = variant === "section-head";
  const useV2CommandRail = resolvedTheme === "lcars-v2" && !isSectionHead;
  const cancelClassName = isSectionHead ? "button" : "linkish-button";

  useEffect(() => {
    if (!useV2CommandRail) {
      return undefined;
    }
    // The shell command host is external DOM that becomes available after the shell commits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommandHost(document.getElementById("lcars-v2-command-host"));
    return () => setCommandHost(null);
  }, [useV2CommandRail]);

  const requestFormSubmit = () => {
    document.getElementById(markerId)?.closest("form")?.requestSubmit();
  };

  const renderButtons = ({ inCommandRail = false } = {}) => (
    <>
      {extraActions}
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
      <button
        type={inCommandRail ? "button" : "submit"}
        className="button-primary"
        disabled={saving}
        onClick={inCommandRail ? requestFormSubmit : undefined}
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </>
  );
  const buttons = renderButtons();

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

  if (useV2CommandRail && commandHost) {
    return (
      <>
        <span id={markerId} hidden />
        {createPortal(
          <div className="form-command-bar" role="toolbar" aria-label={heading}>
            <div className="form-command-bar-label">
              <span className="form-command-bar-kicker">Command</span>
              <strong>{heading}</strong>
            </div>
            <div className="form-command-bar-buttons">
              {renderButtons({ inCommandRail: true })}
            </div>
          </div>,
          commandHost
        )}
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
