/**
 * Consistent label/input/hint/error layout for dictionary-driven forms.
 */
import FieldHint from "./FieldHint";

function FormField({ label, htmlFor, required = false, hint, error, children, className = "" }) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={["form-field", className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={htmlFor}>
          <span className="field-label-row">
            <span>
              {label}
              {required && (
                <span className="field-required" aria-hidden="true">
                  *
                </span>
              )}
            </span>
            {!error && hint ? <FieldHint text={hint} /> : null}
          </span>
        </label>
      )}
      {children}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : hint && !label ? (
        <FieldHint text={hint} />
      ) : null}
    </div>
  );
}

export default FormField;
