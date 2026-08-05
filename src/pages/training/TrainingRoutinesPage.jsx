import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { deleteTrainingRoutine, listTrainingRoutines, startTrainingWorkout } from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";

function TrainingRoutinesPage() {
  const appName = "training";
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const { confirm, confirmModal } = useConfirmDialog();
  const [routines, setRoutines] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const result = await listTrainingRoutines(athleteUserId);
      setRoutines(result.routines ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, [athleteUserId]);

  const handleStart = async (routineId) => {
    setBusy(true);
    setError("");
    try {
      await startTrainingWorkout({ routine_id: routineId }, athleteUserId);
      navigate(`/app/${appName}/workout`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (routine) => {
    const ok = await confirm({
      title: "Delete routine?",
      message: `This will permanently remove “${routine.name}” and its exercise list.`,
      confirmLabel: "Delete routine",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteTrainingRoutine(routine.id, athleteUserId);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "Routines" },
        ]}
        title="Routines"
        subtitle="Reusable workout templates with target sets and supersets. Plan routines are listed by week and day."
        actions={
          <Link className="button-primary" to={`/app/${appName}/routines/new`}>
            New routine
          </Link>
        }
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        {routines.length === 0 ? (
          <p className="subtext">No routines yet. Create a template to start faster next session.</p>
        ) : (
          <ul className="training-list">
            {routines.map((routine) => (
              <li key={routine.id} className="training-list-row">
                <div>
                  <Link to={`/app/${appName}/routines/${routine.id}`}>
                    <strong>{routine.name}</strong>
                  </Link>
                  <span className="stat-meta">
                    {routine.plan_week != null
                      ? `Week ${routine.plan_week}${
                          routine.plan_day != null ? ` · Day ${routine.plan_day}` : ""
                        } · `
                      : ""}
                    {routine.exercise_count} exercises
                  </span>
                </div>
                <div className="training-row-actions">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={busy}
                    onClick={() => handleStart(routine.id)}
                  >
                    Start
                  </button>
                  <Link className="button" to={`/app/${appName}/routines/${routine.id}`}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(routine)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {confirmModal}
    </>
  );
}

export default TrainingRoutinesPage;
