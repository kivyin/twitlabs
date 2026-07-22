import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Clock3, LayoutList, Pencil, Star } from "lucide-react";
import { getNavigation, groupNavigationItems } from "../api/navigationApi";
import { useAuth } from "../context/AuthContext";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useFavorites } from "../context/FavoritesContext";
import { useBranding } from "../context/BrandingContext";
import { useTheme } from "../context/ThemeContext";
import { locationToPath } from "../utils/browseStack";
import { getNavIcon, navIcons } from "../utils/navIcons";
import { getLcarsLinkStyle, getLcarsNavPalette, LCARS_DOCS_PALETTE, LCARS_HOME_PALETTE } from "../utils/lcarsNavColors";
import { renderFavoriteIcon } from "../utils/favoriteIcons";
import {
  buildSidebarHistoryEntries,
  getSidebarHistoryLabel,
} from "../utils/sidebarHistory";
import { AppBrandText, BrandMark } from "./AppBrand";
import BrandSettingsModal from "./BrandSettingsModal";
import FavoriteEditModal from "./favorites/FavoriteEditModal";
import ThemeToggle from "./ThemeToggle";

const SIDEBAR_TABS = [
  { id: "nav", label: "Nav", Icon: LayoutList },
  { id: "favorites", label: "Favorites", Icon: Star },
  { id: "history", label: "History", Icon: Clock3 },
];

function FavoriteIcon({ favorite, size = 16 }) {
  if (favorite.custom_icon_data) {
    return <img src={favorite.custom_icon_data} alt="" className="sidebar-favorite-icon-img" />;
  }
  return renderFavoriteIcon(favorite.icon, { size, strokeWidth: 2, "aria-hidden": "true" });
}

