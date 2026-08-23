function FieldHint({ text, className = "" }) {
  if (!text) return null;

  return (
    <span
      className={["field-hint", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={text}
      title={text}
      tabIndex={0}
    >
      ?
    </span>
  );
}

export default FieldHint;
