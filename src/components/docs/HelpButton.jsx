import { useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
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
        <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
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
