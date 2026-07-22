import { useEffect, useRef, useState } from "react";
import { useBranding } from "../context/BrandingContext";
import { DEFAULT_BRANDING } from "../utils/branding";
import NotesModal from "./notes/NotesModal";

function BrandSettingsModal({ open, onClose }) {
  const { branding, setBranding, resetBranding } = useBranding();
  const [appName, setAppName] = useState(branding.appName);
  const [shipName, setShipName] = useState(branding.shipName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setAppName(branding.appName);
    setShipName(branding.shipName);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, branding]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setBranding({ appName, shipName });
    onClose();
  };

  const handleReset = () => {
    resetBranding();
    onClose();
  };

  return (
    <NotesModal
      title="Branding"
      subtitle="Customize the application name and optional ship designation shown across the workspace."
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="brand-settings-form" className="button-primary">
            Save branding
          </button>
          <button type="button" onClick={handleReset}>
            Reset defaults
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <form id="brand-settings-form" className="form notes-create-form" onSubmit={handleSubmit}>
        <label>
          Application name
          <input
            ref={inputRef}
            type="text"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            placeholder={DEFAULT_BRANDING.appName}
            required
          />
        </label>

        <label>
          Ship name <span className="subtext">(optional)</span>
          <input
            type="text"
            value={shipName}
            onChange={(event) => setShipName(event.target.value)}
            placeholder="U.S.S. Example"
          />
        </label>

        <p className="subtext brand-settings-hint">
          The ship name appears in the sidebar and page title. It looks especially at home with the
          LCARS theme.
        </p>
      </form>
    </NotesModal>
  );
}

export default BrandSettingsModal;
