import { useEffect, useMemo, useState } from "react";

/**
 * Dual-list (slush bucket) picker: available on the left, selected on the right.
 * Used for table columns and sidebar navigation layout.
 */
function ColumnPickerModal({
  open,
  onClose,
  onApply,
  onReset,
  availableColumns = [],
  selectedColumns = [],
  columnLabels = {},
  title = "Choose columns",
  description = "Move columns between Available and Selected. Order on the right controls the table display order.",
  availableHeading = "Available",
  selectedHeading = "Selected",
  availableAriaLabel = "Available columns",
  selectedAriaLabel = "Selected columns",
  applyLabel = "Apply",
  minSelected = 1,
  allowEmpty = false,
}) {
  const minimum = allowEmpty ? 0 : Math.max(0, minSelected);
  const [draftSelected, setDraftSelected] = useState(selectedColumns);
  const [leftFocus, setLeftFocus] = useState([]);
  const [rightFocus, setRightFocus] = useState([]);

  useEffect(() => {
    if (!open) return;
    setDraftSelected(selectedColumns.filter((column) => availableColumns.includes(column)));
    setLeftFocus([]);
    setRightFocus([]);
  }, [open, selectedColumns, availableColumns]);

  const available = useMemo(
    () => availableColumns.filter((column) => !draftSelected.includes(column)),
    [availableColumns, draftSelected]
  );

  const labelFor = (column) => columnLabels[column] ?? column;

  const moveToSelected = () => {
    if (leftFocus.length === 0) return;
    setDraftSelected((current) => [...current, ...leftFocus.filter((c) => !current.includes(c))]);
    setLeftFocus([]);
  };

  const moveToAvailable = () => {
    if (rightFocus.length === 0) return;
    if (draftSelected.length - rightFocus.length < minimum) return;
    setDraftSelected((current) => current.filter((column) => !rightFocus.includes(column)));
    setRightFocus([]);
  };

  const moveUp = () => {
    if (rightFocus.length !== 1) return;
    const column = rightFocus[0];
    setDraftSelected((current) => {
      const index = current.indexOf(column);
      if (index <= 0) return current;
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = () => {
    if (rightFocus.length !== 1) return;
    const column = rightFocus[0];
    setDraftSelected((current) => {
      const index = current.indexOf(column);
      if (index < 0 || index >= current.length - 1) return current;
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleApply = () => {
    if (draftSelected.length < minimum) return;
    onApply?.(draftSelected);
    onClose?.();
  };

  const handleReset = () => {
    onReset?.();
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel column-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="column-picker-title">{title}</h2>
        <p className="subtext">{description}</p>

        <div className="slush-bucket">
          <div className="slush-bucket-pane">
            <div className="slush-bucket-pane-head">
              <strong>{availableHeading}</strong>
              <span className="subtext">{available.length}</span>
            </div>
            <select
              className="slush-bucket-list"
              multiple
              size={12}
              value={leftFocus}
              onChange={(event) =>
                setLeftFocus(Array.from(event.target.selectedOptions, (option) => option.value))
              }
              onDoubleClick={moveToSelected}
              aria-label={availableAriaLabel}
            >
              {available.map((column) => (
                <option key={column} value={column}>
                  {labelFor(column)}
                </option>
              ))}
            </select>
          </div>

          <div className="slush-bucket-actions">
            <button type="button" onClick={moveToSelected} disabled={leftFocus.length === 0}>
              Add →
            </button>
            <button
              type="button"
              onClick={moveToAvailable}
              disabled={
                rightFocus.length === 0 || draftSelected.length - rightFocus.length < minimum
              }
            >
              ← Remove
            </button>
            <button type="button" onClick={moveUp} disabled={rightFocus.length !== 1}>
              Move up
            </button>
            <button type="button" onClick={moveDown} disabled={rightFocus.length !== 1}>
              Move down
            </button>
          </div>

          <div className="slush-bucket-pane">
            <div className="slush-bucket-pane-head">
              <strong>{selectedHeading}</strong>
              <span className="subtext">{draftSelected.length}</span>
            </div>
            <select
              className="slush-bucket-list"
              multiple
              size={12}
              value={rightFocus}
              onChange={(event) =>
                setRightFocus(Array.from(event.target.selectedOptions, (option) => option.value))
              }
              onDoubleClick={moveToAvailable}
              aria-label={selectedAriaLabel}
            >
              {draftSelected.map((column) => (
                <option key={column} value={column}>
                  {labelFor(column)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleReset}>
            Reset defaults
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={handleApply}
            disabled={draftSelected.length < minimum}
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColumnPickerModal;
