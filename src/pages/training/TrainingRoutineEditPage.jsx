import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createTrainingRoutine,
  getTrainingRoutine,
  listTrainingExercises,
  updateTrainingRoutine,
} from "../../api/trainingApi";
import FormActions from "../../components/FormActions";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { useBrowseReturn } from "../../hooks/useBrowseReturn";
import { isCardioExercise } from "../../utils/trainingUtils";

function emptyLine() {
  return {
    exercise_id: "",
    target_sets: "3",
    target_reps: "8",
    target_weight: "",
    target_duration_mins: "",
    target_distance: "",
    superset_group: "",
    notes: "",
  };
}

function TrainingRoutineEditPage() {
  const { recordId } = useParams();
  const isNew = !recordId || recordId === "new";
  const appName = "training";
  const navigate = useNavigate();
  const { goBack } = useBrowseReturn(`/app/${appName}/routines`);
  const { athleteUserId } = useTrainingAthlete();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      try {
        const exerciseResult = await listTrainingExercises(athleteUserId);
        if (!active) return;
        setExercises(exerciseResult.exercises ?? []);
        if (!isNew) {
          setLoading(true);
          const result = await getTrainingRoutine(recordId, athleteUserId);
          if (!active) return;
          const routine = result.routine;
          setName(routine.name || "");
          setNotes(routine.notes || "");
          setLines(
            (routine.exercises ?? []).length
              ? routine.exercises.map((item) => {
                  const cardio = isCardioExercise(item);
                  return {
                    exercise_id: String(item.exercise_id),
                    target_sets:
                      item.target_sets != null ? String(item.target_sets) : cardio ? "1" : "3",
                    target_reps: item.target_reps != null ? String(item.target_reps) : "",
                    target_weight: item.target_weight != null ? String(item.target_weight) : "",
                    target_duration_mins:
                      item.target_duration_mins != null
                        ? String(item.target_duration_mins)
                        : "",
                    target_distance:
                      item.target_distance != null ? String(item.target_distance) : "",
                    superset_group:
                      item.superset_group != null ? String(item.superset_group) : "",
                    notes: item.notes || "",
                  };
                })
              : [emptyLine()]
          );
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [athleteUserId, isNew, recordId]);

  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field !== "exercise_id") return { ...line, [field]: value };
        const exercise = exercises.find((item) => String(item.id) === String(value));
        const cardio = isCardioExercise(exercise);
        return {
          ...line,
          exercise_id: value,
          target_sets: cardio ? "1" : line.target_sets || "3",
          target_reps: cardio ? "" : line.target_reps || "8",
          target_weight: cardio ? "" : line.target_weight,
          target_duration_mins: cardio ? line.target_duration_mins || "20" : "",
          target_distance: cardio ? line.target_distance : "",
        };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        notes,
        exercises: lines
          .filter((line) => line.exercise_id)
          .map((line, index) => {
            const exercise = exercises.find((item) => String(item.id) === String(line.exercise_id));
            const cardio = isCardioExercise(exercise);
            return {
              exercise_id: Number(line.exercise_id),
              sort_order: index + 1,
              target_sets: line.target_sets ? Number(line.target_sets) : null,
              target_reps: cardio ? null : line.target_reps ? Number(line.target_reps) : null,
              target_weight: cardio
                ? null
                : line.target_weight
                  ? Number(line.target_weight)
                  : null,
              target_duration_mins: cardio
                ? line.target_duration_mins
                  ? Number(line.target_duration_mins)
                  : null
                : null,
              target_distance: cardio
                ? line.target_distance
                  ? Number(line.target_distance)
                  : null
                : null,
              superset_group: line.superset_group ? Number(line.superset_group) : null,
              notes: line.notes || null,
            };
          }),
      };
      if (isNew) {
        await createTrainingRoutine(payload, athleteUserId);
      } else {
        await updateTrainingRoutine(recordId, payload, athleteUserId);
      }
      navigate(`/app/${appName}/routines`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "Routines", to: `/app/${appName}/routines` },
          { label: isNew ? "New" : "Edit" },
        ]}
        title={isNew ? "New routine" : "Edit routine"}
        subtitle="Same superset group number links exercises together."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="subtext">Loading…</p>}

      {!loading && (
        <section className="panel">
          <form className="form form-shell" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isNew ? "Save routine" : "Update routine"}
              onCancel={() => goBack()}
            >
              <div className="form-grid two-col">
                <label>
                  Name
                  <input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="form-field-full">
                  Notes
                  <input value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </div>

              <div className="split-lines-panel">
                <div className="split-lines-head">
                  <strong>Exercises</strong>
                  <Link to={`/app/${appName}/exercises`}>Manage library</Link>
                </div>
                {lines.map((line, index) => {
                  const selected = exercises.find(
                    (item) => String(item.id) === String(line.exercise_id)
                  );
                  const cardio = isCardioExercise(selected);
                  return (
                  <div key={`line-${index}`} className="training-routine-line">
                    <select
                      value={line.exercise_id}
                      onChange={(event) => updateLine(index, "exercise_id", event.target.value)}
                      required
                    >
                      <option value="">Select exercise</option>
                      {exercises.map((exercise) => (
                        <option key={exercise.id} value={String(exercise.id)}>
                          {exercise.name}
                          {isCardioExercise(exercise) ? " (cardio)" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder={cardio ? "Intervals" : "Sets"}
                      value={line.target_sets}
                      onChange={(event) => updateLine(index, "target_sets", event.target.value)}
                    />
                    {cardio ? (
                      <>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="Mins"
                          value={line.target_duration_mins}
                          onChange={(event) =>
                            updateLine(index, "target_duration_mins", event.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Distance"
                          value={line.target_distance}
                          onChange={(event) =>
                            updateLine(index, "target_distance", event.target.value)
                          }
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          min="1"
                          placeholder="Reps"
                          value={line.target_reps}
                          onChange={(event) => updateLine(index, "target_reps", event.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Weight"
                          value={line.target_weight}
                          onChange={(event) =>
                            updateLine(index, "target_weight", event.target.value)
                          }
                        />
                      </>
                    )}
                    <input
                      type="number"
                      min="1"
                      placeholder="SS#"
                      title="Superset group"
                      value={line.superset_group}
                      onChange={(event) => updateLine(index, "superset_group", event.target.value)}
                    />
                    <button
                      type="button"
                      className="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      disabled={lines.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                  );
                })}
                <button
                  type="button"
                  className="button"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  Add exercise
                </button>
              </div>
            </FormActions>
          </form>
        </section>
      )}
    </>
  );
}

export default TrainingRoutineEditPage;
