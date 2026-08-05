import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  abandonTrainingWorkout,
  addTrainingSet,
  addTrainingWorkoutExercise,
  completeTrainingWorkout,
  deleteTrainingSet,
  deleteTrainingWorkoutExercise,
  getActiveTrainingWorkout,
  getTrainingWorkout,
  listTrainingExercises,
  startTrainingWorkout,
  updateTrainingSet,
  updateTrainingWorkoutExercise,
} from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import {
  findNextWorkoutUp,
  formatTrainingDateTime,
  getDefaultRestSeconds,
  isCardioExercise,
  isWorkoutExerciseComplete,
  setDefaultRestSeconds,
  workoutCardioMinutes,
  workoutVolume,
} from "../../utils/trainingUtils";

function TrainingWorkoutPage() {
  const { workoutId } = useParams();
  const isDetail = Boolean(workoutId);
  const appName = "training";
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const { confirm, confirmModal } = useConfirmDialog();
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [addExerciseId, setAddExerciseId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [restSecondsDefault, setRestSecondsDefault] = useState(getDefaultRestSeconds());
  const [restRemaining, setRestRemaining] = useState(0);
  const [restNextUp, setRestNextUp] = useState(null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState(() => new Set());
  const restRef = useRef(null);

  const isActive = workout?.status === "active";
  const canEdit = workout?.status === "active" || workout?.status === "completed";

  const clearRest = () => {
    if (restRef.current) {
      window.clearInterval(restRef.current);
      restRef.current = null;
    }
    setRestRemaining(0);
    setRestNextUp(null);
  };

  const formatRestClock = (totalSeconds) => {
    const secs = Math.max(0, Number(totalSeconds) || 0);
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${String(rem).padStart(2, "0")}`;
  };

  const collapseCompletedExercises = (nextWorkout) => {
    if (!nextWorkout || nextWorkout.status !== "active") {
      setCollapsedExerciseIds(new Set());
      return;
    }
    setCollapsedExerciseIds(
      new Set(
        (nextWorkout.exercises ?? [])
          .filter((exercise) => isWorkoutExerciseComplete(exercise))
          .map((exercise) => exercise.id)
      )
    );
  };

  const markExerciseCollapsed = (exerciseId, nextWorkout) => {
    setCollapsedExerciseIds((prev) => {
      const next = new Set(prev);
      for (const exercise of nextWorkout?.exercises ?? []) {
        if (!isWorkoutExerciseComplete(exercise)) next.delete(exercise.id);
      }
      if (exerciseId != null) next.add(exerciseId);
      return next;
    });
  };

  const toggleExerciseCollapsed = (exerciseId) => {
    setCollapsedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const startRest = (nextUp = null) => {
    if (!isActive) return;
    clearRest();
    const seconds = Number(restSecondsDefault) || 0;
    if (seconds <= 0) return;
    setRestNextUp(nextUp);
    setRestRemaining(seconds);
    restRef.current = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearRest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearRest(), []);

  useEffect(() => {
    if (restRemaining <= 0) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [restRemaining > 0]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const exerciseResult = await listTrainingExercises(athleteUserId);
      setExercises(exerciseResult.exercises ?? []);
      if (isDetail) {
        const result = await getTrainingWorkout(workoutId, athleteUserId);
        setWorkout(result.workout);
        collapseCompletedExercises(result.workout);
      } else {
        let result = await getActiveTrainingWorkout(athleteUserId);
        if (!result.workout) {
          result = await startTrainingWorkout({}, athleteUserId);
        }
        setWorkout(result.workout);
        collapseCompletedExercises(result.workout);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [athleteUserId, workoutId, isDetail]);

  const applyWorkout = (result, { collapseExerciseId = null } = {}) => {
    setWorkout(result.workout);
    if (result.workout?.status === "active" && collapseExerciseId != null) {
      markExerciseCollapsed(collapseExerciseId, result.workout);
    } else if (result.workout?.status !== "active") {
      setCollapsedExerciseIds(new Set());
    } else {
      setCollapsedExerciseIds((prev) => {
        const next = new Set(prev);
        for (const exercise of result.workout.exercises ?? []) {
          if (!isWorkoutExerciseComplete(exercise)) next.delete(exercise.id);
        }
        return next;
      });
    }
  };

  const handleAddExercise = async () => {
    if (!addExerciseId || !workout) return;
    setError("");
    try {
      const result = await addTrainingWorkoutExercise(
        workout.id,
        { exercise_id: Number(addExerciseId) },
        athleteUserId
      );
      applyWorkout(result);
      setAddExerciseId("");
    } catch (addError) {
      setError(addError.message);
    }
  };

  const handleSetField = async (setRow, field, value) => {
    setError("");
    try {
      const result = await updateTrainingSet(
        setRow.id,
        { [field]: value === "" ? null : value },
        athleteUserId
      );
      applyWorkout(result);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const patchLocalSet = (exerciseId, setId, patch) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              sets: item.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            }
          : item
      ),
    }));
  };

  const handleCompleteSet = async (setRow, cardio = false) => {
    setError("");
    try {
      const result = await updateTrainingSet(
        setRow.id,
        {
          ...(cardio
            ? {
                duration_mins: setRow.duration_mins,
                distance: setRow.distance,
              }
            : {
                weight: setRow.weight,
                reps: setRow.reps,
              }),
          rpe: setRow.rpe,
          is_warmup: setRow.is_warmup,
          complete: !setRow.completed_at,
        },
        athleteUserId
      );
      const markingDone = !setRow.completed_at;
      const exerciseJustFinished =
        markingDone &&
        isActive &&
        (result.workout?.exercises ?? []).some(
          (exercise) =>
            (exercise.sets ?? []).some((row) => row.id === setRow.id) &&
            isWorkoutExerciseComplete(exercise)
        );
      const finishedExerciseId = exerciseJustFinished
        ? (result.workout?.exercises ?? []).find((exercise) =>
            (exercise.sets ?? []).some((row) => row.id === setRow.id)
          )?.id
        : null;
      applyWorkout(result, {
        collapseExerciseId: finishedExerciseId,
      });
      if (markingDone && isActive) {
        startRest(findNextWorkoutUp(result.workout));
      }
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const handleAddSet = async (weId) => {
    setError("");
    try {
      const result = await addTrainingSet(workout.id, weId, {}, athleteUserId);
      applyWorkout(result);
    } catch (addError) {
      setError(addError.message);
    }
  };

  const handleDeleteSet = async (setId) => {
    setError("");
    try {
      const result = await deleteTrainingSet(setId, athleteUserId);
      applyWorkout(result);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleDeleteExercise = async (weId) => {
    const ok = await confirm({
      title: "Remove exercise?",
      message: "This removes the exercise and its sets from the current workout.",
      confirmLabel: "Remove exercise",
    });
    if (!ok) return;
    setError("");
    try {
      const result = await deleteTrainingWorkoutExercise(workout.id, weId, athleteUserId);
      applyWorkout(result);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleSuperset = async (weId, value) => {
    setError("");
    try {
      const result = await updateTrainingWorkoutExercise(
        workout.id,
        weId,
        { superset_group: value },
        athleteUserId
      );
      applyWorkout(result);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const handleFinish = async () => {
    setError("");
    try {
      const result = await completeTrainingWorkout(workout.id, {}, athleteUserId);
      clearRest();
      navigate(`/app/${appName}/workout/${result.workout.id}`);
    } catch (finishError) {
      setError(finishError.message);
    }
  };

  const handleAbandon = async () => {
    const ok = await confirm({
      title: "Abandon workout?",
      message: "This marks the session as abandoned. You can still review it in History.",
      confirmLabel: "Abandon workout",
    });
    if (!ok) return;
    setError("");
    try {
      await abandonTrainingWorkout(workout.id, athleteUserId);
      clearRest();
      navigate(`/app/${appName}`);
    } catch (abandonError) {
      setError(abandonError.message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: isActive ? "Active workout" : "Workout" },
        ]}
        title={workout?.name || "Workout"}
        subtitle={
          workout
            ? `${formatTrainingDateTime(workout.started_at)}${
                workout.completed_at ? ` → ${formatTrainingDateTime(workout.completed_at)}` : ""
              } · Volume ${Math.round(workoutVolume(workout))}${
                workoutCardioMinutes(workout) > 0
                  ? ` · Cardio ${workoutCardioMinutes(workout)} min`
                  : ""
              }`
            : "Log sets between rests."
        }
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="subtext">Loading workout…</p>}

      {!loading && workout && (
        <>
          {restRemaining > 0 && (
            <div
              className="training-rest-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Rest timer"
            >
              <p className="training-rest-overlay-label">Rest</p>
              <p className="training-rest-overlay-clock" aria-live="polite">
                {formatRestClock(restRemaining)}
              </p>
              <p className="training-rest-overlay-sub">{restRemaining}s remaining</p>
              <div className="training-rest-overlay-next">
                <p className="training-rest-overlay-next-label">Up next</p>
                <p className="training-rest-overlay-next-value">
                  {restNextUp?.label || "Finish workout"}
                </p>
              </div>
              <div className="training-rest-overlay-actions">
                <button type="button" className="button-primary" onClick={clearRest}>
                  End rest
                </button>
                <button type="button" className="button" onClick={clearRest}>
                  Close
                </button>
              </div>
            </div>
          )}

          {workout.status === "completed" && (
            <section className="panel">
              <p className="subtext">
                Editing a completed workout. Changes update history and progress.
              </p>
            </section>
          )}

          {isActive && (
            <section className="panel training-rest-panel">
              <div className="training-actions-row">
                <label>
                  Rest timer (sec)
                  <input
                    type="number"
                    min="0"
                    value={restSecondsDefault}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setRestSecondsDefault(value);
                      setDefaultRestSeconds(value);
                    }}
                  />
                </label>
                <div className="training-rest-display" aria-live="polite">
                  {restRemaining > 0 ? `Rest ${restRemaining}s` : "Ready"}
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => startRest(findNextWorkoutUp(workout))}
                >
                  Start rest
                </button>
                <button type="button" className="button" onClick={clearRest}>
                  Skip
                </button>
                <button type="button" className="button-primary" onClick={handleFinish}>
                  Finish workout
                </button>
                <button type="button" className="danger-button" onClick={handleAbandon}>
                  Abandon
                </button>
              </div>
            </section>
          )}

          {canEdit && (
            <section className="panel">
              <div className="training-toolbar">
                <label>
                  Add exercise
                  <select
                    value={addExerciseId}
                    onChange={(event) => setAddExerciseId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={String(exercise.id)}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="button-primary" onClick={handleAddExercise}>
                  Add
                </button>
              </div>
            </section>
          )}

          {(workout.exercises ?? []).length === 0 ? (
            <section className="panel">
              <p className="subtext">No exercises yet. Add one to start logging sets.</p>
            </section>
          ) : (
            workout.exercises.map((exercise) => {
              const cardio = isCardioExercise(exercise);
              const complete = isWorkoutExerciseComplete(exercise);
              const collapsed = isActive && complete && collapsedExerciseIds.has(exercise.id);
              const doneCount = (exercise.sets ?? []).filter((row) => row.completed_at).length;
              const totalSets = (exercise.sets ?? []).length;
              return (
              <section
                key={exercise.id}
                className={`panel training-exercise-card${
                  exercise.superset_group != null ? " is-superset" : ""
                }${collapsed ? " is-collapsed" : ""}${complete ? " is-complete" : ""}`}
              >
                <div className="training-exercise-head">
                  <button
                    type="button"
                    className="training-exercise-title-btn"
                    onClick={() => {
                      if (isActive && complete) toggleExerciseCollapsed(exercise.id);
                    }}
                    disabled={!isActive || !complete}
                    aria-expanded={!collapsed}
                  >
                    <h2>
                      {collapsed ? "▸ " : complete && isActive ? "▾ " : ""}
                      {exercise.exercise_name}
                    </h2>
                    <span className="stat-meta">
                      {[exercise.muscle_group, exercise.equipment].filter(Boolean).join(" · ")}
                      {exercise.superset_group != null
                        ? ` · Superset ${exercise.superset_group}`
                        : ""}
                      {complete ? ` · ${doneCount}/${totalSets} done` : ""}
                      {collapsed ? " · tap to expand" : ""}
                    </span>
                  </button>
                  {canEdit && !collapsed && (
                    <div className="training-row-actions">
                      <label>
                        SS#
                        <input
                          type="number"
                          min="1"
                          className="training-ss-input"
                          value={exercise.superset_group ?? ""}
                          onChange={(event) => handleSuperset(exercise.id, event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="button"
                        onClick={() => handleAddSet(exercise.id)}
                      >
                        {cardio ? "Add interval" : "Add set"}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleDeleteExercise(exercise.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {canEdit && collapsed && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => toggleExerciseCollapsed(exercise.id)}
                    >
                      Expand
                    </button>
                  )}
                </div>

                {!collapsed && (
                <div className={`training-set-table${cardio ? " is-cardio" : ""}`}>
                  <div className="training-set-head">
                    <span>#</span>
                    {cardio ? (
                      <>
                        <span>Mins</span>
                        <span>Distance</span>
                      </>
                    ) : (
                      <>
                        <span>Weight</span>
                        <span>Reps</span>
                      </>
                    )}
                    <span>RPE</span>
                    <span>Warm</span>
                    <span />
                  </div>
                  {(exercise.sets ?? []).map((setRow) => (
                    <div
                      key={setRow.id}
                      className={`training-set-row${setRow.completed_at ? " is-done" : ""}`}
                    >
                      <span className="training-set-index">
                        {cardio ? `Int ${setRow.set_index}` : `Set ${setRow.set_index}`}
                      </span>
                      {cardio ? (
                        <>
                          <label className="training-set-field">
                            <span className="training-set-field-label">Mins</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min="0"
                              disabled={!canEdit}
                              value={setRow.duration_mins ?? ""}
                              onChange={(event) =>
                                patchLocalSet(exercise.id, setRow.id, {
                                  duration_mins: event.target.value,
                                })
                              }
                              onBlur={(event) =>
                                handleSetField(setRow, "duration_mins", event.target.value)
                              }
                            />
                          </label>
                          <label className="training-set-field">
                            <span className="training-set-field-label">Distance</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              disabled={!canEdit}
                              placeholder="opt"
                              value={setRow.distance ?? ""}
                              onChange={(event) =>
                                patchLocalSet(exercise.id, setRow.id, {
                                  distance: event.target.value,
                                })
                              }
                              onBlur={(event) =>
                                handleSetField(setRow, "distance", event.target.value)
                              }
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="training-set-field">
                            <span className="training-set-field-label">Weight</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              disabled={!canEdit}
                              value={setRow.weight ?? ""}
                              onChange={(event) =>
                                patchLocalSet(exercise.id, setRow.id, {
                                  weight: event.target.value,
                                })
                              }
                              onBlur={(event) =>
                                handleSetField(setRow, "weight", event.target.value)
                              }
                            />
                          </label>
                          <label className="training-set-field">
                            <span className="training-set-field-label">Reps</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              disabled={!canEdit}
                              value={setRow.reps ?? ""}
                              onChange={(event) =>
                                patchLocalSet(exercise.id, setRow.id, {
                                  reps: event.target.value,
                                })
                              }
                              onBlur={(event) =>
                                handleSetField(setRow, "reps", event.target.value)
                              }
                            />
                          </label>
                        </>
                      )}
                      <label className="training-set-field">
                        <span className="training-set-field-label">RPE</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="1"
                          max="10"
                          disabled={!canEdit}
                          value={setRow.rpe ?? ""}
                          onChange={(event) =>
                            patchLocalSet(exercise.id, setRow.id, { rpe: event.target.value })
                          }
                          onBlur={(event) => handleSetField(setRow, "rpe", event.target.value)}
                        />
                      </label>
                      <label className="training-set-field">
                        <span className="training-set-field-label">Warmup</span>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={Boolean(setRow.is_warmup)}
                          onChange={(event) =>
                            handleSetField(setRow, "is_warmup", event.target.checked)
                          }
                        />
                      </label>
                      {canEdit ? (
                        <div className="training-row-actions">
                          <button
                            type="button"
                            className={setRow.completed_at ? "button" : "button-primary"}
                            onClick={() => handleCompleteSet(setRow, cardio)}
                          >
                            {setRow.completed_at ? "Undo" : "Done"}
                          </button>
                          <button
                            type="button"
                            className="button"
                            onClick={() => handleDeleteSet(setRow.id)}
                            aria-label={cardio ? "Delete interval" : "Delete set"}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="stat-meta">
                          {setRow.completed_at ? "Done" : "Skipped"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </section>
              );
            })
          )}

          {!isActive && (
            <p className="subtext">
              <Link className="button" to={`/app/${appName}/history`}>
                Back to history
              </Link>
            </p>
          )}
        </>
      )}
      {confirmModal}
    </>
  );
}

export default TrainingWorkoutPage;
