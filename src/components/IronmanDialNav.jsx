import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNavigation, groupNavigationItems } from "../api/navigationApi";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useFavorites } from "../context/FavoritesContext";
import { useNavLayoutPreferences } from "../hooks/useNavLayoutPreferences";
import { locationToPath } from "../utils/browseStack";
import { applyNavLayout, getNavLayoutCatalog } from "../utils/navLayout";
import { getNavIcon } from "../utils/navIcons";
import {
  buildSidebarHistoryEntries,
  getSidebarHistoryLabel,
} from "../utils/sidebarHistory";
import { renderFavoriteIcon } from "../utils/favoriteIcons";

const MODES = [
  { id: "nav", label: "Nav" },
  { id: "favorites", label: "Fav" },
  { id: "history", label: "Hist" },
];

/**
 * Downward semicircle below a top hub: left → bottom → right.
 * CSS degrees: 0 = right, clockwise.
 */
const ARC_START = 180; // left
const ARC_SWEEP = 180; // sweep toward right through bottom (angles decrease)
const MAX_VISIBLE = 7;

const HUB_CX = 50;
const HUB_CY = 50;
const HUB_R = 47;

function hubPolar(cx, cy, r, angleFromTopDeg) {
  const rad = ((angleFromTopDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function hubWedgePath(startAngle, endAngle) {
  const start = hubPolar(HUB_CX, HUB_CY, HUB_R, startAngle);
  const end = hubPolar(HUB_CX, HUB_CY, HUB_R, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${HUB_CX} ${HUB_CY} L ${start.x} ${start.y} A ${HUB_R} ${HUB_R} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function NavGlyph({ icon, section = "app", size = 18 }) {
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
      {getNavIcon(icon, section)}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function pathIsActive(pathname, path) {
  if (!path) return false;
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function IronmanDialNav({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { visits } = useBrowseStack();
  const dialRef = useRef(null);
  const [navItems, setNavItems] = useState([]);
  const [mode, setMode] = useState("nav");
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [parentItem, setParentItem] = useState(null);

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

  useEffect(() => {
    setOpen(false);
    setParentItem(null);
  }, [location.pathname]);

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
  const { visibleNavIds } = useNavLayoutPreferences(navCatalog.catalogIds);
  const { appMains, adminMains, childrenByParent } = useMemo(
    () => applyNavLayout(groupedNav, visibleNavIds),
    [groupedNav, visibleNavIds]
  );

  const currentPath = locationToPath(location);
  const historyPaths = useMemo(
    () => buildSidebarHistoryEntries(visits, currentPath),
    [visits, currentPath]
  );

  const mainItems = useMemo(() => {
    if (mode === "favorites") {
      return favorites.map((favorite) => ({
        id: `fav-${favorite.id}`,
        label: favorite.label,
        path: favorite.path,
        kind: "favorite",
        favorite,
      }));
    }

    if (mode === "history") {
      return historyPaths.map((path, index) => ({
        id: `hist-${index}-${path}`,
        label: getSidebarHistoryLabel(path, { favorites, navItems }),
        path,
        kind: "history",
      }));
    }

    if (parentItem) {
      const children = childrenByParent.get(Number(parentItem.id)) ?? [];
      return children.map((child) => ({
        id: child.id,
        label: child.label,
        path: child.path,
        icon: child.icon,
        kind: "child",
        section: child.nav_section,
      }));
    }

    return [
      { id: "home", label: "Home", path: "/", icon: "home", kind: "root" },
      ...appMains.map((item) => ({
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon,
        kind: "main",
        section: item.nav_section,
      })),
      ...adminMains.map((item) => ({
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon,
        kind: "main",
        section: "admin",
      })),
      {
        id: "docs",
        label: "Docs",
        path: "/docs",
        icon: "applications",
        kind: "root",
      },
    ];
  }, [
    mode,
    parentItem,
    favorites,
    historyPaths,
    navItems,
    appMains,
    adminMains,
    childrenByParent,
  ]);

  const getChildCount = (item) => {
    if (mode !== "nav" || parentItem || item.kind === "child" || item.kind === "root") {
      return 0;
    }
    return (childrenByParent.get(Number(item.id)) ?? []).length;
  };

  useEffect(() => {
    setFocusIndex(0);
  }, [mode, parentItem, mainItems.length]);

  const closeDial = () => {
    setOpen(false);
    setParentItem(null);
  };

  const openDial = (nextMode = mode) => {
    setMode(nextMode);
    setParentItem(null);
    setOpen(true);
  };

  const selectMode = (nextMode) => {
    if (!open) {
      openDial(nextMode);
      return;
    }
    if (mode === nextMode && !parentItem) {
      closeDial();
      return;
    }
    setMode(nextMode);
    setParentItem(null);
    setOpen(true);
  };

  const handleActivate = (item) => {
    const childCount = getChildCount(item);
    if (childCount > 0) {
      setParentItem(item);
      setOpen(true);
      return;
    }
    if (item.path) {
      navigate(item.path);
      onNavigate?.();
      closeDial();
    }
  };

  const handleHubPrimary = () => {
    if (parentItem) {
      setParentItem(null);
      return;
    }
    if (open) {
      closeDial();
      return;
    }
    openDial(mode);
  };

  const visibleCount = Math.min(mainItems.length, MAX_VISIBLE);
  const angleStep = visibleCount <= 1 ? 0 : ARC_SWEEP / Math.max(visibleCount - 1, 1);

  const visibleItems = useMemo(() => {
    if (mainItems.length === 0) return [];
    const slots = [];
    const count = Math.min(mainItems.length, MAX_VISIBLE);
    for (let slot = 0; slot < count; slot += 1) {
      const index = (focusIndex + slot) % mainItems.length;
      slots.push({ item: mainItems[index], index, slot });
    }
    return slots;
  }, [mainItems, focusIndex]);

  useEffect(() => {
    const node = dialRef.current;
    if (!node) return undefined;

    const onWheel = (event) => {
      if (!open || mainItems.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.sign(event.deltaY) || Math.sign(event.deltaX);
      if (!delta) return;
      setFocusIndex((prev) => {
        const next = prev + delta;
        const len = mainItems.length;
        return ((next % len) + len) % len;
      });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [open, mainItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (parentItem) setParentItem(null);
        else closeDial();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, parentItem]);

  return (
    <div
      ref={dialRef}
      className={`ironman-dial${open ? " is-open" : ""}${parentItem ? " has-submenu" : ""}`}
    >
      <button
        type="button"
        className="ironman-dial-backdrop"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={closeDial}
      />

      <div className="ironman-dial-stage">
        <div
          className={`ironman-dial-hub${parentItem ? " is-parent-back" : ""}${open ? " is-open-hub" : ""}`}
          aria-expanded={open}
        >
          {parentItem ? (
            <button
              type="button"
              className="ironman-dial-parent-back"
              onClick={() => setParentItem(null)}
              title={`Back from ${parentItem.label}`}
            >
              <span className="ironman-dial-parent-back-name">{parentItem.label}</span>
              <span className="ironman-dial-parent-back-meta">Back</span>
            </button>
          ) : open ? (
            <button
              type="button"
              className="ironman-dial-close"
              onClick={handleHubPrimary}
              aria-label="Close navigation"
              title="Close"
            >
              <CloseIcon />
            </button>
          ) : (
            <svg className="ironman-dial-hub-svg" viewBox="0 0 100 100">
              {MODES.map((entry, index) => {
                const startAngle = index * 120;
                const endAngle = startAngle + 120;
                const mid = hubPolar(HUB_CX, HUB_CY, HUB_R * 0.58, startAngle + 60);
                const active = mode === entry.id;
                return (
                  <g key={entry.id}>
                    <path
                      d={hubWedgePath(startAngle, endAngle)}
                      className={`ironman-dial-wedge${active ? " is-active" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${entry.label}`}
                      onClick={() => selectMode(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectMode(entry.id);
                        }
                      }}
                    />
                    <text
                      x={mid.x}
                      y={mid.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`ironman-dial-wedge-label${active ? " is-active" : ""}`}
                    >
                      {entry.label}
                    </text>
                  </g>
                );
              })}
              <circle
                cx={HUB_CX}
                cy={HUB_CY}
                r="11"
                fill="#031018"
                stroke="rgba(41, 215, 255, 0.5)"
                strokeWidth="1.5"
                pointerEvents="none"
              />
            </svg>
          )}
        </div>

        {open && !parentItem && (
          <div className="ironman-dial-mode-row" role="tablist" aria-label="Navigation mode">
            {MODES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={mode === entry.id}
                className={`ironman-dial-mode-chip${mode === entry.id ? " is-active" : ""}`}
                onClick={() => selectMode(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

        <div className="ironman-dial-ring" aria-hidden={!open}>
          {open &&
            visibleItems.map(({ item, index, slot }) => {
              const angle = ARC_START - slot * angleStep;
              const childCount = getChildCount(item);
              const isSubmenuParent = childCount > 0;
              const active = pathIsActive(location.pathname, item.path);
              const focused = index === focusIndex;
              const itemClass = [
                "ironman-dial-entry",
                item.kind === "child" || parentItem ? "is-child" : "",
                isSubmenuParent ? "is-parent" : "",
                active ? "is-active" : "",
                focused ? "is-focused" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const icon =
                item.kind === "favorite" ? (
                  item.favorite?.custom_icon_data ? (
                    <img src={item.favorite.custom_icon_data} alt="" width={18} height={18} />
                  ) : (
                    renderFavoriteIcon(item.favorite?.icon, {
                      size: 18,
                      strokeWidth: 2,
                      "aria-hidden": "true",
                    })
                  )
                ) : (
                  <NavGlyph
                    icon={item.icon}
                    section={item.section === "admin" ? "applications" : "app"}
                  />
                );

              const label = isSubmenuParent ? `${item.label}` : item.label;

              return (
                <div
                  key={`${item.id}-${slot}`}
                  className={`ironman-dial-item${itemClass ? ` ${itemClass}` : ""}`}
                  style={{ ["--item-angle"]: `${angle}deg` }}
                >
                  <div className="ironman-dial-spoke" aria-hidden="true" />

                  <div
                    className="ironman-dial-icon-slot"
                    style={{ ["--item-radius"]: "var(--dial-icon-radius)" }}
                  >
                    <div className="ironman-dial-item-face">
                      <button
                        type="button"
                        className={`ironman-dial-orb ${itemClass}`}
                        onClick={() => handleActivate(item)}
                        title={
                          isSubmenuParent
                            ? `${item.label} (${childCount} pages)`
                            : item.label
                        }
                        aria-label={item.label}
                      >
                        {icon}
                      </button>
                    </div>
                  </div>

                  <div
                    className="ironman-dial-label-slot"
                    style={{ ["--item-radius"]: "var(--dial-label-radius)" }}
                    data-side={
                      angle > 105 ? "left" : angle < 75 ? "right" : "bottom"
                    }
                  >
                    <div className="ironman-dial-item-face ironman-dial-label-face">
                      <button
                        type="button"
                        className={`ironman-dial-label ${itemClass}`}
                        onClick={() => handleActivate(item)}
                        title={item.label}
                      >
                        <span>{label}</span>
                        {isSubmenuParent ? <span className="ironman-dial-caret">›</span> : null}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default IronmanDialNav;
