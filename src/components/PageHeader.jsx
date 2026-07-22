import { Fragment } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import HelpButton from "./docs/HelpButton";
import { LcarsMidBand } from "./LcarsShellChrome";
import { useBrowseStack } from "../context/BrowseStackContext";
import { useTheme } from "../context/ThemeContext";
import { usePageHelpFromPath } from "../utils/docHelp";

function PageHeader({ breadcrumbs = [], title, subtitle, actions, help, favorite = true, showBack = true }) {
  const location = useLocation();
  const params = useParams();
  const autoHelp = usePageHelpFromPath(location.pathname, params);
  const resolvedHelp = help === false ? null : help ?? autoHelp;
  const { canGoBack, goBack } = useBrowseStack();
  const { resolvedTheme } = useTheme();
  const isLcars = resolvedTheme === "lcars";

  const actionRow = (
    <>
      {favorite !== false && (
        <FavoriteButton label={typeof title === "string" ? title : undefined} />
      )}
      {resolvedHelp && <HelpButton help={resolvedHelp} />}
      {actions}
    </>
  );

  return (
    <>
      <header className={`page-header${isLcars ? " page-header-lcars" : ""}`}>
        <div className="page-header-nav">
          {showBack && canGoBack ? (
            <button type="button" className="browse-back-button" onClick={() => goBack()}>
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
          ) : null}
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
        </div>
        <div className="page-header-row">
          <div className="page-header-text">
            <h1>{title}</h1>
            {subtitle && <p className="subtext">{subtitle}</p>}
          </div>
          <div className="page-actions">{actionRow}</div>
        </div>
      </header>
      {isLcars ? <LcarsMidBand /> : null}
    </>
  );
}

export default PageHeader;
