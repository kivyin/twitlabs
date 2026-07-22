import { Navigate, useParams } from "react-router-dom";

function NotesAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "notes") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default NotesAppGuard;
