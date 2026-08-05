import { Navigate, useParams } from "react-router-dom";
import { TrainingAthleteProvider } from "./TrainingAthleteContext";

function TrainingAppGuard({ children }) {
  const { appName } = useParams();
  if (appName !== "training") {
    return <Navigate to={`/app/${appName}`} replace />;
  }
  return <TrainingAthleteProvider>{children}</TrainingAthleteProvider>;
}

export default TrainingAppGuard;
