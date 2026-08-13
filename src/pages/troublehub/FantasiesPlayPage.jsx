import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FANTASY_CATEGORIES,
  chooseFantasyCard,
  clearFantasySessionRef,
  getFantasiesState,
  lockFantasyPicks,
  readFantasySessionRef,
  startFantasySession,
  toggleFantasyPick,
  unlockFantasyPicks,
  writeFantasySessionRef,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import { fantasyAvatarById } from "./fantasyAvatars";

const POLL_MS = 2500;

function categoryLabel(value) {
  return FANTASY_CATEGORIES.find((entry) => entry.value === value)?.label || value;
}

function FantasiesPlayPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const applyState = useCallback((payload) => {
    setState(payload);
    if (payload?.session) writeFantasySessionRef(payload.session);
  }, []);

  const loadSession = useCallback(
    async ({ quiet = false } = {}) => {
      const ref = readFantasySessionRef();
      if (!ref) {
        setState(null);
        if (!quiet) setLoading(false);
        return null;
      }
      if (!quiet) setLoading(true);
      try {
        const payload = await getFantasiesState(ref);
        applyState(payload);
        if (!quiet) setError("");
        return payload;
      } catch (loadError) {
        clearFantasySessionRef();
        setState(null);
        if (!quiet) setError(loadError.message || "Session expired or unavailable.");
        return null;
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [applyState]
  );

  useEffect(() => {
    const ref = readFantasySessionRef();
    if (!ref) {
      navigate("/app/troublehub/fantasies", { replace: true });
      return;
    }
    loadSession();
  }, [loadSession, navigate]);

  useEffect(() => {
    if (!state?.session) return undefined;
    const timer = window.setInterval(() => {
      loadSession({ quiet: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [state?.session?.id, loadSession]);

  const myPickSet = useMemo(() => new Set(state?.my_pick_ids || []), [state]);
  const categoryOrder = useMemo(
    () => Object.fromEntries(FANTASY_CATEGORIES.map((entry, index) => [entry.value, index])),
    []
  );

  const requiredPicks =
    state?.required_picks ?? state?.min_picks ?? state?.session?.required_picks ?? 12;

  const sortedCards = useMemo(() => {
    return (state?.cards || [])
      .slice()
      .sort((a, b) => {
        const catDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
        if (catDiff !== 0) return catDiff;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  }, [state?.cards, categoryOrder]);

  const runAction = async (fn, successMessage = "") => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const payload = await fn();
      if (payload?.session) applyState(payload);
      else await loadSession({ quiet: true });
      if (successMessage) setStatus(successMessage);
    } catch (actionError) {
      setError(actionError.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    clearFantasySessionRef();
    navigate("/app/troublehub/fantasies");
  };

  const handleTogglePick = (card) => {
    const selected = myPickSet.has(card.id);
    if (!selected && (state?.my_pick_count || 0) >= requiredPicks) return;
    return runAction(() => toggleFantasyPick(card.id));
  };

  const session = state?.session;
  const phase = session?.phase || "lobby";
  const you = state?.you;
  const myAudience = state?.my_audience;
  const myMission = state?.my_mission;
  const round = state?.round;
  const players = session?.players || [];
  const bothSeated = players.length >= 2 && !session?.waiting_for_partner;

  const showMission = Boolean(myMission) && phase === "mission";

  const myOptions = useMemo(() => {
    if (!round || !myAudience) return [];
    const options =
      myAudience === "male" ? round.male_options || [] : round.female_options || [];
    return options
      .slice()
      .sort(
        (a, b) => (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
      );
  }, [round, myAudience, categoryOrder]);

  const renderPhase = () => {
    if (loading && !state) {
      return (
        <section className="panel">
          <p className="subtext">Loading session…</p>
        </section>
      );
    }

    if (!session) {
      return (
        <section className="panel">
          <p className="subtext">No active session.</p>
          <Link to="/app/troublehub/fantasies" className="button-primary">
            Back to Fantasies
          </Link>
        </section>
      );
    }

    if (showMission) {
      return (
        <section className="panel th-fantasy-game-mission">
          <p className="th-fantasy-game-mission-kicker">Your Mission is</p>
          <div
            className={`th-fantasy-game-mission-hero${
              myMission.audience === "male"
                ? " is-male"
                : myMission.audience === "female"
                  ? " is-female"
                  : ""
            }`}
          >
            <span className={`th-fantasy-pill is-${myMission.category}`}>
              {categoryLabel(myMission.category)}
            </span>
            <h2>{myMission.title}</h2>
            {myMission.description ? <p>{myMission.description}</p> : null}
          </div>
          <p className="th-fantasy-game-mission-footer">
            You have two weeks to complete that task. First person to complete this task wins. Good
            Luck!
          </p>
        </section>
      );
    }

    if (phase === "choosing") {
      const alreadyChose =
        (myAudience === "male" && round?.male_choice) ||
        (myAudience === "female" && round?.female_choice);
      return (
        <section className="panel th-fantasy-game-choosing">
          <h2>Pick one</h2>
          <p className="subtext">
            Choose one of your two cards. That card is assigned to your partner as their mission —
            you will not see it.
          </p>
          {alreadyChose ? (
            <p className="status">Choice saved. Waiting for your partner…</p>
          ) : (
            <div className="th-fantasy-options">
              {myOptions.map((card) => (
                <article
                  key={card.id}
                  className={`th-fantasy-option${
                    card.audience === "male"
                      ? " is-male"
                      : card.audience === "female"
                        ? " is-female"
                        : ""
                  }`}
                >
                  <div className="th-fantasy-card-meta">
                    <span className={`th-fantasy-pill is-${card.category}`}>
                      {categoryLabel(card.category)}
                    </span>
                  </div>
                  <strong>{card.title}</strong>
                  {card.description ? <p>{card.description}</p> : null}
                  <button
                    type="button"
                    className="button-primary"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        () =>
                          chooseFantasyCard({
                            audience: myAudience,
                            cardId: card.id,
                          }),
                        "Choice saved."
                      )
                    }
                  >
                    Choose this
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (phase === "picking") {
      const pickCount = state?.my_pick_count || 0;
      const atCap = pickCount >= requiredPicks;
      const partner = state?.partner;
      const partnerStatus = partner?.locked
        ? "Ready"
        : `Picked ${partner?.pick_count ?? 0}`;
      return (
        <section className="panel th-fantasy-setup th-fantasy-game-picking">
          <div className="th-fantasy-game-pick-header">
            <div className="th-fantasy-game-pick-header-main">
              <h2>Pick any {requiredPicks} cards.</h2>
              <div className="th-fantasy-game-pick-stats">
                <span className="th-fantasy-game-pick-count">
                  Selected <strong>{pickCount}</strong> / {requiredPicks}
                  {state?.my_locked ? " · Ready" : ""}
                </span>
                <span className="th-fantasy-game-partner-status">
                  {partner
                    ? `${partner.display_name || "Partner"}: ${partnerStatus}`
                    : "Waiting for partner…"}
                </span>
              </div>
            </div>
            <div className="th-fantasy-setup-actions">
              {state?.my_locked ? (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => runAction(() => unlockFantasyPicks(), "Picks unlocked.")}
                >
                  Unlock
                </button>
              ) : (
                <button
                  type="button"
                  className="button-primary"
                  disabled={busy || pickCount !== requiredPicks}
                  onClick={() => runAction(() => lockFantasyPicks(), "Picks locked.")}
                >
                  Lock
                </button>
              )}
            </div>
          </div>

          <ul className="th-fantasy-card-list">
            {sortedCards.map((card) => {
              const selected = myPickSet.has(card.id);
              const audienceClass =
                card.audience === "male"
                  ? " is-male"
                  : card.audience === "female"
                    ? " is-female"
                    : "";
              const disabled =
                busy || state?.my_locked || (!selected && atCap);
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    className={`th-fantasy-card${audienceClass}${selected ? " is-selected" : ""}${
                      state?.my_locked ? " is-locked" : ""
                    }`}
                    disabled={disabled}
                    onClick={() => handleTogglePick(card)}
                  >
                    <div className="th-fantasy-card-meta">
                      <span className={`th-fantasy-pill is-${card.category}`}>
                        {categoryLabel(card.category)}
                      </span>
                    </div>
                    <strong>{card.title}</strong>
                    {card.description ? <p>{card.description}</p> : null}
                    <span className="stat-meta">
                      {selected ? "Selected" : atCap ? "Pick limit reached" : "Tap to select"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    return (
      <section className="panel th-fantasy-game-lobby">
        <div className="th-fantasy-game-lobby-head">
          <div>
            <h2>Lobby</h2>
            <p className="th-fantasy-code" aria-label="Session code">
              {session.code}
            </p>
            <p className="subtext">Share this code with your partner.</p>
          </div>
          <div className="th-fantasy-game-lobby-actions">
            {you?.is_host ? (
              <button
                type="button"
                className="button-primary"
                disabled={busy || !bothSeated}
                onClick={() => runAction(() => startFantasySession(), "Game started.")}
              >
                Start game
              </button>
            ) : (
              <p className="subtext">Waiting for host to start…</p>
            )}
            <button type="button" className="button" onClick={handleLeave}>
              Leave
            </button>
          </div>
        </div>

        <ul className="th-fantasy-game-player-list">
          {["male", "female"].map((role) => {
            const player = players.find((entry) => entry.role === role);
            const avatar = fantasyAvatarById(player?.avatar);
            return (
              <li
                key={role}
                className={`th-fantasy-game-player-chip is-${role}${
                  player ? " is-seated" : " is-empty"
                }`}
              >
                <span className="th-fantasy-game-player-avatar" aria-hidden="true">
                  {avatar?.emoji || "?"}
                </span>
                <div>
                  <strong>
                    {player?.display_name || (role === "male" ? "Male seat" : "Female seat")}
                  </strong>
                  <span className="subtext">
                    {role === "male" ? "Male" : "Female"}
                    {player?.is_host ? " · Host" : ""}
                    {!player ? " · waiting" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Fantasies", to: "/app/troublehub/fantasies" },
          { label: "Play" },
        ]}
        title="Fantasies"
        subtitle={session ? `Session ${session.code} · ${phase}` : "Live session"}
        actions={
          session && phase !== "lobby" ? (
            <button type="button" className="button" onClick={handleLeave}>
              Leave
            </button>
          ) : null
        }
      />

      <div className="th-fantasy-game-page">
      {error ? <p className="error">{error}</p> : null}
      {status ? <p className="status">{status}</p> : null}

      {renderPhase()}
      </div>
    </>
  );
}

export default FantasiesPlayPage;
