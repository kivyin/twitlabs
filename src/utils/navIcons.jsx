export const NAV_ICON_OPTIONS = [
  { value: "", label: "Default" },
  { value: "home", label: "Home" },
  { value: "app", label: "Application" },
  { value: "tables", label: "Table" },
  { value: "applications", label: "Applications" },
  { value: "fields", label: "Fields" },
  { value: "users", label: "Users" },
  { value: "ide", label: "IDE" },
  { value: "backup", label: "Backup" },
  { value: "deletes", label: "Deleted records" },
  { value: "logs", label: "Error logs" },
  { value: "navigation", label: "Navigation" },
  { value: "reports", label: "Reports" },
  { value: "tasks", label: "Tasks" },
  { value: "board", label: "Board" },
  { value: "focus", label: "Focus" },
  { value: "notes", label: "Notes" },
  { value: "decisions", label: "Decision Picker" },
  { value: "site-tracker", label: "Site Tracker" },
  { value: "training", label: "Training" },
  { value: "calendar", label: "Calendar" },
  { value: "sparkles", label: "AI Coach" },
];

export const navIcons = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9" />,
  app: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  applications: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  tables: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M12 3v18" />
    </>
  ),
  fields: <path d="M4 7h16M4 12h16M4 17h10" />,
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  ide: <path d="m8 9-3 3 3 3m8-6 3 3-3 3M13 6l-2 12" />,
  backup: (
    <>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 15v4h14v-4" />
    </>
  ),
  deletes: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 6l1 14h12l1-14" />
    </>
  ),
  logs: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  navigation: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
    </>
  ),
  reports: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="10" rx="1" />
      <rect x="17" y="4" width="5" height="14" rx="1" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  notes: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V4a2 2 0 0 0-2-2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  decisions: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6 3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  "site-tracker": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  training: (
    <>
      <path d="M6.5 6.5 4 9l3 3 2.5-2.5" />
      <path d="M17.5 6.5 20 9l-3 3-2.5-2.5" />
      <path d="M9 12h6" />
      <path d="M10 15l2 5 2-5" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="7" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z" />
      <path d="M5 14l.7 2.1L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.9L5 14z" />
      <path d="M18 13l.8 2.4L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.6L18 13z" />
    </>
  ),
};

export function getNavIcon(iconKey, fallback = "app") {
  return navIcons[iconKey] ?? navIcons[fallback] ?? navIcons.app;
}
