import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

function TroubleHubHomePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "TroubleHub" }]}
        title="TroubleHub"
        subtitle="A locked vault of private games. Enter only if you were invited."
      />

      <section className="panel th-vault-intro">
        <p className="subtext">
          TroubleHub stays invisible to system admins unless they elevate for this session, and
          players only enter with an explicit grant.
        </p>
        <div className="grid th-subapp-grid">
          <Link className="card th-subapp-card" to="/app/troublehub/match">
            <span className="card-icon" aria-hidden="true">
              🔥
            </span>
            <h2>Match Mischief</h2>
            <p>Rate cards together — Yes/No/Maybe, heat levels, wildest dreams, and notes.</p>
          </Link>
          <Link className="card th-subapp-card" to="/app/troublehub/match/play">
            <span className="card-icon" aria-hidden="true">
              🎲
            </span>
            <h2>Try a card</h2>
            <p>Filter by your ratings, then draw a random card to try.</p>
          </Link>
          <Link className="card th-subapp-card" to="/app/troublehub/match/compare">
            <span className="card-icon" aria-hidden="true">
              💞
            </span>
            <h2>Compare</h2>
            <p>See Yes/No/Maybe + heat alignment; filter wildest dreams for fantasies to try.</p>
          </Link>
          <Link className="card th-subapp-card" to="/app/troublehub/fantasies">
            <span className="card-icon" aria-hidden="true">
              ✨
            </span>
            <h2>Fantasies</h2>
            <p>Live two-player picker — Male/Female cards, Romantic / Naughty / Kinky, notes included.</p>
          </Link>
        </div>
      </section>
    </>
  );
}

export default TroubleHubHomePage;
