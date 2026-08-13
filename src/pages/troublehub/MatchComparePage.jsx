import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  compareMatchAnswers,
  listMatchPlayers,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/ui/Modal";
import {
  COMPARE_FILTER_OPTIONS,
  COMPARE_SORT_OPTIONS,
  computeMatchPercent,
  filterComparisonRows,
  formatHeat,
  formatYnm,
  matchGradientStyle,
  sortComparisonRows,
} from "./matchCompareUtils";

function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h7l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M15 4v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MatchComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [compareUserId, setCompareUserId] = useState(() => searchParams.get("user_id") || "");
  const [comparison, setComparison] = useState(null);
  const [sortKey, setSortKey] = useState("match_desc");
  const [filterKey, setFilterKey] = useState("all");
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");
  const [noteModal, setNoteModal] = useState(null);

  useEffect(() => {
    let active = true;
    listMatchPlayers()
      .then((payload) => {
        if (active) setPlayers(payload.players || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load players.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const runCompare = useCallback(async (userId) => {
    if (!userId) {
      setComparison(null);
      return;
    }
    setComparing(true);
    setError("");
    try {
      const payload = await compareMatchAnswers(Number(userId));
      setComparison(payload);
    } catch (compareError) {
      setComparison(null);
      setError(compareError.message || "Could not compare.");
    } finally {
      setComparing(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("user_id");
    if (fromUrl && fromUrl !== compareUserId) {
      setCompareUserId(fromUrl);
    }
    if (fromUrl) {
      runCompare(fromUrl);
    }
    // Intentionally sync from URL on mount / external param change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const rows = useMemo(() => {
    const raw = (comparison?.comparisons || []).map((row) => ({
      ...row,
      matchPercent: computeMatchPercent(row),
    }));
    return sortComparisonRows(filterComparisonRows(raw, filterKey), sortKey);
  }, [comparison, filterKey, sortKey]);

  const totalCount = comparison?.comparisons?.length || 0;

  const otherLabel =
    comparison?.other_user?.display_name || comparison?.other_user?.username || "Them";

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Match Mischief", to: "/app/troublehub/match" },
          { label: "Compare" },
        ]}
        title="Compare answers"
        subtitle="Match % is Yes/No/Maybe + heat closeness. Use wildest filters to find fantasies to act on."
        actions={
          <Link className="button" to="/app/troublehub/match">
            Back to Match
          </Link>
        }
      />

      {error ? <p className="error">{error}</p> : null}

      <section className="panel th-compare-page">
        <div className="th-compare-controls">
          <label>
            Compare with
            <select
              value={compareUserId}
              disabled={loading || comparing}
              onChange={(event) => {
                const value = event.target.value;
                setCompareUserId(value);
                if (value) {
                  setSearchParams({ user_id: value });
                  runCompare(value);
                } else {
                  setSearchParams({});
                  setComparison(null);
                }
              }}
            >
              <option value="">Select a player…</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.display_name || player.username}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filter
            <select
              value={filterKey}
              disabled={!comparison}
              onChange={(event) => setFilterKey(event.target.value)}
            >
              {COMPARE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort by
            <select
              value={sortKey}
              disabled={!comparison}
              onChange={(event) => setSortKey(event.target.value)}
            >
              {COMPARE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {comparison && filterKey !== "all" ? (
          <p className="subtext">
            Showing {rows.length} of {totalCount} cards
          </p>
        ) : null}

        {loading || comparing ? (
          <p className="subtext">{loading ? "Loading players…" : "Comparing…"}</p>
        ) : null}

        {!loading && !comparing && !comparison ? (
          <p className="subtext">Pick another TroubleHub player to compare answers.</p>
        ) : null}

        {comparison && rows.length === 0 ? (
          <p className="subtext">No cards match this filter.</p>
        ) : null}

        {comparison && rows.length > 0 ? (
          <div className="th-compare-table-wrap">
            <div className="th-compare-table-head" aria-hidden="true">
              <span>Card</span>
              <span>You</span>
              <span>{otherLabel}</span>
              <span>Heat</span>
              <span>Dreams</span>
              <span>Match</span>
              <span>Notes</span>
            </div>
            <ul className="th-compare-rows">
              {rows.map((row) => {
                const idea = row.card?.idea || row.card?.question || row.card?.statement || "Card";
                const description = row.card?.description || "";
                const myNote = String(row.mine?.notes || "").trim();
                const theirNote = String(row.theirs?.notes || "").trim();
                const hasNotes = Boolean(myNote || theirNote);
                const pct = row.matchPercent || 0;

                return (
                  <li
                    key={row.card.id}
                    className="th-compare-row-card"
                    style={matchGradientStyle(pct)}
                  >
                    <div className="th-compare-card-copy">
                      <strong>{idea}</strong>
                      {description ? <p className="th-compare-desc">{description}</p> : null}
                    </div>
                    <div className="th-compare-cell" data-label="You">
                      <span className="th-compare-pill">{formatYnm(row.mine?.rating_ynm)}</span>
                    </div>
                    <div className="th-compare-cell" data-label={otherLabel}>
                      <span className="th-compare-pill">{formatYnm(row.theirs?.rating_ynm)}</span>
                    </div>
                    <div className="th-compare-cell th-compare-heat" data-label="Heat">
                      <span title="Your heat">{formatHeat(row.mine?.rating_heat)}</span>
                      <span className="stat-meta">/</span>
                      <span title={`${otherLabel} heat`}>{formatHeat(row.theirs?.rating_heat)}</span>
                    </div>
                    <div className="th-compare-cell th-compare-dreams" data-label="Dreams">
                      <span title="Your wildest dream" aria-label={row.mine?.wildest_dream ? "You: yes" : "You: no"}>
                        {row.mine?.wildest_dream ? "☄️" : "·"}
                      </span>
                      <span className="stat-meta">/</span>
                      <span
                        title={`${otherLabel} wildest dream`}
                        aria-label={row.theirs?.wildest_dream ? `${otherLabel}: yes` : `${otherLabel}: no`}
                      >
                        {row.theirs?.wildest_dream ? "☄️" : "·"}
                      </span>
                    </div>
                    <div className="th-compare-cell th-compare-pct" data-label="Match">
                      <strong>{pct}%</strong>
                    </div>
                    <div className="th-compare-cell th-compare-notes" data-label="Notes">
                      {hasNotes ? (
                        <button
                          type="button"
                          className="th-compare-note-btn"
                          aria-label={`Notes for ${idea}`}
                          title="View notes"
                          onClick={() =>
                            setNoteModal({
                              idea,
                              myNote,
                              theirNote,
                              otherLabel,
                            })
                          }
                        >
                          <NoteIcon />
                        </button>
                      ) : (
                        <span className="stat-meta">—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(noteModal)}
        onClose={() => setNoteModal(null)}
        title={noteModal ? `Notes · ${noteModal.idea}` : "Notes"}
        footer={
          <button type="button" className="button" onClick={() => setNoteModal(null)}>
            Close
          </button>
        }
      >
        {noteModal ? (
          <div className="th-compare-note-modal">
            <section>
              <h3>Your note</h3>
              <p>{noteModal.myNote || "No note."}</p>
            </section>
            <section>
              <h3>{noteModal.otherLabel}’s note</h3>
              <p>{noteModal.theirNote || "No note."}</p>
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default MatchComparePage;
