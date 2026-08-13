import { Navigate, useParams } from "react-router-dom";

function TroubleHubAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "troublehub") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default TroubleHubAppGuard;
