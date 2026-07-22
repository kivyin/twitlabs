import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  FILTER_OPERATORS,
  createEmptyFilterCondition,
  getFilterValueInputProps,
  getOperatorsForColumn,
} from "../utils/tableFilter";

function FilterValueInput({ category, operator, value, disabled, onChange }) {
  const inputProps = getFilterValueInputProps(category, operator);

  if (inputProps.inputType === "datetime-local" && category === "datetime") {
    const normalizedValue =
      typeof value === "string" && value.includes(" ") && !value.includes("T")
        ? value.replace(" ", "T").slice(0, 16)
        : value;

    return (
      <input
        type="datetime-local"
        value={normalizedValue}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  return (
    <input
      type={inputProps.inputType}
      step={inputProps.step}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

function TableFilterBuilder({
  columns,
  columnLabels = {},
  columnTypeMap = {},
  conditions,
  onChange,
  onApply,
  onClear,
  applying = false,
  activeCount = 0,
}) {
  const panelId = useId();
  const hasActiveFilters = activeCount > 0;
  const [open, setOpen] = useState(hasActiveFilters);

  // Expand when a filter becomes active; collapse when all filters clear.
  // Do not re-open just because the active count changes while still > 0.
  useEffect(() => {
    setOpen(hasActiveFilters);
  }, [hasActiveFilters]);

  const updateCondition = (id, patch) => {
    onChange(
      conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      )
    );
  };

  const addCondition = () => {
    onChange([...conditions, createEmptyFilterCondition()]);
  };

  const removeCondition = (id) => {
    const next = conditions.filter((condition) => condition.id !== id);
    onChange(next.length > 0 ? next : [createEmptyFilterCondition()]);
  };

  return (
    <div className={`table-filter${open ? " is-open" : " is-collapsed"}`}>
      <div className="table-filter-head">
        <button
          type="button"
          className="table-filter-toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <ChevronDown
            className={`table-filter-chevron${open ? " is-open" : ""}`}
            size={16}
            aria-hidden="true"
          />
          <span className="table-filter-toggle-text">
            <strong>Filters</strong>
            <span className="subtext">
              {activeCount > 0
                ? `${activeCount} active`
                : open
                  ? "Add conditions, then apply"
                  : "Hidden — expand to filter this table"}
            </span>
          </span>
          {activeCount > 0 && (
            <span className="table-filter-badge" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </button>

        <div className="table-filter-actions">
          {!open && activeCount > 0 && (
            <button type="button" onClick={onClear}>
              Clear
            </button>
          )}
          {open && (
            <>
              <button type="button" onClick={addCondition}>
                + Add condition
              </button>
              <button type="button" onClick={onClear}>
                Clear
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={onApply}
                disabled={applying}
              >
                {applying ? "Applying..." : "Apply filter"}
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div id={panelId} className="table-filter-body">
          <div className="table-filter-list">
            {conditions.map((condition, index) => {
              const category = columnTypeMap[condition.column] ?? "text";
              const operators = condition.column
                ? getOperatorsForColumn(condition.column, columnTypeMap)
                : Object.entries(FILTER_OPERATORS).map(([value, operator]) => ({
                    value,
                    label: operator.label,
                  }));
              const operatorDef = FILTER_OPERATORS[condition.operator];
              const needsValue = !operatorDef?.noValue;
              const valueInputProps = getFilterValueInputProps(category, condition.operator);

              return (
                <div key={condition.id} className="table-filter-row">
                  <span className="table-filter-index">{index + 1}</span>
                  <label>
                    Column
                    <select
                      value={condition.column}
                      onChange={(event) => {
                        const column = event.target.value;
                        const nextCategory = columnTypeMap[column] ?? "text";
                        const nextOperators = column
                          ? getOperatorsForColumn(column, columnTypeMap)
                          : [];
                        const operator = nextOperators.some(
                          (item) => item.value === condition.operator
                        )
                          ? condition.operator
                          : nextOperators[0]?.value ?? "eq";
                        updateCondition(condition.id, {
                          column,
                          operator,
                          value: nextCategory === category ? condition.value : "",
                        });
                      }}
                    >
                      <option value="">Select column</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {columnLabels[column] ?? column}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Operator
                    <select
                      value={condition.operator}
                      onChange={(event) =>
                        updateCondition(condition.id, { operator: event.target.value })
                      }
                      disabled={!condition.column}
                    >
                      {operators.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="table-filter-value-label">
                      Value
                      {needsValue && condition.column && valueInputProps.labelHint ? (
                        <span className="table-filter-value-hint">
                          {" "}
                          ({valueInputProps.labelHint})
                        </span>
                      ) : null}
                    </span>
                    <FilterValueInput
                      category={category}
                      operator={condition.operator}
                      value={condition.value}
                      disabled={!condition.column || !needsValue}
                      onChange={(event) =>
                        updateCondition(condition.id, { value: event.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="table-filter-remove"
                    onClick={() => removeCondition(condition.id)}
                    aria-label="Remove condition"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TableFilterBuilder;
