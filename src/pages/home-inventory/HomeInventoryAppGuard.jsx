import { Navigate, useParams } from "react-router-dom";

function HomeInventoryAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "home_inventory") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default HomeInventoryAppGuard;
