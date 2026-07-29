import { useState } from "react";
import { isFullWidthFormField } from "../utils/formLayout";
import FormField from "./ui/FormField";

function MaskedPasswordInput({ id, value, onChange, canReveal, label, placeholder = "" }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="password-field-wrap">
      <input
        id={id}
        type={revealed && canReveal ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        aria-label={label}
        placeholder={placeholder}
      />
      {canReveal ? (
        <button
          type="button"
          className="password-reveal-button"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          aria-label={revealed ? "Hide password" : "Show password"}
        >
          {revealed ? "Hide" : "Show"}
        </button>
      ) : null}
    </div>
  );
}

function TableFormFields({
  columns,
  foreignKeys,
  fkOptions,
  formData,
  onChange,
  columnLabels = {},
  inputTypes = {},
  fieldHints = {},
  inputProps = {},
  disabledFields = {},
  readOnly = false,
  displayValues = {},
  canRevealSecrets = false,
  secretPlaceholders = {},
  layout = "grid",
}) {
  const fields = columns.map((column) => {
    const inputType = inputTypes[column.name] ?? "text";
    const extraInputProps = inputProps[column.name] ?? {};
    const isDisabled = Boolean(disabledFields[column.name]);
    const displayValue = readOnly
      ? (displayValues[column.name] ?? formData[column.name] ?? "")
      : (formData[column.name] ?? "");
    const label = columnLabels[column.name] ?? column.name;
    const fullWidth = isFullWidthFormField(inputType, column.name);
    const fieldId = `field-${column.name}`;

    return (
      <FormField
        key={column.name}
        label={label}
        htmlFor={fieldId}
        hint={fieldHints[column.name]}
        className={fullWidth ? "form-field-full" : undefined}
      >
        {readOnly ? (
          <input id={fieldId} type="text" value={displayValue} readOnly className="readonly-field" />
        ) : foreignKeys[column.name] ? (
          <select
            id={fieldId}
            value={displayValue}
            onChange={(event) => onChange(column.name, event.target.value)}
            disabled={isDisabled}
          >
            <option value="">Select {label}</option>
            {(fkOptions[column.name] ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : inputType === "yesno" ? (
          <select
            id={fieldId}
            value={displayValue === "" || displayValue == null ? "0" : String(Number(displayValue) ? 1 : 0)}
            onChange={(event) => onChange(column.name, event.target.value)}
            disabled={isDisabled}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        ) : inputType === "textarea" ? (
          <textarea
            id={fieldId}
            value={displayValue}
            onChange={(event) => onChange(column.name, event.target.value)}
            rows={3}
            disabled={isDisabled}
          />
        ) : inputType === "password" ? (
          <MaskedPasswordInput
            id={fieldId}
            value={displayValue}
            onChange={(event) => onChange(column.name, event.target.value)}
            canReveal={canRevealSecrets}
            label={label}
            placeholder={secretPlaceholders[column.name] ?? ""}
          />
        ) : (
          <input
            id={fieldId}
            type={inputType}
            value={displayValue}
            onChange={(event) => onChange(column.name, event.target.value)}
            disabled={isDisabled}
            {...extraInputProps}
          />
        )}
      </FormField>
    );
  });

  if (layout === "stack") {
    return fields;
  }

  return <div className="form-grid two-col form-fields-grid">{fields}</div>;
}

export default TableFormFields;
