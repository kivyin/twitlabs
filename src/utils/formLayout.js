/** Input types that should span the full form width in a two-column layout. */
const FULL_WIDTH_INPUT_TYPES = new Set(["textarea", "url"]);

/**
 * Whether a form field should span both columns in a compressed two-column layout.
 * Large fields (textarea, URL) stay full width; everything else pairs side by side.
 */
export function isFullWidthFormField(inputType = "text", columnName = "") {
  if (FULL_WIDTH_INPUT_TYPES.has(inputType)) {
    return true;
  }

  // Defensive: some tables may not set inputTypes for known long-text columns.
  const name = String(columnName).toLowerCase();
  return name === "notes" || name === "description" || name.endsWith("_url");
}
