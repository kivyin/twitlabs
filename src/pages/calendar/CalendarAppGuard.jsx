import { Navigate, useParams } from "react-router-dom";

function CalendarAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "calendar") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default CalendarAppGuard;
