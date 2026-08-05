import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTrainingSummary, listTrainingRoutines, startTrainingWorkout } from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { formatTrainingDateTime } from "../../utils/trainingUtils";

function TrainingHomePage() {
  const appName = "training";
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const [summary, setSummary] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [summaryResult, routinesResult] = await Promise.all([
        getTrainingSummary(athleteUserId),
        listTrainingRoutines(athleteUserId),
      ]);
      setSummary(summaryResult.summary);
      setRoutines(routinesResult.routines ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, [athleteUserId]);

  const handleStart = async (routineId = null) => {
    setStarting(true);
    setError("");
    try {
      await startTrainingWorkout(routineId ? { routine_id: routineId } : {}, athleteUserId);
      navigate(`/app/${appName}/workout`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Training" }]}
        title="Training"
        subtitle="Log lifts, run routines, and track strength progress."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="tasks-summary-grid">
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Completed</span>
          <strong>{summary?.completed_workout_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Routines</span>
          <strong>{summary?.routine_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Body weight</span>
          <strong>
            {summary?.latest_body_weight?.body_weight != null
              ? summary.latest_body_weight.body_weight
              : "—"}
          </strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Active session</span>
          <strong>{summary?.active_workout ? "In progress" : "None"}</strong>
        </article>
      </section>

      <section className="panel training-actions-panel">
        <div className="training-actions-row">
          {summary?.active_workout ? (
            <Link className="button-primary" to={`/app/${appName}/workout`}>
              Resume workout
            </Link>
          ) : (
            <button
              type="button"
              className="button-primary"
              disabled={starting}
              onClick={() => handleStart()}
            >
              {starting ? "Starting…" : "Start empty workout"}
            </button>
          )}
          <Link className="button" to={`/app/${appName}/coach`}>
            AI Coach
          </Link>
          <Link className="button" to={`/app/${appName}/routines`}>
            Routines
          </Link>
          <Link className="button" to={`/app/${appName}/history`}>
            History
          </Link>
          <Link className="button" to={`/app/${appName}/progress`}>
            Progress
          </Link>
        </div>
      </section>

      <div className="training-home-layout">
        <section className="panel">
          <h2>Start from routine</h2>
          {routines.length === 0 ? (
            <p className="subtext">
              No routines yet.{" "}
              <Link className="button" to={`/app/${appName}/routines/new`}>
                Create one
              </Link>
              .
            </p>
          ) : (
            <ul className="training-list">
              {routines.map((routine) => (
                <li key={routine.id} className="training-list-row">
                  <div>
                    <strong>{routine.name}</strong>
                    <span className="stat-meta">{routine.exercise_count} exercises</span>
                  </div>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={starting || Boolean(summary?.active_workout)}
                    onClick={() => handleStart(routine.id)}
                  >
                    Start
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Recent PRs</h2>
          {(summary?.recent_prs ?? []).length === 0 ? (
            <p className="subtext">Complete workouts to see estimated 1RM personal records.</p>
          ) : (
            <ul className="training-list">
              {summary.recent_prs.map((pr) => (
                <li key={pr.exercise_id} className="training-list-row">
                  <div>
                    <strong>{pr.exercise_name}</strong>
                    <span className="stat-meta">
                      {pr.weight} × {pr.reps} · e1RM {pr.e1rm}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Recent workouts</h2>
          {(summary?.recent_workouts ?? []).length === 0 ? (
            <p className="subtext">No completed workouts yet.</p>
          ) : (
            <ul className="training-list">
              {summary.recent_workouts.map((workout) => (
                <li key={workout.id} className="training-list-row">
                  <Link to={`/app/${appName}/workout/${workout.id}`}>
                    <strong>{workout.name}</strong>
                    <span className="stat-meta">
                      {formatTrainingDateTime(workout.completed_at || workout.started_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default TrainingHomePage;
