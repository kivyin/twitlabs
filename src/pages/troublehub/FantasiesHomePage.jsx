import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

function FantasiesHomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleJoin = (event) => {
    event.preventDefault();
    const nextCode = code.trim().toUpperCase();
    if (nextCode.length < 4) {
      setJoinError("Enter a session code to join.");
      return;
    }
    setJoinError("");
    navigate(`/app/troublehub/fantasies/join?code=${encodeURIComponent(nextCode)}`);
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "TroubleHub", to: "/app/troublehub" },
          { label: "Fantasies" },
        ]}
        title="Fantasies"
        subtitle="A two-player fantasy challenge. Start a session, join with a code, or manage the deck."
      />

      <div className="th-fantasy-game-page">
        <section className="th-fantasy-game-landing">
          <Link to="/app/troublehub/fantasies/start" className="th-fantasy-game-landing-tile">
            Start Game
          </Link>

          <form className="th-fantasy-game-landing-tile is-join" onSubmit={handleJoin}>
            <input
              className="th-fantasy-game-landing-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (joinError) setJoinError("");
              }}
              placeholder="code"
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Session code"
            />
            <button type="submit" className="th-fantasy-game-landing-join">
              Join Game
            </button>
            {joinError ? <p className="th-fantasy-game-landing-error">{joinError}</p> : null}
          </form>

          <Link to="/app/troublehub/fantasies/deck" className="th-fantasy-game-landing-tile">
            View all cards
          </Link>
        </section>
      </div>
    </>
  );
}

export default FantasiesHomePage;
