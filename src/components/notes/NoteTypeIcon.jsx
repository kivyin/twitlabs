import { getNoteTypeLabel } from "../../utils/noteUtils";

const ICONS = {
  general: (
    <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
  ),
  meeting: (
    <>
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M3.5 19c.6-2.6 2.6-4 4.5-4s3.9 1.4 4.5 4" />
      <path d="M14 15c1.6 0 3.2 1 3.8 3" />
    </>
  ),
  idea: (
    <>
      <path d="M12 3a6 6 0 0 0-3.5 10.8V16h7v-2.2A6 6 0 0 0 12 3Z" />
      <path d="M10 19h4" />
      <path d="M10.5 21h3" />
    </>
  ),
  reference: (
    <>
      <path d="M7 4h10v16l-5-3-5 3V4Z" />
    </>
  ),
  journal: (
    <>
      <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z" />
      <path d="M7 4v16" />
    </>
  ),
  checklist: (
    <>
      <path d="M9 7h10" />
      <path d="M9 12h10" />
      <path d="M9 17h10" />
      <path d="M5 7l1 1 2-2" />
      <path d="M5 12l1 1 2-2" />
      <path d="M5 17l1 1 2-2" />
    </>
  ),
};

function NoteTypeIcon({ type = "general", className = "" }) {
  const label = getNoteTypeLabel(type);
  const paths = ICONS[type] ?? ICONS.general;

  return (
    <svg
      className={`notes-note-type-icon ${className}`.trim()}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={label}
      role="img"
    >
      {paths}
    </svg>
  );
}

export default NoteTypeIcon;
