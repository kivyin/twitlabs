import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  deleteTrainingProgram,
  deleteTrainingRoutine,
  listTrainingPrograms,
  listTrainingRoutines,
  startTrainingWorkout,
} from "../../api/trainingApi";
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
  const [programs, setPrograms] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [programsResult, routinesResult] = await Promise.all([
        listTrainingPrograms(athleteUserId),
        listTrainingRoutines(athleteUserId),
      ]);
      setPrograms(programsResult.programs ?? []);
      setRoutines(routinesResult.routines ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, [athleteUserId]);

  const standaloneRoutines = useMemo(
    () => (routines || []).filter((routine) => !routine.program_id && !routine.is_rest),
    [routines]
  );

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

  const handleDeleteRoutine = async (routine) => {
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

  const handleDeleteProgram = async (program) => {
    const ok = await confirm({
      title: "Delete program?",
      message: `This removes “${program.name}”, all of its days, and linked calendar events.`,
      confirmLabel: "Delete program",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteTrainingProgram(program.id, athleteUserId);
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
        title="Routines & programs"
        subtitle="Named programs group dated sessions. Standalone routines stay available as templates."
        actions={
          <Link className="button-primary" to={`/app/${appName}/routines/new`}>
            New routine
          </Link>
        }
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Programs</h2>
        {programs.length === 0 ? (
          <p className="subtext">
            No programs yet. Use{" "}
            <Link to={`/app/${appName}/coach`}>AI Coach</Link> to generate a dated, progressive block.
          </p>
        ) : (
          <ul className="training-list">
            {programs.map((program) => (
              <li key={program.id} className="training-list-row">
                <div>
                  <Link to={`/app/${appName}/programs/${program.id}`}>
                    <strong>{program.name}</strong>
                  </Link>
                  <span className="stat-meta">
                    {program.first_date || "—"} → {program.last_date || "—"}
                    {program.days_per_week != null ? ` · ${program.days_per_week} days/week` : ""}
                    {` · ${program.training_day_count || 0} training days`}
                  </span>
                </div>
                <div className="training-row-actions">
                  <Link className="button-primary" to={`/app/${appName}/programs/${program.id}`}>
                    Open
                  </Link>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteProgram(program)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Standalone routines</h2>
        {standaloneRoutines.length === 0 ? (
          <p className="subtext">No standalone templates yet.</p>
        ) : (
          <ul className="training-list">
            {standaloneRoutines.map((routine) => (
              <li key={routine.id} className="training-list-row">
                <div>
                  <Link to={`/app/${appName}/routines/${routine.id}`}>
                    <strong>{routine.name}</strong>
                  </Link>
                  <span className="stat-meta">{routine.exercise_count} exercises</span>
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
                    onClick={() => handleDeleteRoutine(routine)}
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
