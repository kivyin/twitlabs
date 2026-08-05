export function formatTrainingDateTime(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTrainingDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Cardio library items use muscle_group "Cardio" and log duration instead of weight/reps. */
export function isCardioExercise(exerciseOrGroup) {
  const group =
    typeof exerciseOrGroup === "string"
      ? exerciseOrGroup
      : exerciseOrGroup?.muscle_group ?? exerciseOrGroup?.muscleGroup ?? "";
  return String(group).trim().toLowerCase() === "cardio";
}

export function epley1rm(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 100) / 100;
}

export function workoutVolume(workout) {
  let total = 0;
  for (const exercise of workout?.exercises ?? []) {
    if (isCardioExercise(exercise)) continue;
    for (const set of exercise.sets ?? []) {
      if (set.is_warmup || !set.completed_at) continue;
      const w = Number(set.weight);
      const r = Number(set.reps);
      if (Number.isFinite(w) && Number.isFinite(r)) total += w * r;
    }
  }
  return total;
}

export function workoutCardioMinutes(workout) {
  let total = 0;
  for (const exercise of workout?.exercises ?? []) {
    if (!isCardioExercise(exercise)) continue;
    for (const set of exercise.sets ?? []) {
      if (set.is_warmup || !set.completed_at) continue;
      const mins = Number(set.duration_mins);
      if (Number.isFinite(mins) && mins > 0) total += mins;
    }
  }
  return Math.round(total * 10) / 10;
}

export function REST_TIMER_KEY() {
  return "training.restSeconds";
}

export function getDefaultRestSeconds() {
  try {
    const raw = localStorage.getItem(REST_TIMER_KEY());
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) return value;
  } catch {
    /* ignore */
  }
  return 90;
}

export function setDefaultRestSeconds(seconds) {
  try {
    localStorage.setItem(REST_TIMER_KEY(), String(seconds));
  } catch {
    /* ignore */
  }
}

export function isWorkoutExerciseComplete(exercise) {
  const sets = exercise?.sets ?? [];
  return sets.length > 0 && sets.every((setRow) => Boolean(setRow.completed_at));
}

/** First incomplete set in workout order (skips empty exercises). */
export function findNextWorkoutUp(workout) {
  for (const exercise of workout?.exercises ?? []) {
    const cardio = isCardioExercise(exercise);
    for (const setRow of exercise.sets ?? []) {
      if (setRow.completed_at) continue;
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.exercise_name || "Exercise",
        setId: setRow.id,
        setIndex: setRow.set_index,
        cardio,
        label: cardio
          ? `${exercise.exercise_name || "Exercise"} · Interval ${setRow.set_index}`
          : `${exercise.exercise_name || "Exercise"} · Set ${setRow.set_index}`,
      };
    }
  }
  return null;
}
