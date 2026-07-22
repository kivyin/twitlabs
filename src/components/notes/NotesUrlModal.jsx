import { useEffect, useRef, useState } from "react";
import NotesModal from "./NotesModal";

function NotesUrlModal({
  open,
  onClose,
  onSubmit,
  title = "Insert link",
  subtitle = "Add a web address to the selected text.",
  submitLabel = "Insert",
  inputLabel = "URL",
  placeholder = "https://example.com",
  initialValue = "https://",
  inputType = "url",
}) {
  const [url, setUrl] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <NotesModal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="notes-url-form" className="button-primary" disabled={!url.trim()}>
            {submitLabel}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <form id="notes-url-form" className="form notes-create-form" onSubmit={handleSubmit}>
        <label>
          {inputLabel}
          <input
            ref={inputRef}
            type={inputType}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={placeholder}
            required
          />
        </label>
      </form>
    </NotesModal>
  );
}

export default NotesUrlModal;
