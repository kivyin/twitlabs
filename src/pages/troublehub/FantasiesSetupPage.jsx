import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  FANTASY_AUDIENCES,
  createFantasySession,
  joinFantasySession,
  writeFantasySessionRef,
} from "../../api/troublehubApi";
import PageHeader from "../../components/PageHeader";
import { FANTASY_AVATARS } from "./fantasyAvatars";

function FantasiesSetupPage({ mode: modeProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = useMemo(() => {
    if (modeProp === "start" || modeProp === "join") return modeProp;
    return location.pathname.includes("/join") ? "join" : "start";
  }, [location.pathname, modeProp]);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState(mode === "join" ? "female" : "male");
  const [avatar, setAvatar] = useState(FANTASY_AVATARS[0].id);
  const [code, setCode] = useState(() =>
    String(searchParams.get("code") || "")
      .trim()
      .toUpperCase()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const title = mode === "join" ? "Join game" : "Start game";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Enter a display name.");
      return;
    }
    if (role !== "male" && role !== "female") {
      setError("Pick Male or Female.");
      return;
    }
    if (!avatar) {
      setError("Pick an avatar.");
      return;
    }
    if (mode === "join" && code.trim().length < 4) {
      setError("Enter a valid session code.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload =
        mode === "join"
          ? await joinFantasySession({
              code: code.trim().toUpperCase(),
              role,
              displayName: name,
              avatar,
            })
          : await createFantasySession({
              role,
              displayName: name,
              avatar,
            });
      if (payload?.session) writeFantasySessionRef(payload.session);
      navigate("/app/troublehub/fantasies/play");
    } catch (submitError) {
      setError(submitError.message || "Could not start session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Fantasies", to: "/app/troublehub/fantasies" },
          { label: title },
        ]}
        title={title}
        subtitle={
          mode === "join"
            ? "Enter the session code, pick your name, role, and avatar."
            : "Pick your name, role, and avatar to create a session code."
        }
        actions={
          <Link to="/app/troublehub/fantasies" className="button">
            Back
          </Link>
        }
      />

      <div className="th-fantasy-game-page">
      {error ? <p className="error">{error}</p> : null}

      <section className="panel th-fantasy-game-setup">
        <form className="form th-fantasy-game-setup-form" onSubmit={handleSubmit}>
          {mode === "join" ? (
            <label>
              Session code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={12}
                autoCapitalize="characters"
                disabled={busy}
                required
              />
            </label>
          ) : null}

          <label>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={40}
              disabled={busy}
              required
            />
          </label>

          <fieldset className="th-fantasy-game-role">
            <legend>Role</legend>
            <div className="th-fantasy-game-role-options">
              {FANTASY_AUDIENCES.map((entry) => (
                <label key={entry.value} className={`th-fantasy-game-role-option is-${entry.value}`}>
                  <input
                    type="radio"
                    name="fantasy-role"
                    value={entry.value}
                    checked={role === entry.value}
                    onChange={() => setRole(entry.value)}
                    disabled={busy}
                  />
                  <span>{entry.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="th-fantasy-game-avatars">
            <legend>Avatar</legend>
            <div className="th-fantasy-game-avatar-grid">
              {FANTASY_AVATARS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`th-fantasy-game-avatar${avatar === entry.id ? " is-selected" : ""}`}
                  onClick={() => setAvatar(entry.id)}
                  disabled={busy}
                  title={entry.label}
                  aria-pressed={avatar === entry.id}
                >
                  <span aria-hidden="true">{entry.emoji}</span>
                  <span className="th-fantasy-game-avatar-label">{entry.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="th-fantasy-game-setup-actions">
            <button type="submit" className="button-primary" disabled={busy}>
              {busy ? "Working…" : mode === "join" ? "Join game" : "Create session"}
            </button>
          </div>
        </form>
      </section>
      </div>
    </>
  );
}

export default FantasiesSetupPage;
