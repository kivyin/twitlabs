import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function GlobalSearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentQuery =
    location.pathname === "/search"
      ? new URLSearchParams(location.search).get("q") ?? ""
      : "";
  const [query, setQuery] = useState(currentQuery);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <form className="global-search-bar" role="search" onSubmit={handleSubmit}>
      <span className="global-search-icon" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <label className="sr-only" htmlFor="global-search-input">
        Search all applications
      </label>
      <input
        id="global-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search all apps and records…"
        maxLength={120}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" disabled={query.trim().length < 2}>
        Search
      </button>
    </form>
  );
}

export default GlobalSearchBar;
