import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Clock3, LayoutList, ListOrdered, Pencil, Star } from "lucide-react";
import { getNavigation, groupNavigationItems } from "../api/navigationApi";
import { useAuth } from "../context/AuthContext";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useFavorites } from "../context/FavoritesContext";
import { useBranding } from "../context/BrandingContext";
import { useTheme } from "../context/ThemeContext";
import { useNavLayoutPreferences } from "../hooks/useNavLayoutPreferences";
import { locationToPath } from "../utils/browseStack";
import { getNavIcon, navIcons } from "../utils/navIcons";
import {
  getLcarsGroupStyle,
  getLcarsLinkStyle,
  getLcarsNavPalette,
  LCARS_DOCS_PALETTE,
  LCARS_HOME_PALETTE,
} from "../utils/lcarsNavColors";
import { subscribeLcarsPulse } from "../utils/lcarsPulseClock";
import { applyNavLayout, getNavLayoutCatalog } from "../utils/navLayout";
import { renderFavoriteIcon } from "../utils/favoriteIcons";
import {
  buildSidebarHistoryEntries,
  getSidebarHistoryLabel,
} from "../utils/sidebarHistory";
import { AppBrandText, BrandMark } from "./AppBrand";
import BrandSettingsModal from "./BrandSettingsModal";
import ColumnPickerModal from "./ColumnPickerModal";
import FavoriteEditModal from "./favorites/FavoriteEditModal";

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
  actionItems = [],
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
  const hasChildren = childItems.length > 0 || actionItems.length > 0;
  const expanded = forceExpanded || groupExpanded;
  // LCARS keeps a fixed-width rail, so children stay available when the group is open.
  const showChildren = hasChildren && expanded && (sidebarExpanded || isLcars || forceExpanded);
  const showToggle = hasChildren && !compact && !forceExpanded;

  return (
    <div
      className="sidebar-group"
      style={isLcars && lcarsPalette ? getLcarsGroupStyle(lcarsPalette) : undefined}
    >
      <div className={`sidebar-group-row${hasChildren ? "" : " sidebar-group-row-leaf"}`}>
        {showToggle ? (
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

      {showChildren &&
        actionItems.map((action, actionIndex) => (
          <button
            key={action.id}
            type="button"
            className="sidebar-link sidebar-sublink sidebar-action-link"
            onClick={() => {
              action.onClick?.();
              onNavigate?.();
            }}
            title={compact ? action.label : undefined}
            aria-label={compact ? action.label : undefined}
            style={
              isLcars && lcarsPalette
                ? getLcarsLinkStyle(lcarsPalette, childItems.length + actionIndex + 1)
                : undefined
            }
          >
            <Icon path={action.icon} size={16} />
            <span className="sidebar-label">{action.label}</span>
          </button>
        ))}
    </div>
  );
}

function Sidebar({
  onNavigate,
  onSignOut: _onSignOut,
  isCollapsed,
  isExpanded,
  activeTab = "nav",
  onActiveTabChange,
  onToggleCollapsed,
  isNavGroupCollapsed,
  toggleNavGroup,
  collapseAllNavGroups,
}) {
  const { isAdmin } = useAuth();
  const { favorites, deleteFavorite, updateFavorite } = useFavorites();
  const { stack, clearStack } = useBrowseStack();
  const { fullTitle } = useBranding();
  const { resolvedTheme } = useTheme();
  const isLcars = resolvedTheme === "lcars";
  const location = useLocation();
  const sidebarRef = useRef(null);
  const [navItems, setNavItems] = useState([]);
  const [brandSettingsOpen, setBrandSettingsOpen] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [navLayoutOpen, setNavLayoutOpen] = useState(false);

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

  const groupedNav = useMemo(() => groupNavigationItems(navItems), [navItems]);

  const navCatalog = useMemo(
    () =>
      getNavLayoutCatalog(
        groupedNav.appMains,
        groupedNav.adminMains,
        groupedNav.childrenByParent
      ),
    [groupedNav]
  );

  const { visibleNavIds, setVisibleNavIds, resetNavLayout, hasCustomLayout } =
    useNavLayoutPreferences(navCatalog.catalogIds);

  const { appMains, adminMains, childrenByParent } = useMemo(
    () => applyNavLayout(groupedNav, visibleNavIds),
    [groupedNav, visibleNavIds]
  );

  const currentPath = locationToPath(location);
  const historyPaths = useMemo(
    () => buildSidebarHistoryEntries(stack, currentPath),
    [stack, currentPath]
  );

  const compact = isCollapsed;

  useEffect(() => {
    collapseAllNavGroups?.();
  }, [collapseAllNavGroups]);

  // LCARS: chase pulse down the rail, then back up — synced with header scanner.
  useEffect(() => {
    if (!isLcars) return undefined;
    const root = sidebarRef.current;
    if (!root) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const HOT = "lcars-pulse-hot";
    const SELECTOR = ".sidebar-mode-tab, .sidebar-nav .sidebar-link";

    const clearHot = () => {
      root.querySelectorAll(`.${HOT}`).forEach((el) => el.classList.remove(HOT));
    };

    const unsubscribe = subscribeLcarsPulse((tick) => {
      const items = Array.from(root.querySelectorAll(SELECTOR));
      clearHot();
      if (items.length === 0) return;

      if (items.length === 1) {
        items[0].classList.add(HOT);
        return;
      }

      // Ping-pong index derived from the shared clock.
      const cycle = 2 * (items.length - 1);
      const phase = tick % cycle;
      const index = phase <= items.length - 1 ? phase : cycle - phase;
      items[index]?.classList.add(HOT);
    });

    return () => {
      unsubscribe();
      clearHot();
    };
  }, [isLcars, activeTab, appMains, adminMains, favorites, historyPaths]);

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
    <aside ref={sidebarRef} className={sidebarClassName}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" onClick={onNavigate} title={fullTitle}>
          <BrandMark />
          <AppBrandText compact={compact} />
        </Link>

        <div className="sidebar-controls">
          <button
            type="button"
            className="sidebar-control"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
          <button
            type="button"
            className={`sidebar-control${hasCustomLayout ? " active" : ""}`}
            aria-label="Customize navigation"
            title="Customize navigation"
            onClick={() => setNavLayoutOpen(true)}
          >
            <ListOrdered size={16} aria-hidden="true" />
          </button>
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
            {isLcars ? null : <p className="sidebar-section">Workspaces</p>}
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

            {(appMains.length > 0 || (isAdmin && adminMains.length > 0)) && (
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
                    isLcars={isLcars}
                    lcarsPalette={isLcars ? getLcarsNavPalette(index) : null}
                  />
                ))}
                {isAdmin &&
                  adminMains.map((main, index) => (
                    <SidebarNavGroup
                      key={main.id}
                      main={main}
                      children={childrenByParent.get(main.id)}
                      actionItems={
                        String(main.path || "") === "/admin"
                          ? [
                              {
                                id: "branding",
                                label: "Branding",
                                icon: (
                                  <>
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                  </>
                                ),
                                onClick: () => setBrandSettingsOpen(true),
                              },
                            ]
                          : []
                      }
                      navItemClass={navItemClass}
                      subItemClass={subItemClass}
                      onNavigate={onNavigate}
                      sidebarExpanded={isExpanded}
                      compact={compact}
                      groupExpanded={!isNavGroupCollapsed(main.id)}
                      onToggleGroup={() => toggleNavGroup(main.id)}
                      isLcars={isLcars}
                      lcarsPalette={
                        isLcars ? getLcarsNavPalette(appMains.length + index) : null
                      }
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
    </aside>

    <BrandSettingsModal open={brandSettingsOpen} onClose={() => setBrandSettingsOpen(false)} />
    <FavoriteEditModal
      key={editingFavorite?.id ?? "closed"}
      open={Boolean(editingFavorite)}
      favorite={editingFavorite}
      onClose={() => setEditingFavorite(null)}
      onSave={updateFavorite}
    />
    <ColumnPickerModal
      open={navLayoutOpen}
      onClose={() => setNavLayoutOpen(false)}
      onApply={setVisibleNavIds}
      onReset={resetNavLayout}
      availableColumns={navCatalog.catalogIds}
      selectedColumns={visibleNavIds}
      columnLabels={navCatalog.labels}
      title="Customize navigation"
      description="Move items between Available and Selected. Order on the right controls the left navigation. Home and Documentation stay fixed."
      availableHeading="Available"
      selectedHeading="Visible in nav"
      availableAriaLabel="Available navigation items"
      selectedAriaLabel="Visible navigation items"
      allowEmpty
    />
    </>
  );
}

export default Sidebar;
