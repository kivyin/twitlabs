import { Navigate, useParams } from "react-router-dom";

function DecisionsAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "decisions") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default DecisionsAppGuard;
