import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  generateTrainingAiHiit,
  generateTrainingAiRoutine,
  getTrainingAiGoals,
  saveTrainingAiGoals,
  startTrainingAiHiit,
  startTrainingWorkout,
} from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { isCardioExercise } from "../../utils/trainingUtils";

const emptyGoals = () => ["", "", ""];

function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function TrainingCoachPage() {
  const appName = "training";
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const [goals, setGoals] = useState(emptyGoals);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [weekCount, setWeekCount] = useState(6);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [generatingRoutine, setGeneratingRoutine] = useState(false);
  const [generatingHiit, setGeneratingHiit] = useState(false);
  const [startingHiit, setStartingHiit] = useState(false);
  const [lastPlan, setLastPlan] = useState(null);
  const [lastProgramId, setLastProgramId] = useState(null);
  const [hiitPreview, setHiitPreview] = useState(null);
  const [startingRoutineId, setStartingRoutineId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingGoals(true);
    setError("");
    getTrainingAiGoals(athleteUserId)
      .then((result) => {
        if (!active) return;
        const next = Array.isArray(result.goals) ? result.goals : emptyGoals();
        setGoals([next[0] || "", next[1] || "", next[2] || ""]);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoadingGoals(false);
      });
    return () => {
      active = false;
    };
  }, [athleteUserId]);

  const updateGoal = (index, value) => {
    setGoals((prev) => prev.map((goal, i) => (i === index ? value : goal)));
  };

  const goalsReady = goals.every((goal) => String(goal || "").trim());

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    setError("");
    setStatus("");
    try {
      const result = await saveTrainingAiGoals(goals, athleteUserId);
      setGoals([
        result.goals?.[0] || "",
        result.goals?.[1] || "",
        result.goals?.[2] || "",
      ]);
      setStatus("Goals saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleGenerateRoutine = async () => {
    if (!goalsReady) {
      setError("Fill in all three goals before generating a plan.");
      return;
    }
    setGeneratingRoutine(true);
    setError("");
    setStatus("");
    try {
      const result = await generateTrainingAiRoutine(goals, athleteUserId, {
        daysPerWeek,
        weekCount,
        startDate: localToday(),
      });
      setLastPlan(result.plan);
      setLastProgramId(result.program?.id || result.plan?.id || null);
      const events = result.plan?.calendar_events_created ?? 0;
      setStatus(
        [
          `Program “${result.plan?.name || "Coach plan"}” created from ${result.plan?.start_date}.`,
          `${result.plan?.week_count || 0} weeks · ${result.plan?.training_day_count || 0} training days.`,
          events ? `${events} calendar events scheduled.` : "",
          result.skipped?.length ? `Skipped: ${result.skipped.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch (genError) {
      setError(genError.message);
    } finally {
      setGeneratingRoutine(false);
    }
  };

  const handleStartRoutine = async (routineId) => {
    if (!routineId) return;
    setStartingRoutineId(routineId);
    setError("");
    try {
      await startTrainingWorkout({ routine_id: routineId }, athleteUserId);
      navigate(`/app/${appName}/workout`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setStartingRoutineId(null);
    }
  };

  const handleGenerateHiit = async () => {
    setGeneratingHiit(true);
    setError("");
    setStatus("");
    try {
      const result = await generateTrainingAiHiit(athleteUserId);
      setHiitPreview(result.preview);
      setStatus(
        result.skipped?.length
          ? `WOD ready. Skipped unknown exercises: ${result.skipped.join(", ")}`
          : "WOD ready — preview below, then Start when you like it."
      );
    } catch (hiitError) {
      setError(hiitError.message);
    } finally {
      setGeneratingHiit(false);
    }
  };

  const handleStartHiit = async () => {
    if (!hiitPreview) return;
    setStartingHiit(true);
    setError("");
    try {
      await startTrainingAiHiit(hiitPreview, athleteUserId);
      navigate(`/app/${appName}/workout`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setStartingHiit(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "AI Coach" },
        ]}
        title="AI Exercise Coach"
        subtitle="Goal-driven programming with dated sessions, progressions, and calendar scheduling."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}
      {status && <p className="subtext">{status}</p>}
      {loadingGoals && <p className="subtext">Loading goals…</p>}

      <section className="panel">
        <h2>Your goals</h2>
        <p className="subtext">
          Tell the coach what you want. Example: stronger bench, lose fat, train 4 days a week starting now.
        </p>
        <div className="form form-shell">
          <div className="form-grid">
            {goals.map((goal, index) => (
              <label key={`goal-${index}`} className="form-field-full">
                Goal {index + 1}
                <input
                  value={goal}
                  onChange={(event) => updateGoal(index, event.target.value)}
                  placeholder={`Goal ${index + 1}`}
                  disabled={loadingGoals || generatingRoutine}
                />
              </label>
            ))}
            <label>
              Days / week
              <select
                value={daysPerWeek}
                onChange={(event) => setDaysPerWeek(Number(event.target.value))}
                disabled={generatingRoutine}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </label>
            <label>
              Block length
              <select
                value={weekCount}
                onChange={(event) => setWeekCount(Number(event.target.value))}
                disabled={generatingRoutine}
              >
                {[4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} weeks
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="subtext">
            Schedule starts <strong>today ({localToday()})</strong>. Training days fill the start of each week
            window; rest days fill the remainder. Sessions are added to Calendar.
          </p>
          <div className="training-actions-row">
            <button
              type="button"
              className="button"
              disabled={savingGoals || loadingGoals}
              onClick={handleSaveGoals}
            >
              {savingGoals ? "Saving…" : "Save goals"}
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={!goalsReady || generatingRoutine || loadingGoals}
              onClick={handleGenerateRoutine}
            >
              {generatingRoutine ? "Coaching your plan…" : "Generate coached program"}
            </button>
          </div>
          {generatingRoutine && (
            <p className="subtext">
              Building a progressive, dated program and writing calendar events — this can take a minute.
            </p>
          )}
        </div>
      </section>

      {lastPlan && (
        <section className="panel">
          <h2>Latest coached program</h2>
          <p>
            <strong>{lastPlan.name}</strong>
          </p>
          <p className="subtext">
            Starts {lastPlan.start_date} · {lastPlan.days_per_week} days/week · {lastPlan.week_count} weeks ·{" "}
            {lastPlan.training_day_count} training days
            {lastPlan.calendar_events_created
              ? ` · ${lastPlan.calendar_events_created} calendar events`
              : ""}
          </p>
          {lastPlan.progression_summary && (
            <p className="training-progression-callout">
              <strong>Progression:</strong> {lastPlan.progression_summary}
            </p>
          )}
          {lastPlan.notes && <p className="subtext">{lastPlan.notes}</p>}

          <div className="training-plan-weeks">
            {(lastPlan.weeks ?? []).map((week) => (
              <section key={`week-${week.week}`} className="training-plan-week">
                <h3>
                  Week {week.week}
                  {week.focus ? ` — ${week.focus}` : ""}
                </h3>
                {week.progression && <p className="subtext">{week.progression}</p>}
                <ul className="training-list">
                  {(week.days ?? []).map((day, dayIndex) => (
                    <li
                      key={`${week.week}-${day.scheduled_on || day.day_label}-${dayIndex}`}
                      className="training-list-row"
                    >
                      <div>
                        <strong>
                          {day.scheduled_on || day.day_label}
                          {day.session_name ? ` · ${day.session_name}` : ""}
                        </strong>
                        <span className="stat-meta">
                          {day.is_rest
                            ? "Rest / recovery"
                            : `${day.exercise_count} exercises`}
                          {day.progression_notes ? ` · ${day.progression_notes}` : ""}
                        </span>
                      </div>
                      {!day.is_rest && day.routine_id ? (
                        <div className="training-row-actions">
                          <Link
                            className="button"
                            to={
                              lastProgramId
                                ? `/app/${appName}/programs/${lastProgramId}`
                                : `/app/${appName}/routines/${day.routine_id}`
                            }
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="button-primary"
                            disabled={Boolean(startingRoutineId)}
                            onClick={() => handleStartRoutine(day.routine_id)}
                          >
                            {startingRoutineId === day.routine_id ? "Starting…" : "Start"}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="training-actions-row">
            {lastProgramId ? (
              <Link className="button-primary" to={`/app/${appName}/programs/${lastProgramId}`}>
                Open program
              </Link>
            ) : null}
            <Link className="button" to={`/app/${appName}/routines`}>
              Open routines / programs
            </Link>
            <button
              type="button"
              className="button"
              disabled={!goalsReady || generatingRoutine}
              onClick={handleGenerateRoutine}
            >
              Generate again
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Daily HIIT</h2>
        <p className="subtext">
          Generate a CrossFit-style WOD, preview it, regenerate until you like it, then start.
        </p>
        <div className="training-actions-row">
          <button
            type="button"
            className="button-primary"
            disabled={generatingHiit || startingHiit}
            onClick={handleGenerateHiit}
          >
            {generatingHiit
              ? "Building WOD…"
              : hiitPreview
                ? "Regenerate WOD"
                : "Generate Daily HIIT / WOD"}
          </button>
          {hiitPreview ? (
            <button
              type="button"
              className="button"
              disabled={generatingHiit}
              onClick={() => setHiitPreview(null)}
            >
              Clear preview
            </button>
          ) : null}
        </div>

        {hiitPreview && (
          <div className="training-hiit-preview">
            <h3>{hiitPreview.name}</h3>
            {hiitPreview.notes && <p className="subtext">{hiitPreview.notes}</p>}
            <ul className="training-list">
              {(hiitPreview.exercises ?? []).map((item, index) => {
                const cardio = isCardioExercise(item);
                return (
                  <li
                    key={`${item.exercise_id}-${index}`}
                    className="training-list-row"
                  >
                    <div>
                      <strong>{item.exercise_name || `Exercise #${item.exercise_id}`}</strong>
                      <span className="stat-meta">
                        {cardio || item.target_duration_mins
                          ? `${item.target_sets || 1} rounds × ${item.target_duration_mins || "—"} min`
                          : `${item.target_sets || "—"} sets × ${item.target_reps || "—"} reps`}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="training-actions-row">
              <button
                type="button"
                className="button-primary"
                disabled={startingHiit || generatingHiit}
                onClick={handleStartHiit}
              >
                {startingHiit ? "Starting…" : "Start this WOD"}
              </button>
              <button
                type="button"
                className="button"
                disabled={generatingHiit || startingHiit}
                onClick={handleGenerateHiit}
              >
                {generatingHiit ? "Building…" : "Regenerate"}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default TrainingCoachPage;
