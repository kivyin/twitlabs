import { apiRequest } from "./http";

function withAthlete(path, athleteUserId) {
  if (athleteUserId == null || athleteUserId === "") return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}user_id=${encodeURIComponent(athleteUserId)}`;
}

function withAthleteBody(data = {}, athleteUserId) {
  if (athleteUserId == null || athleteUserId === "") return data;
  return { ...data, user_id: Number(athleteUserId) };
}

export function getTrainingAthletes() {
  return apiRequest("/api/training/athletes");
}

export function getTrainingSummary(athleteUserId) {
  return apiRequest(withAthlete("/api/training/summary", athleteUserId));
}

export function listTrainingExercises(athleteUserId, q = "") {
  const base = q ? `/api/training/exercises?q=${encodeURIComponent(q)}` : "/api/training/exercises";
  return apiRequest(withAthlete(base, athleteUserId));
}

export function createTrainingExercise(data, athleteUserId) {
  return apiRequest("/api/training/exercises", {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingExercise(exerciseId, data, athleteUserId) {
  return apiRequest(`/api/training/exercises/${exerciseId}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function deleteTrainingExercise(exerciseId, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/exercises/${exerciseId}`, athleteUserId), {
    method: "DELETE",
  });
}

export function getExercisePreviousSets(exerciseId, athleteUserId) {
  return apiRequest(
    withAthlete(`/api/training/exercises/${exerciseId}/previous`, athleteUserId)
  );
}

export function listTrainingRoutines(athleteUserId) {
  return apiRequest(withAthlete("/api/training/routines", athleteUserId));
}

export function getTrainingRoutine(routineId, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/routines/${routineId}`, athleteUserId));
}

export function createTrainingRoutine(data, athleteUserId) {
  return apiRequest("/api/training/routines", {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingRoutine(routineId, data, athleteUserId) {
  return apiRequest(`/api/training/routines/${routineId}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function deleteTrainingRoutine(routineId, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/routines/${routineId}`, athleteUserId), {
    method: "DELETE",
  });
}

export function listTrainingWorkouts(athleteUserId, { status, limit } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return apiRequest(withAthlete(`/api/training/workouts${qs ? `?${qs}` : ""}`, athleteUserId));
}

export function getActiveTrainingWorkout(athleteUserId) {
  return apiRequest(withAthlete("/api/training/workouts/active", athleteUserId));
}

export function getTrainingWorkout(workoutId, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/workouts/${workoutId}`, athleteUserId));
}

export function startTrainingWorkout(data, athleteUserId) {
  return apiRequest("/api/training/workouts", {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingWorkout(workoutId, data, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function completeTrainingWorkout(workoutId, data, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}/complete`, {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data || {}, athleteUserId)),
  });
}

export function abandonTrainingWorkout(workoutId, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}/abandon`, {
    method: "POST",
    body: JSON.stringify(withAthleteBody({}, athleteUserId)),
  });
}

export function addTrainingWorkoutExercise(workoutId, data, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}/exercises`, {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingWorkoutExercise(workoutId, weId, data, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}/exercises/${weId}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function deleteTrainingWorkoutExercise(workoutId, weId, athleteUserId) {
  return apiRequest(
    withAthlete(`/api/training/workouts/${workoutId}/exercises/${weId}`, athleteUserId),
    { method: "DELETE" }
  );
}

export function addTrainingSet(workoutId, weId, data, athleteUserId) {
  return apiRequest(`/api/training/workouts/${workoutId}/exercises/${weId}/sets`, {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingSet(setId, data, athleteUserId) {
  return apiRequest(`/api/training/sets/${setId}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function deleteTrainingSet(setId, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/sets/${setId}`, athleteUserId), {
    method: "DELETE",
  });
}

export function getTrainingProgress(athleteUserId, exerciseId) {
  const base = exerciseId
    ? `/api/training/progress?exercise_id=${encodeURIComponent(exerciseId)}`
    : "/api/training/progress";
  return apiRequest(withAthlete(base, athleteUserId));
}

export function listTrainingMeasurements(athleteUserId) {
  return apiRequest(withAthlete("/api/training/measurements", athleteUserId));
}

export function createTrainingMeasurement(data, athleteUserId) {
  return apiRequest("/api/training/measurements", {
    method: "POST",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function updateTrainingMeasurement(id, data, athleteUserId) {
  return apiRequest(`/api/training/measurements/${id}`, {
    method: "PUT",
    body: JSON.stringify(withAthleteBody(data, athleteUserId)),
  });
}

export function deleteTrainingMeasurement(id, athleteUserId) {
  return apiRequest(withAthlete(`/api/training/measurements/${id}`, athleteUserId), {
    method: "DELETE",
  });
}

export function getTrainingAiGoals(athleteUserId) {
  return apiRequest(withAthlete("/api/training/ai/goals", athleteUserId));
}

export function saveTrainingAiGoals(goals, athleteUserId) {
  return apiRequest("/api/training/ai/goals", {
    method: "PUT",
    body: JSON.stringify(withAthleteBody({ goals }, athleteUserId)),
  });
}

export function generateTrainingAiRoutine(goals, athleteUserId) {
  return apiRequest("/api/training/ai/routine", {
    method: "POST",
    body: JSON.stringify(withAthleteBody({ goals }, athleteUserId)),
  });
}

export function generateTrainingAiHiit(athleteUserId) {
  return apiRequest("/api/training/ai/hiit", {
    method: "POST",
    body: JSON.stringify(withAthleteBody({}, athleteUserId)),
  });
}

export function startTrainingAiHiit(preview, athleteUserId) {
  return apiRequest("/api/training/ai/hiit/start", {
    method: "POST",
    body: JSON.stringify(withAthleteBody({ preview }, athleteUserId)),
  });
}
