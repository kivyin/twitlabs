import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useTheme } from "../context/ThemeContext";
import { useSidebarPreferences } from "../hooks/useSidebarPreferences";
import { AppBrandText, BrandMark } from "./AppBrand";
import { LcarsFootBand, LcarsFrameBrand } from "./LcarsShellChrome";
import Sidebar from "./Sidebar";

function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebarPreferences();
  const { fullTitle } = useBranding();
  const { resolvedTheme } = useTheme();
  const isLcars = resolvedTheme === "lcars";

  const closeMenu = () => setMenuOpen(false);

  const handleNavigate = () => {
    closeMenu();
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const shellClassName = [
    "shell",
    menuOpen ? "shell-menu-open" : "",
    sidebar.isPinned ? "shell-sidebar-pinned" : "shell-sidebar-unpinned",
    sidebar.isCollapsed ? "shell-sidebar-collapsed" : "shell-sidebar-expanded",
    isLcars ? "shell-lcars" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sidebarProps = {
    onNavigate: handleNavigate,
    onSignOut: handleSignOut,
    isPinned: sidebar.isPinned,
    isCollapsed: sidebar.isCollapsed,
    isExpanded: sidebar.isExpanded,
    activeTab: sidebar.activeTab,
    onActiveTabChange: sidebar.setActiveTab,
    onTogglePinned: sidebar.togglePinned,
    onToggleCollapsed: sidebar.toggleCollapsed,
    isNavGroupCollapsed: sidebar.isNavGroupCollapsed,
    toggleNavGroup: sidebar.toggleNavGroup,
    expandNavGroup: sidebar.expandNavGroup,
  };

  if (isLcars) {
    return (
      <div className={shellClassName}>
        <div className="lcars-viewport">
          <div className="lcars-tan-frame">
            <LcarsFrameBrand title={fullTitle} />

            <div className="sidebar-rail">
              <Sidebar {...sidebarProps} />
            </div>

            {menuOpen && <div className="shell-scrim" onClick={closeMenu} aria-hidden="true" />}

            <div className="shell-body">
              <header className="mobile-bar">
                <button
                  type="button"
                  className="menu-toggle"
                  aria-label="Open navigation menu"
                  onClick={() => setMenuOpen(true)}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Link to="/" className="brand" title={fullTitle}>
                  <BrandMark size={16} />
                  <AppBrandText showShip={false} />
                </Link>
              </header>

              <main className="shell-main" key={location.pathname}>
                <div className="shell-inner">{children}</div>
              </main>

              <LcarsFootBand />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className="sidebar-rail">
        <Sidebar {...sidebarProps} />
      </div>

      {menuOpen && <div className="shell-scrim" onClick={closeMenu} aria-hidden="true" />}

      <div className="shell-body">
        <header className="mobile-bar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="brand" title={fullTitle}>
            <BrandMark size={16} />
            <AppBrandText showShip={false} />
          </Link>
        </header>

        <main className="shell-main" key={location.pathname}>
          <div className="shell-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
