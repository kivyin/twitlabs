import { Navigate } from "react-router-dom";

/** Site Tracker opens on the site accounts list. */
function SiteTrackerHomePage() {
  return <Navigate to="/app/site-tracker/accounts" replace />;
}

export default SiteTrackerHomePage;
