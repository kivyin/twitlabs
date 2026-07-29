import { Navigate, useParams } from "react-router-dom";

function SiteTrackerAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "site-tracker") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default SiteTrackerAppGuard;
