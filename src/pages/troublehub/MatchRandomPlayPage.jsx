import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HEAT_LEVELS,
  YNM_OPTIONS,
  getMatchCardAnswers,
  getMatchPlayState,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import MatchCardImage from "./MatchCardImage";
import {
  filterCardsForPlay,
  pickRandomCard,
  uniqueCategories,
} from "./matchPlayUtils";

const SFW_STORAGE_KEY = "troublehub-match-sfw";

function readSfwPreference() {
  try {
    return localStorage.getItem(SFW_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function formatAnswer(answer) {
  if (!answer) return null;
  const ynm = answer.rating_ynm
    ? answer.rating_ynm.charAt(0).toUpperCase() + answer.rating_ynm.slice(1)
    : "—";
  const heat = HEAT_LEVELS.find((level) => level.value === Number(answer.rating_heat));
  const heatLabel = heat ? `${heat.icon} ${heat.label}` : "—";
  return {
    ynm,
    heatLabel,
    wildest: Boolean(answer.wildest_dream),
    notes: String(answer.notes || "").trim(),
  };
}

function MatchRandomPlayPage() {
  const [cards, setCards] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sfwMode, setSfwMode] = useState(() => readSfwPreference());
  const [category, setCategory] = useState("");
  const [ratingYnm, setRatingYnm] = useState("");
  const [ratingHeat, setRatingHeat] = useState("");
  const [wildestDream, setWildestDream] = useState("");
  const [picked, setPicked] = useState(null);
  const [playerAnswers, setPlayerAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [drawMessage, setDrawMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getMatchPlayState();
      setCards(payload.cards || []);
      setAnswers(payload.answers || {});
    } catch (loadError) {
      setError(loadError.message || "Could not load Match Mischief.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => uniqueCategories(cards), [cards]);

  const filters = useMemo(
    () => ({
      category,
      rating_ynm: ratingYnm,
      rating_heat: ratingHeat,
      wildest_dream: wildestDream,
    }),
    [category, ratingYnm, ratingHeat, wildestDream]
  );

  const pool = useMemo(
    () => filterCardsForPlay(cards, answers, filters),
    [cards, answers, filters]
  );

  const loadPlayerAnswers = useCallback(async (cardId) => {
    setAnswersLoading(true);
    try {
      const payload = await getMatchCardAnswers(cardId);
      setPlayerAnswers(payload.players || []);
    } catch (answersError) {
      setPlayerAnswers([]);
      setError(answersError.message || "Could not load player answers.");
    } finally {
      setAnswersLoading(false);
    }
  }, []);

  const drawCard = async () => {
    setDrawMessage("");
    setError("");
    if (pool.length === 0) {
      setPicked(null);
      setPlayerAnswers([]);
      setDrawMessage("No cards match these filters. Loosen a filter or rate more cards first.");
      return;
    }
    const next = pickRandomCard(pool, { excludeId: picked?.id });
    setPicked(next);
    setDrawMessage(pool.length === 1 ? "Only one card in this pool." : "");
    if (next?.id) {
      await loadPlayerAnswers(next.id);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Match Mischief", to: "/app/troublehub/match" },
          { label: "Try a card" },
        ]}
        title="Try a card"
        subtitle="Filter by your ratings, then draw a random card to try."
        actions={
          <>
            <button
              type="button"
              className={`button th-sfw-toggle${sfwMode ? " is-on" : ""}`}
              aria-pressed={sfwMode}
              onClick={() => {
                setSfwMode((current) => {
                  const next = !current;
                  try {
                    localStorage.setItem(SFW_STORAGE_KEY, next ? "1" : "0");
                  } catch {
                    // ignore
                  }
                  return next;
                });
              }}
            >
              SFW {sfwMode ? "On" : "Off"}
            </button>
            <Link className="button" to="/app/troublehub/match">
              Rate cards
            </Link>
            <Link className="button" to="/app/troublehub/match/compare">
              Compare
            </Link>
          </>
        }
      />

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <section className="panel">
          <p className="subtext">Loading the deck…</p>
        </section>
      ) : cards.length === 0 ? (
        <section className="panel empty-state">
          <p className="subtext">No cards yet. Import or rate cards in Match Mischief first.</p>
        </section>
      ) : (
        <>
          <section className="panel th-play-filters">
            <div className="th-play-filter-grid">
              <label>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Any</option>
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                My Yes / No / Maybe
                <select value={ratingYnm} onChange={(e) => setRatingYnm(e.target.value)}>
                  <option value="">Any</option>
                  {YNM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                My heat
                <select value={ratingHeat} onChange={(e) => setRatingHeat(e.target.value)}>
                  <option value="">Any</option>
                  {HEAT_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.icon} {level.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                My wildest dreams
                <select value={wildestDream} onChange={(e) => setWildestDream(e.target.value)}>
                  <option value="">Any</option>
                  <option value="yes">Flagged ☄️</option>
                  <option value="no">Not flagged</option>
                </select>
              </label>
            </div>

            <div className="th-play-filter-actions">
              <p className="subtext">
                {pool.length} card{pool.length === 1 ? "" : "s"} in the pool
              </p>
              <button type="button" className="button-primary" onClick={drawCard} disabled={pool.length === 0}>
                Draw a random card
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setCategory("");
                  setRatingYnm("");
                  setRatingHeat("");
                  setWildestDream("");
                  setDrawMessage("");
                }}
              >
                Clear filters
              </button>
            </div>
            {drawMessage ? <p className="subtext">{drawMessage}</p> : null}
          </section>

          {picked ? (
            <section className="panel th-play-result">
              <article className="th-play-result-card">
                <div className="th-play-result-copy">
                  {picked.category ? <p className="th-match-category">{picked.category}</p> : null}
                  {picked.idea ? <h2 className="th-match-idea">{picked.idea}</h2> : null}
                  {picked.question ? <p className="th-match-question">{picked.question}</p> : null}
                  {picked.statement ? <p className="th-match-statement">{picked.statement}</p> : null}
                  {picked.description ? (
                    <p className="th-match-description">{picked.description}</p>
                  ) : null}

                  <div className="th-play-result-actions">
                    <button type="button" className="button-primary" onClick={drawCard}>
                      Draw again
                    </button>
                    <Link className="button" to={`/app/troublehub/match?card=${picked.id}`}>
                      Open in Match Mischief
                    </Link>
                  </div>
                </div>
                <MatchCardImage card={picked} sfwBlur={sfwMode} />
              </article>

              <div className="th-play-players">
                <h3>Player answers</h3>
                {answersLoading ? (
                  <p className="subtext">Loading answers…</p>
                ) : playerAnswers.length === 0 ? (
                  <p className="subtext">No TroubleHub players found.</p>
                ) : (
                  <ul className="th-play-player-list">
                    {playerAnswers.map((player) => {
                      const view = formatAnswer(player.answer);
                      const name = player.display_name || player.username;
                      return (
                        <li
                          key={player.id}
                          className={`th-play-player-row${player.is_you ? " is-you" : ""}`}
                        >
                          <div className="th-play-player-head">
                            <strong>
                              {name}
                              {player.is_you ? " (you)" : ""}
                            </strong>
                            {!view ? <span className="stat-meta">Not answered</span> : null}
                          </div>
                          {view ? (
                            <>
                              <div className="th-play-answer-summary">
                                <span className="th-compare-pill" title="Yes / No / Maybe">
                                  {view.ynm}
                                </span>
                                <span className="th-compare-pill" title="Heat">
                                  {view.heatLabel}
                                </span>
                                <span className="th-compare-pill" title="Wildest dreams">
                                  {view.wildest ? "☄️ Wildest dream" : "Not wildest"}
                                </span>
                              </div>
                              {view.notes ? (
                                <div className="th-play-notes">
                                  <strong>Note</strong>
                                  <p>{view.notes}</p>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          ) : (
            <section className="panel empty-state">
              <p className="subtext">Set filters (optional), then draw a card to try.</p>
            </section>
          )}
        </>
      )}
    </>
  );
}

export default MatchRandomPlayPage;
