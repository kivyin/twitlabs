import { Fragment, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import HelpButton from "./docs/HelpButton";
import UserMenuButton from "./UserMenuButton";
import VersionStatusIndicator from "./VersionStatusIndicator";
import { LcarsMidBand } from "./LcarsShellChrome";
import LcarsProgressLight from "./LcarsProgressLight";
import { useAuth } from "../context/AuthContext";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useTheme } from "../context/ThemeContext";
import { usePageHelpFromPath } from "../utils/docHelp";

function resolveBackFallback(breadcrumbs) {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
    return "/";
  }
  for (let index = breadcrumbs.length - 2; index >= 0; index -= 1) {
    if (breadcrumbs[index]?.to) {
      return breadcrumbs[index].to;
    }
  }
  return breadcrumbs.find((crumb) => crumb?.to)?.to || "/";
}

function PageHeader({
  breadcrumbs = [],
  title,
  subtitle,
  actions,
  meta = null,
  footer = null,
  help,
  favorite = true,
  showBack = true,
}) {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const commandsRef = useRef(null);
  const { logout, user } = useAuth();
  const autoHelp = usePageHelpFromPath(location.pathname, params);
  const resolvedHelp = help === false ? null : help ?? autoHelp;
  const { goBack } = useBrowseStack();
  const { resolvedTheme } = useTheme();
  const isLcars = resolvedTheme === "lcars";
  const backFallback = useMemo(() => resolveBackFallback(breadcrumbs), [breadcrumbs]);
  const displayName = user?.display_name || user?.username || "";

  useEffect(() => {
    const el = commandsRef.current;
    if (!el) return undefined;

    const sync = () => {
      document.documentElement.style.setProperty(
        "--page-header-sticky-offset",
        `${el.offsetHeight}px`
      );
    };
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--page-header-sticky-offset");
      document.documentElement.style.removeProperty("--page-header-height");
    };
  }, [actions]);

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const commandActions = (
    <>
      {actions}
      {favorite !== false && (
        <FavoriteButton
          label={
            typeof favorite === "string"
              ? favorite
              : typeof title === "string"
                ? title
                : undefined
          }
        />
      )}
      {resolvedHelp && <HelpButton help={resolvedHelp} />}
      <VersionStatusIndicator className="page-header-version-menu" />
      {!isLcars ? (
        <UserMenuButton
          className="page-header-user-menu"
          displayName={displayName}
          onSignOut={handleSignOut}
        />
      ) : null}
    </>
  );

  return (
    <>
      <header className={`page-header${isLcars ? " page-header-lcars" : ""}`}>
        <div ref={commandsRef} className="page-header-commands page-header-commands--sticky">
          <div className="page-header-commands-start">
            {showBack ? (
              <button
                type="button"
                className="browse-back-button"
                onClick={() => goBack(backFallback)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>
            ) : (
              <span className="page-header-commands-spacer" aria-hidden="true" />
            )}
          </div>
          {isLcars ? <LcarsProgressLight /> : null}
          <div className="page-header-commands-end page-actions">{commandActions}</div>
        </div>

        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to} className="breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="breadcrumb-current" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && (
                    <span className="breadcrumb-sep" aria-hidden="true">
                      /
                    </span>
                  )}
                </Fragment>
              );
            })}
          </nav>
        )}

        <div className="page-header-row">
          <div className="page-header-text">
            <h1>{title}</h1>
            {subtitle && <p className="subtext">{subtitle}</p>}
          </div>
          {meta ? <div className="page-header-meta">{meta}</div> : null}
        </div>
        {footer ? <div className="page-header-footer">{footer}</div> : null}
      </header>
      {isLcars ? <LcarsMidBand /> : null}
    </>
  );
}

export default PageHeader;
