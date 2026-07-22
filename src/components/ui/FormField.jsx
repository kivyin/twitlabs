/**
 * Consistent label/input/hint/error layout for dictionary-driven forms.
 */
function FormField({ label, htmlFor, required = false, hint, error, children, className = "" }) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;

  return (
    <div className={["form-field", className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="field-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default FormField;
