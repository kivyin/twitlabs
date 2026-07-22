import { Link } from "react-router-dom";

/**
 * App link used for record create/edit entry points. Browse history is tracked
 * globally by BrowseStackProvider; this is a plain Link for clarity at call sites.
 */
function BrowseLink({ to, state, ...props }) {
  return <Link to={to} state={state} {...props} />;
}

export default BrowseLink;
