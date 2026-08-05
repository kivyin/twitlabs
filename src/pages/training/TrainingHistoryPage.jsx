import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { listTrainingWorkouts } from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { formatTrainingDateTime } from "../../utils/trainingUtils";

function TrainingHistoryPage() {
  const appName = "training";
  const { athleteUserId } = useTrainingAthlete();
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listTrainingWorkouts(athleteUserId, { limit: 100 })
      .then((result) => {
        if (active) setWorkouts(result.workouts ?? []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [athleteUserId]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "History" },
        ]}
        title="Workout history"
        subtitle="Completed and abandoned sessions."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        {workouts.length === 0 ? (
          <p className="subtext">No workouts logged yet.</p>
        ) : (
          <ul className="training-list">
            {workouts.map((workout) => (
              <li key={workout.id} className="training-list-row">
                <Link to={`/app/${appName}/workout/${workout.id}`}>
                  <strong>{workout.name}</strong>
                  <span className="stat-meta">
                    {workout.status} ·{" "}
                    {formatTrainingDateTime(workout.completed_at || workout.started_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default TrainingHistoryPage;
