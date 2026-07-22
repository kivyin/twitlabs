import { useMemo, useState } from "react";
import { getHelpDoc } from "../../utils/docHelp";
import HelpModal from "./HelpModal";

function HelpButton({ help, label = "Help" }) {
  const [open, setOpen] = useState(false);
  const doc = useMemo(() => getHelpDoc(help), [help]);

  if (!help?.app) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="help-button"
        onClick={() => setOpen(true)}
        aria-label={`${label} for this page`}
        title={label}
      >
        ?
      </button>
      <HelpModal
        open={open}
        title={doc?.title}
        doc={doc}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default HelpButton;
