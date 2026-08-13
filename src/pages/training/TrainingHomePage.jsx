import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getTrainingSummary,
  getTrainingToday,
  listTrainingPrograms,
  listTrainingRoutines,
  startTrainingWorkout,
} from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { formatTrainingDateTime, isCardioExercise } from "../../utils/trainingUtils";

function formatExerciseTarget(item) {
  const cardio = isCardioExercise(item);
  if (cardio || item.target_duration_mins) {
    return `${item.target_sets || 1} rounds × ${item.target_duration_mins || "—"} min`;
  }
  return `${item.target_sets || "—"} × ${item.target_reps || "—"}`;
}

function TrainingHomePage() {
  const appName = "training";
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const [summary, setSummary] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [today, setToday] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [summaryResult, routinesResult, programsResult, todayResult] = await Promise.all([
        getTrainingSummary(athleteUserId),
        listTrainingRoutines(athleteUserId),
        listTrainingPrograms(athleteUserId),
        getTrainingToday(athleteUserId),
      ]);
      setSummary(summaryResult.summary);
      setRoutines((routinesResult.routines ?? []).filter((r) => !r.program_id && !r.is_rest));
      setPrograms(programsResult.programs ?? []);
      setToday(todayResult);
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

  const todaySessions = today?.sessions ?? [];
  const todayTraining = todaySessions.find((session) => !session.is_rest);
  const todayRest = !todayTraining && todaySessions[0];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Training" }]}
        title="Training"
        subtitle="Log lifts, run coached programs, and track strength progress."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="tasks-summary-grid">
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Completed</span>
          <strong>{summary?.completed_workout_count ?? 0}</strong>
        </article>
        <article className="panel tasks-stat-card">
          <span className="tasks-stat-label">Programs</span>
          <strong>{programs.length}</strong>
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

      <section className="panel">
        <h2>Today’s plan {today?.date ? `· ${today.date}` : ""}</h2>
        {!todaySessions.length ? (
          <p className="subtext">
            Nothing scheduled for today. Generate a dated program in{" "}
            <Link to={`/app/${appName}/coach`}>AI Coach</Link>.
          </p>
        ) : todayTraining ? (
          <div className="training-today-preview">
            <p>
              <strong>
                {todayTraining.session_name || todayTraining.name}
                {todayTraining.program_name ? ` · ${todayTraining.program_name}` : ""}
              </strong>
            </p>
            {todayTraining.progression_notes && (
              <p className="training-progression-callout">{todayTraining.progression_notes}</p>
            )}
            <ul className="training-list">
              {(todayTraining.exercises || []).map((item) => (
                <li key={item.id || `${item.exercise_id}-${item.sort_order}`} className="training-list-row">
                  <div>
                    <strong>{item.exercise_name || `Exercise #${item.exercise_id}`}</strong>
                    <span className="stat-meta">
                      {formatExerciseTarget(item)}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="training-actions-row">
              <button
                type="button"
                className="button-primary"
                disabled={starting || Boolean(summary?.active_workout)}
                onClick={() => handleStart(todayTraining.id)}
              >
                {starting ? "Starting…" : "Start today’s workout"}
              </button>
              {todayTraining.program_id ? (
                <Link className="button" to={`/app/${appName}/programs/${todayTraining.program_id}`}>
                  View program
                </Link>
              ) : (
                <Link className="button" to={`/app/${appName}/routines/${todayTraining.id}`}>
                  View / edit day
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p>
              <strong>Rest day</strong>
              {todayRest?.program_name ? ` · ${todayRest.program_name}` : ""}
            </p>
            <p className="subtext">
              {todayRest?.progression_notes || "Recovery day — stay mobile and fuel well."}
            </p>
            {todayRest?.program_id ? (
              <Link className="button" to={`/app/${appName}/programs/${todayRest.program_id}`}>
                View program
              </Link>
            ) : null}
          </div>
        )}
      </section>

      <div className="training-home-layout">
        <section className="panel">
          <h2>Programs</h2>
          {programs.length === 0 ? (
            <p className="subtext">
              No programs yet.{" "}
              <Link to={`/app/${appName}/coach`}>Ask the AI Coach</Link>.
            </p>
          ) : (
            <ul className="training-list">
              {programs.slice(0, 5).map((program) => (
                <li key={program.id} className="training-list-row">
                  <div>
                    <Link to={`/app/${appName}/programs/${program.id}`}>
                      <strong>{program.name}</strong>
                    </Link>
                    <span className="stat-meta">
                      {program.first_date || "—"} → {program.last_date || "—"}
                      {` · ${program.training_day_count || 0} days`}
                    </span>
                  </div>
                  <Link className="button" to={`/app/${appName}/programs/${program.id}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Quick-start templates</h2>
          {routines.length === 0 ? (
            <p className="subtext">
              No standalone routines.{" "}
              <Link className="button" to={`/app/${appName}/routines/new`}>
                Create one
              </Link>
            </p>
          ) : (
            <ul className="training-list">
              {routines.slice(0, 6).map((routine) => (
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
