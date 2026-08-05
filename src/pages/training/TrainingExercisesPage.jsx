import { useEffect, useState } from "react";
import {
  createTrainingExercise,
  deleteTrainingExercise,
  listTrainingExercises,
  updateTrainingExercise,
} from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";

function TrainingExercisesPage() {
  const appName = "training";
  const { athleteUserId } = useTrainingAthlete();
  const { confirm, confirmModal } = useConfirmDialog();
  const [exercises, setExercises] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    muscle_group: "",
    equipment: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setError("");
    try {
      const result = await listTrainingExercises(athleteUserId, q);
      setExercises(result.exercises ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, [athleteUserId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateTrainingExercise(editingId, form, athleteUserId);
      } else {
        await createTrainingExercise(form, athleteUserId);
      }
      setForm({ name: "", muscle_group: "", equipment: "", notes: "" });
      setEditingId(null);
      await load();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const startEdit = (exercise) => {
    setEditingId(exercise.id);
    setForm({
      name: exercise.name || "",
      muscle_group: exercise.muscle_group || "",
      equipment: exercise.equipment || "",
      notes: exercise.notes || "",
    });
  };

  const handleDelete = async (exercise) => {
    const ok = await confirm({
      title: "Delete exercise?",
      message: `This will remove the custom exercise “${exercise.name}” from your library.`,
      confirmLabel: "Delete exercise",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteTrainingExercise(exercise.id, athleteUserId);
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
          { label: "Exercises" },
        ]}
        title="Exercise library"
        subtitle="System lifts plus your custom exercises."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <form className="form form-shell" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit custom exercise" : "Add custom exercise"}</h2>
          <div className="form-grid two-col">
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Muscle group
              <input
                list="training-muscle-groups"
                placeholder="e.g. Chest, Cardio"
                value={form.muscle_group}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, muscle_group: event.target.value }))
                }
              />
              <datalist id="training-muscle-groups">
                <option value="Chest" />
                <option value="Back" />
                <option value="Shoulders" />
                <option value="Arms" />
                <option value="Legs" />
                <option value="Core" />
                <option value="Cardio" />
                <option value="Martial arts" />
                <option value="Mobility" />
              </datalist>
              <span className="stat-meta">
                Use Cardio for minutes/distance logging. Martial arts drills use sets/reps.
              </span>
            </label>
            <label>
              Equipment
              <input
                value={form.equipment}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, equipment: event.target.value }))
                }
              />
            </label>
            <label className="form-field-full">
              Notes
              <input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
          <div className="training-actions-row">
            <button type="submit" className="button-primary">
              {editingId ? "Update" : "Add exercise"}
            </button>
            {editingId && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", muscle_group: "", equipment: "", notes: "" });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="training-toolbar">
          <label>
            Search
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Name, muscle, equipment"
            />
          </label>
          <button type="button" className="button" onClick={load}>
            Search
          </button>
        </div>
        <ul className="training-list">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="training-list-row">
              <div>
                <strong>{exercise.name}</strong>
                <span className="stat-meta">
                  {[
                    exercise.muscle_group,
                    exercise.equipment,
                    exercise.is_custom ? "Custom" : "Library",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {exercise.is_custom ? (
                <div className="training-row-actions">
                  <button type="button" className="button" onClick={() => startEdit(exercise)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(exercise)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      {confirmModal}
    </>
  );
}

export default TrainingExercisesPage;
