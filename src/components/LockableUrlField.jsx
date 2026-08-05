import { useState } from "react";

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.9-1" />
    </svg>
  );
}

/** Return a safe absolute href, or null if the value is not a usable URL. */
export function toClickableHref(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  try {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return parsed.href;
    }

    const parsed = new URL(`https://${trimmed}`);
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function LockableUrlField({
  id,
  value = "",
  onChange,
  disabled = false,
  readOnly = false,
  label = "URL",
  ...extraInputProps
}) {
  const [locked, setLocked] = useState(() => Boolean(String(value ?? "").trim()));
  const href = toClickableHref(value);
  const isLocked = readOnly || locked;

  return (
    <div className={`lockable-url-field${isLocked ? " is-locked" : ""}`}>
      {isLocked && href ? (
        <a
          id={id}
          className="lockable-url-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label}`}
        >
          {String(value).trim()}
        </a>
      ) : (
        <input
          id={id}
          type="url"
          value={value}
          readOnly={isLocked}
          disabled={disabled}
          className={isLocked ? "readonly-field" : undefined}
          onChange={onChange}
          aria-label={label}
          {...extraInputProps}
        />
      )}
      {!readOnly && (
        <button
          type="button"
          className="lockable-url-toggle"
          onClick={() => setLocked((current) => !current)}
          disabled={disabled}
          aria-pressed={isLocked}
          aria-label={isLocked ? `Unlock ${label}` : `Lock ${label}`}
          title={isLocked ? "Unlock to edit" : "Lock field"}
        >
          {isLocked ? <LockIcon /> : <UnlockIcon />}
        </button>
      )}
    </div>
  );
}

export default LockableUrlField;