function Icon({ path, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

function PinIcon({ filled = false }) {
  return (
    <Icon
      path={
        filled ? (
          <>
            <path d="M12 17v5" />
            <path d="M9 3h6l1 7h4l-3 7H7L4 10h4z" />
          </>
        ) : (
          <>
            <path d="M12 17v5" />
            <path d="M9 3h6l1 7h4l-3 7H7L4 10h4z" />
            <path d="M9 3 7.5 10" />
          </>
        )
      }
      size={16}
    />
  );
}

function ChevronIcon({ expanded, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`sidebar-group-chevron${expanded ? " expanded" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SidebarNavGroup({
  main,
  children,
  navItemClass,
  subItemClass,
  onNavigate,
  sidebarExpanded,
  compact,
  groupExpanded,
  onToggleGroup,
  forceExpanded = false,
  lcarsPalette = null,
  isLcars = false,
}) {
  const childItems = children ?? [];
  const hasChildren = childItems.length > 0;
  const expanded = forceExpanded || groupExpanded;
  const showChildren = (sidebarExpanded || forceExpanded) && hasChildren && expanded;

  return (
    <div className="sidebar-group">
      <div className={`sidebar-group-row${hasChildren ? "" : " sidebar-group-row-leaf"}`}>
        {hasChildren && !compact && !forceExpanded ? (
          <button
            type="button"
            className="sidebar-group-toggle"
            aria-label={groupExpanded ? `Collapse ${main.label}` : `Expand ${main.label}`}
            aria-expanded={groupExpanded}
            title={groupExpanded ? "Collapse" : "Expand"}
            onClick={onToggleGroup}
          >
            <ChevronIcon expanded={groupExpanded} />
          </button>
        ) : !compact && !forceExpanded ? (
          <span className="sidebar-group-toggle sidebar-group-toggle-placeholder" aria-hidden="true" />
        ) : null}

        <NavLink
          to={main.path}
          end={hasChildren}
          className={navItemClass}
          onClick={onNavigate}
          title={compact ? main.label : undefined}
          aria-label={compact ? main.label : undefined}
          style={isLcars && lcarsPalette ? getLcarsLinkStyle(lcarsPalette, 0) : undefined}
        >
          <Icon path={getNavIcon(main.icon, main.nav_section === "admin" ? "applications" : "app")} />
          <span className="sidebar-label">{main.label}</span>
        </NavLink>
      </div>

      {showChildren &&
        childItems.map((child, childIndex) => (
          <NavLink
            key={child.id}
            to={child.path}
            className={subItemClass}
            onClick={onNavigate}
            title={compact ? child.label : undefined}
            aria-label={compact ? child.label : undefined}
            style={
              isLcars && lcarsPalette
                ? getLcarsLinkStyle(lcarsPalette, childIndex + 1)
                : undefined
            }
          >
            <Icon path={getNavIcon(child.icon, "tables")} size={16} />
            <span className="sidebar-label">{child.label}</span>
          </NavLink>
        ))}
    </div>
  );
}

function Sidebar({
  onNavigate,
  onSignOut,
  isPinned,
  isCollapsed,
  isExpanded,
  activeTab = "nav",
  onActiveTabChange,
  onTogglePinned,
  onToggleCollapsed,
  isNavGroupCollapsed,
  toggleNavGroup,
  expandNavGroup,
}) {
  const { user, isAdmin } = useAuth();
  const { favorites, deleteFavorite, updateFavorite } = useFavorites();
  const { stack, clearStack } = useBrowseStack();
  const { fullTitle } = useBranding();
  const { resolvedTheme } = useTheme();
  const isLcars = resolvedTheme === "lcars";
  const location = useLocation();
  const [navItems, setNavItems] = useState([]);
  const [brandSettingsOpen, setBrandSettingsOpen] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);

  useEffect(() => {
    let active = true;

    getNavigation()
      .then((items) => {
        if (active) setNavItems(items);
      })
      .catch(() => {
        if (active) setNavItems([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const { appMains, adminMains, childrenByParent } = useMemo(
    () => groupNavigationItems(navItems),
    [navItems]
  );

  const currentPath = locationToPath(location);
  const historyPaths = useMemo(
    () => buildSidebarHistoryEntries(stack, currentPath),
    [stack, currentPath]
  );

  const displayName = user?.display_name || user?.username || "";
  const initial = displayName.charAt(0) || "?";
  const compact = isCollapsed;

  useEffect(() => {
    if (activeTab !== "nav") {
      return;
    }

    for (const main of [...appMains, ...adminMains]) {
      const childItems = childrenByParent.get(main.id) ?? [];
      if (childItems.length === 0) {
        continue;
      }

      const isActiveGroup =
        location.pathname === main.path ||
        childItems.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`)
        );

      if (isActiveGroup) {
        expandNavGroup(main.id);
      }
    }
  }, [activeTab, location.pathname, appMains, adminMains, childrenByParent, expandNavGroup]);

  const navItemClass = ({ isActive }) => `sidebar-link${isActive ? " active" : ""}`;
  const subItemClass = ({ isActive }) =>
    `sidebar-link sidebar-sublink${isActive ? " active" : ""}`;

  const sidebarClassName = [
    "sidebar",
    compact && !isLcars ? "sidebar-compact" : "",
    isLcars ? "sidebar-lcars" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
    <aside className={sidebarClassName}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" onClick={onNavigate} title={fullTitle}>
          <BrandMark />
          <AppBrandText compact={compact} />
        </Link>

        <div className="sidebar-controls">
          <button
            type="button"
            className={`sidebar-control${isPinned ? " active" : ""}`}
            aria-label={isPinned ? "Unpin sidebar open" : "Pin sidebar open"}
            aria-pressed={isPinned}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
            onClick={onTogglePinned}
          >
            <PinIcon filled={isPinned} />
          </button>
          <button
            type="button"
            className="sidebar-control"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={
              isPinned ? "Unpin and collapse" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onClick={onToggleCollapsed}
          >
            <Icon
              path={
                isCollapsed ? (
                  <>
                    <path d="M9 18 15 12 9 6" />
                    <path d="M15 12H3" />
                  </>
                ) : (
                  <>
                    <path d="M15 18 9 12 15 6" />
                    <path d="M9 12h12" />
                  </>
                )
              }
              size={16}
            />
          </button>
          <ThemeToggle className="sidebar-control theme-toggle-sidebar" compactLabel />
        </div>
      </div>

      <div
        className="sidebar-mode-tabs"
        role="tablist"
        aria-label="Sidebar panels"
      >
        {SIDEBAR_TABS.map(({ id, label, Icon: TabIcon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`sidebar-tab-${id}`}
              aria-selected={selected}
              aria-controls={`sidebar-panel-${id}`}
              className={`sidebar-mode-tab${selected ? " active" : ""}`}
              title={label}
              onClick={() => onActiveTabChange?.(id)}
            >
              <TabIcon size={compact ? 16 : 14} aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </button>
          );
        })}
      </div>

      <nav
        className="sidebar-nav"
        aria-label={
          activeTab === "favorites"
            ? "Favorites"
            : activeTab === "history"
              ? "History"
              : "Primary"
        }
        id={`sidebar-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`sidebar-tab-${activeTab}`}
      >
        {activeTab === "nav" && (
          <>
            {isLcars ? (
              <div className="lcars-menu-cap" aria-hidden="true">
                <span className="lcars-menu-cap-end" />
                <span className="lcars-menu-cap-label">Menu</span>
                <span className="lcars-menu-cap-end" />
              </div>
            ) : (
              <p className="sidebar-section">Workspaces</p>
            )}
            <NavLink
              to="/"
              end
              className={navItemClass}
              onClick={onNavigate}
              title={compact ? "Home" : undefined}
              aria-label={compact ? "Home" : undefined}
              style={isLcars ? getLcarsLinkStyle(LCARS_HOME_PALETTE, 0) : undefined}
            >
              <Icon path={navIcons.home} />
              <span className="sidebar-label">Home</span>
            </NavLink>
            <NavLink
              to="/docs"
              className={navItemClass}
              onClick={onNavigate}
              title={compact ? "Documentation" : undefined}
              aria-label={compact ? "Documentation" : undefined}
              style={isLcars ? getLcarsLinkStyle(LCARS_DOCS_PALETTE, 0) : undefined}
            >
              <Icon
                path={
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.7.6-1.2 1.1-1.2 2.2v.5" />
                    <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
                  </>
                }
              />
              <span className="sidebar-label">Documentation</span>
            </NavLink>

            {appMains.length > 0 && (
              <>
                <p className="sidebar-section">Applications</p>
                {appMains.map((main, index) => (
                  <SidebarNavGroup
                    key={main.id}
                    main={main}
                    children={childrenByParent.get(main.id)}
                    navItemClass={navItemClass}
                    subItemClass={subItemClass}
                    onNavigate={onNavigate}
                    sidebarExpanded={isExpanded}
                    compact={compact}
                    groupExpanded={!isNavGroupCollapsed(main.id)}
                    onToggleGroup={() => toggleNavGroup(main.id)}
                    forceExpanded={isLcars}
                    isLcars={isLcars}
                    lcarsPalette={isLcars ? getLcarsNavPalette(index) : null}
                  />
                ))}
              </>
            )}

            {isAdmin && adminMains.length > 0 && (
              <>
                <p className="sidebar-section">Administration</p>
                {adminMains.map((main, index) => (
                  <SidebarNavGroup
                    key={main.id}
                    main={main}
                    children={childrenByParent.get(main.id)}
                    navItemClass={navItemClass}
                    subItemClass={subItemClass}
                    onNavigate={onNavigate}
                    sidebarExpanded={isExpanded}
                    compact={compact}
                    groupExpanded={!isNavGroupCollapsed(main.id)}
                    onToggleGroup={() => toggleNavGroup(main.id)}
                    forceExpanded={isLcars}
                    isLcars={isLcars}
                    lcarsPalette={isLcars ? getLcarsNavPalette(appMains.length + index) : null}
                  />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === "favorites" && (
          <>
            {favorites.length === 0 ? (
              <p className="sidebar-empty">
                {compact ? "No favorites yet." : "Star a page from its header to pin it here."}
              </p>
            ) : (
              favorites.map((favorite) => (
                <div key={favorite.id} className="sidebar-favorite-row">
                  <NavLink
                    to={favorite.path}
                    className={navItemClass}
                    onClick={onNavigate}
                    title={compact ? favorite.label : undefined}
                    aria-label={compact ? favorite.label : undefined}
                    style={favorite.color ? { "--favorite-color": favorite.color } : undefined}
                  >
                    <span
                      className="sidebar-favorite-icon"
                      style={{ color: favorite.color || undefined }}
                    >
                      <FavoriteIcon favorite={favorite} />
                    </span>
                    <span className="sidebar-label">{favorite.label}</span>
                  </NavLink>
                  {!compact && (
                    <div className="sidebar-favorite-actions">
                      <button
                        type="button"
                        className="sidebar-favorite-edit"
                        aria-label={`Edit ${favorite.label}`}
                        title="Edit favorite"
                        onClick={() => setEditingFavorite(favorite)}
                      >
                        <Pencil size={12} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="sidebar-favorite-remove"
                        aria-label={`Remove ${favorite.label} from favorites`}
                        title="Remove favorite"
                        onClick={() => deleteFavorite(favorite.id)}
                      >
                        <Icon path={<path d="M18 6 6 18M6 6l12 12" />} size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {historyPaths.length === 0 ? (
              <p className="sidebar-empty">
                {compact ? "No history yet." : "Pages you visit will show up here for quick return."}
              </p>
            ) : (
              <>
                {!compact && (
                  <div className="sidebar-history-toolbar">
                    <p className="sidebar-section sidebar-history-heading">Recent</p>
                    <button
                      type="button"
                      className="sidebar-history-clear"
                      onClick={clearStack}
                    >
                      Clear
                    </button>
                  </div>
                )}
                {historyPaths.map((path) => {
                  const label = getSidebarHistoryLabel(path, { favorites, navItems });
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      className={navItemClass}
                      onClick={onNavigate}
                      title={compact ? label : path}
                      aria-label={compact ? label : undefined}
                    >
                      <Clock3 size={16} aria-hidden="true" />
                      <span className="sidebar-label">{label}</span>
                    </NavLink>
                  );
                })}
              </>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-foot">
        <span className="sidebar-user" title={compact ? displayName : undefined}>
          <span className="nav-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="sidebar-user-name sidebar-label">{displayName}</span>
        </span>
        <button
          type="button"
          className="brand-settings-button"
          onClick={() => setBrandSettingsOpen(true)}
          title={compact ? "Branding" : undefined}
          aria-label={compact ? "Branding" : undefined}
        >
          <Icon
            path={
              <>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </>
            }
            size={16}
          />
          <span className="sidebar-label">Branding</span>
        </button>
        <button
          type="button"
          className="signout-button"
          onClick={onSignOut}
          title={compact ? "Sign out" : undefined}
          aria-label={compact ? "Sign out" : undefined}
        >
          <Icon path={<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />} size={16} />
          <span className="sidebar-label">Sign out</span>
        </button>
      </div>
    </aside>

    <BrandSettingsModal open={brandSettingsOpen} onClose={() => setBrandSettingsOpen(false)} />
    <FavoriteEditModal
      key={editingFavorite?.id ?? "closed"}
      open={Boolean(editingFavorite)}
      favorite={editingFavorite}
      onClose={() => setEditingFavorite(null)}
      onSave={updateFavorite}
    />
    </>
  );
}

export default Sidebar;
