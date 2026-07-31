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
  allowFileUpload = false,
  fileAccept = "image/*",
  onFileSelected,
}) {
  const [url, setUrl] = useState(initialValue);
  const [fileError, setFileError] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setUrl(initialValue);
    setFileError("");
    setFileBusy(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, initialValue]);

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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onFileSelected) return;
    setFileBusy(true);
    setFileError("");
    try {
      await onFileSelected(file);
      onClose();
    } catch (error) {
      setFileError(error.message || "Could not insert that image.");
    } finally {
      setFileBusy(false);
    }
  };

  return (
    <NotesModal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="submit"
            form="notes-url-form"
            className="button-primary"
            disabled={!url.trim() || fileBusy}
          >
            {submitLabel}
          </button>
          <button type="button" onClick={onClose} disabled={fileBusy}>
            Cancel
          </button>
        </>
      }
    >
      <form id="notes-url-form" className="form notes-create-form" onSubmit={handleSubmit}>
        {allowFileUpload && (
          <div className="notes-image-upload-field">
            <button
              type="button"
              className="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileBusy}
            >
              {fileBusy ? "Inserting…" : "Upload image from computer"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={fileAccept}
              hidden
              onChange={handleFileChange}
            />
            <p className="subtext">Or paste a URL / data URL below.</p>
          </div>
        )}

        <label>
          {inputLabel}
          <input
            ref={inputRef}
            type={inputType}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={placeholder}
            required={!allowFileUpload}
          />
        </label>

        {fileError && <p className="error">{fileError}</p>}
      </form>
    </NotesModal>
  );
}

export default NotesUrlModal;
