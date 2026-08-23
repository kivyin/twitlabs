import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getNavigation, groupNavigationItems } from "../api/navigationApi";

function LcarsV2Submenu() {
  const location = useLocation();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    getNavigation()
      .then((nextItems) => {
        if (active) setItems(nextItems);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const submenu = useMemo(() => {
    const { appMains, adminMains, childrenByParent } = groupNavigationItems(items);
    const currentPath = location.pathname;
    const parent = [...appMains, ...adminMains]
      .filter(
        (item) =>
          currentPath === item.path ||
          currentPath.startsWith(`${String(item.path || "").replace(/\/$/, "")}/`)
      )
      .sort((a, b) => String(b.path || "").length - String(a.path || "").length)[0];
    if (!parent) return [];
    return childrenByParent.get(Number(parent.id)) ?? [];
  }, [items, location.pathname]);

  if (submenu.length === 0) {
    return <div className="lcars-v2-submenu is-empty" aria-hidden="true" />;
  }

  return (
    <nav className="lcars-v2-submenu" aria-label="Application submenu">
      {submenu.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => `lcars-v2-submenu-link${isActive ? " active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default LcarsV2Submenu;
