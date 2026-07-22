import { Navigate, useParams } from "react-router-dom";

function TasksAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "tasks") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return children;
}

export default TasksAppGuard;
