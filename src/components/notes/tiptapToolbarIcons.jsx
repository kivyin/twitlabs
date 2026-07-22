function icon(children, size = 16) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const toolbarIcons = {
  undo: icon(
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
    </>
  ),
  redo: icon(
    <>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
    </>
  ),
  bold: icon(
    <>
      <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
    </>
  ),
  italic: icon(
    <>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </>
  ),
  underline: icon(
    <>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </>
  ),
  strike: icon(
    <>
      <path d="M16 4H9a3 3 0 0 0 0 6h6" />
      <path d="M8 20h7a3 3 0 0 0 0-6H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </>
  ),
  code: icon(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  codeBlock: icon(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m9 10-2 2 2 2" />
      <path d="m15 10 2 2-2 2" />
    </>
  ),
  subscript: icon(
    <>
      <path d="m4 5 6 6" />
      <path d="m10 5-6 6" />
      <path d="M15 18h5l-4 3" />
    </>
  ),
  superscript: icon(
    <>
      <path d="m4 19 6-6" />
      <path d="m10 19-6-6" />
      <path d="M15 6h5l-4-3" />
    </>
  ),
  bulletList: icon(
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  orderedList: icon(
    <>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </>
  ),
  taskList: icon(
    <>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="m4.5 8 1.2 1.2L8.5 6.5" />
      <line x1="12" y1="8" x2="21" y2="8" />
      <rect x="3" y="13" width="6" height="6" rx="1" />
      <line x1="12" y1="16" x2="21" y2="16" />
    </>
  ),
  blockquote: icon(
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
    </>
  ),
  hr: icon(
    <>
      <line x1="4" y1="12" x2="20" y2="12" />
    </>
  ),
  alignLeft: icon(
    <>
      <line x1="17" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </>
  ),
  alignCenter: icon(
    <>
      <line x1="18" y1="10" x2="6" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="18" y1="18" x2="6" y2="18" />
    </>
  ),
  alignRight: icon(
    <>
      <line x1="21" y1="10" x2="7" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="7" y2="18" />
    </>
  ),
  alignJustify: icon(
    <>
      <line x1="21" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </>
  ),
  link: icon(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  unlink: icon(
    <>
      <path d="M18.84 12.25 21 10.1a5 5 0 0 0-7.07-7.07l-2.14 2.14" />
      <path d="m5.16 11.75-2.14 2.15a5 5 0 0 0 7.07 7.07l2.14-2.14" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="16" y1="19" x2="16" y2="22" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </>
  ),
  image: icon(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  table: icon(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </>
  ),
  clear: icon(
    <>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </>
  ),
  highlight: icon(
    <>
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m14 7 4.2-4.2c.8-.8 2-.8 2.8 0l1.4 1.4c.8.8.8 2 0 2.8L17 12" />
      <path d="m15 8 2 2" />
    </>
  ),
  color: icon(
    <>
      <path d="M4 20h16" />
      <path d="m6.5 15 5.5-12 5.5 12" />
      <path d="M8.5 11h7" />
    </>
  ),
  addColBefore: icon(
    <>
      <rect x="8" y="4" width="12" height="16" rx="1" />
      <path d="M4 12h3" />
      <path d="M5.5 10.5v3" />
    </>
  ),
  addColAfter: icon(
    <>
      <rect x="4" y="4" width="12" height="16" rx="1" />
      <path d="M18 12h3" />
      <path d="M19.5 10.5v3" />
    </>
  ),
  deleteCol: icon(
    <>
      <rect x="4" y="4" width="12" height="16" rx="1" />
      <path d="M18 10l3 3" />
      <path d="M21 10l-3 3" />
    </>
  ),
  addRowBefore: icon(
    <>
      <rect x="4" y="8" width="16" height="12" rx="1" />
      <path d="M12 3v3" />
      <path d="M10.5 4.5h3" />
    </>
  ),
  addRowAfter: icon(
    <>
      <rect x="4" y="4" width="16" height="12" rx="1" />
      <path d="M12 18v3" />
      <path d="M10.5 19.5h3" />
    </>
  ),
  deleteRow: icon(
    <>
      <rect x="4" y="4" width="16" height="12" rx="1" />
      <path d="M10 18l3 3" />
      <path d="M13 18l-3 3" />
    </>
  ),
  deleteTable: icon(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
};
