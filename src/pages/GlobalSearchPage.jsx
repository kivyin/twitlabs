import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchAllApps } from "../api/searchApi";
import PageHeader from "../components/PageHeader";

const PAGE_SIZE = 40;

function HighlightedText({ text, query }) {
  const value = String(text ?? "");
  const needle = String(query ?? "").trim();
  if (!needle) return value;
  const parts = value.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((part, index) =>
    part.toLocaleLowerCase() === needle.toLocaleLowerCase() ? (
      <mark key={`${index}-${part}`}>{part}</mark>
    ) : (
      <Fragment key={`${index}-${part}`}>{part}</Fragment>
    )
  );
}

function GlobalSearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const [payload, setPayload] = useState({
    query: "",
    results: [],
    total: 0,
    has_more: false,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (query.length < 2) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      searchAllApps({ query, limit: PAGE_SIZE })
        .then((result) => {
          if (!cancelled) setPayload(result);
        })
        .catch((searchError) => {
          if (!cancelled) setError(searchError.message || "Search failed.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const loadMore = async () => {
    if (loadingMore || !payload.has_more) return;
    setLoadingMore(true);
    setError("");
    try {
      const next = await searchAllApps({
        query,
        limit: PAGE_SIZE,
        offset: payload.results.length,
      });
      setPayload((current) => ({
        ...next,
        results: [...current.results, ...(next.results ?? [])],
      }));
    } catch (searchError) {
      setError(searchError.message || "Search failed.");
    } finally {
      setLoadingMore(false);
    }
  };

  const grouped = useMemo(() => {
    const apps = new Map();
    const visibleResults = payload.query === query ? payload.results : [];
    for (const result of visibleResults ?? []) {
      if (!apps.has(result.app)) {
        apps.set(result.app, {
          app: result.app,
          label: result.app_label,
          tables: new Map(),
        });
      }
      const app = apps.get(result.app);
      if (!app.tables.has(result.table)) {
        app.tables.set(result.table, {
          table: result.table,
          label: result.table_label,
          results: [],
        });
      }
      app.tables.get(result.table).results.push(result);
    }
    return Array.from(apps.values()).map((app) => ({
      ...app,
      tables: Array.from(app.tables.values()),
    }));
  }, [payload, query]);
  const isPending = loading || (query.length >= 2 && payload.query !== query);
  const visibleTotal = payload.query === query ? payload.total : 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Global search" }]}
        title="Global search"
        subtitle="Safe, accessible records from all enabled applications."
        help={false}
      />

      {query.length < 2 && (
        <section className="panel global-search-empty">
          Enter at least two characters in the search box above.
        </section>
      )}
      {isPending && !error && <p className="status">Searching…</p>}
      {error && <p className="error">{error}</p>}

      {!isPending && !error && query.length >= 2 && (
        <>
          <p className="global-search-summary">
            {visibleTotal === 0
              ? `No results for “${query}”.`
              : `${visibleTotal} result${visibleTotal === 1 ? "" : "s"} for “${query}”.`}
          </p>

          <div className="global-search-results">
            {grouped.map((app) => (
              <section className="global-search-app" key={app.app}>
                <h2>{app.label}</h2>
                {app.tables.map((table) => (
                  <div className="global-search-table" key={table.table}>
                    <h3>
                      {table.label}
                      <span>{table.results.length}</span>
                    </h3>
                    <div className="global-search-hit-list">
                      {table.results.map((result) => (
                        <Link
                          className="global-search-hit"
                          to={result.url}
                          key={`${result.app}-${result.table}-${result.id}`}
                        >
                          <strong>
                            <HighlightedText text={result.title} query={query} />
                          </strong>
                          {result.excerpt && (
                            <span>
                              <HighlightedText text={result.excerpt} query={query} />
                            </span>
                          )}
                          <small>Open {result.table_label}</small>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
          {payload.has_more && (
            <button
              type="button"
              className="button global-search-more"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more results"}
            </button>
          )}
        </>
      )}
    </>
  );
}

export default GlobalSearchPage;
