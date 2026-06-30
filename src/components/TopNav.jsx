import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function TopNav() {
  const { user, logout, isAdmin, canAccessApp } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="top-nav">
      <Link to="/">TwitApps Home</Link>
      {canAccessApp("budget") && <Link to="/app/budget">Budget</Link>}
      {isAdmin && <Link to="/admin">Admin</Link>}
      <div style={{ marginLeft: "auto", display: "flex", gap: "0.55rem", alignItems: "center" }}>
        {user && (
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--muted-text)",
              padding: "0.45rem 0.5rem",
            }}
          >
            {user.display_name || user.username}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            border: "1px solid transparent",
            borderRadius: "10px",
            padding: "0.45rem 0.7rem",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
            transition: "background-color 120ms ease, border-color 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fee2e2";
            e.currentTarget.style.borderColor = "#fca5a5";
            e.currentTarget.style.color = "#991b1b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.color = "var(--text)";
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}

export default TopNav;
