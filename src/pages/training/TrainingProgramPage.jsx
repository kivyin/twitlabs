import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteTrainingProgram,
  getTrainingProgram,
  rescheduleTrainingRoutine,
  startTrainingWorkout,
  updateTrainingProgram,
} from "../../api/trainingApi";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { isCardioExercise } from "../../utils/trainingUtils";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";

function formatExerciseTarget(item) {
  const cardio = isCardioExercise(item);
  if (cardio || item.target_duration_mins) {
    return `${item.target_sets || 1} rounds × ${item.target_duration_mins || "—"} min`;
  }
  const weight =
    item.target_weight != null && item.target_weight !== ""
      ? ` @ ${item.target_weight}`
      : "";
  return `${item.target_sets || "—"} × ${item.target_reps || "—"}${weight}`;
}

function TrainingProgramPage() {
  const appName = "training";
  const { programId } = useParams();
  const navigate = useNavigate();
  const { athleteUserId } = useTrainingAthlete();
  const { confirm, confirmModal } = useConfirmDialog();
  const [program, setProgram] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [reschedulingId, setReschedulingId] = useState(null);
  const [dateDrafts, setDateDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getTrainingProgram(programId, athleteUserId);
      setProgram(result.program);
      setNameDraft(result.program?.name || "");
      const drafts = {};
      for (const day of result.program?.days || []) {
        if (day.scheduled_on) drafts[day.id] = day.scheduled_on;
      }
      setDateDrafts(drafts);
      const firstTrain = (result.program?.days || []).find((day) => !day.is_rest);
      setPreviewId((current) => current ?? firstTrain?.id ?? null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [programId, athleteUserId]);

  const daysByWeek = useMemo(() => {
    const map = new Map();
    for (const day of program?.days || []) {
      const week = day.plan_week || 0;
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(day);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [program]);

  const previewDay = useMemo(
    () => (program?.days || []).find((day) => day.id === previewId) || null,
    [program, previewId]
  );

  const handleRename = async (event) => {
    event.preventDefault();
    if (!program) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const result = await updateTrainingProgram(
        program.id,
        { name: nameDraft },
        athleteUserId
      );
      setProgram(result.program);
      setStatus("Program name saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (routineId) => {
    if (!routineId) return;
    setStartingId(routineId);
    setError("");
    try {
      await startTrainingWorkout({ routine_id: routineId }, athleteUserId);
      navigate(`/app/${appName}/workout`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setStartingId(null);
    }
  };

  const handleReschedule = async (day) => {
    const nextDate = dateDrafts[day.id] || day.scheduled_on;
    if (!nextDate || nextDate === day.scheduled_on) return;
    const ok = await confirm({
      title: "Move this day?",
      message: `Set “${day.session_name || day.name}” to ${nextDate} and shift every day after it by the same amount. Earlier days stay put. Calendar events update too.`,
      confirmLabel: "Reschedule",
    });
    if (!ok) {
      setDateDrafts((prev) => ({ ...prev, [day.id]: day.scheduled_on }));
      return;
    }
    setReschedulingId(day.id);
    setError("");
    setStatus("");
    try {
      const result = await rescheduleTrainingRoutine(
        day.id,
        { scheduled_on: nextDate, shift_following: true },
        athleteUserId
      );
      setProgram(result.program);
      const drafts = {};
      for (const entry of result.program?.days || []) {
        if (entry.scheduled_on) drafts[entry.id] = entry.scheduled_on;
      }
      setDateDrafts(drafts);
      setStatus(`Schedule updated from ${day.scheduled_on} → ${nextDate}. Later days shifted.`);
    } catch (rescheduleError) {
      setError(rescheduleError.message);
      setDateDrafts((prev) => ({ ...prev, [day.id]: day.scheduled_on }));
    } finally {
      setReschedulingId(null);
    }
  };

  const handleDelete = async () => {
    if (!program) return;
    const ok = await confirm({
      title: "Delete program?",
      message: `This removes “${program.name}”, all scheduled days, and linked calendar events.`,
      confirmLabel: "Delete program",
    });
    if (!ok) return;
    try {
      await deleteTrainingProgram(program.id, athleteUserId);
      navigate(`/app/${appName}/routines`);
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
          { label: "Routines", to: `/app/${appName}/routines` },
          { label: program?.name || "Program" },
        ]}
        title={program?.name || "Program"}
        subtitle="Days ordered by schedule. Preview today’s work without starting a session."
        actions={
          <button type="button" className="danger-button" onClick={handleDelete}>
            Delete program
          </button>
        }
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}
      {status && <p className="subtext">{status}</p>}
      {loading && <p className="subtext">Loading program…</p>}

      {program && (
        <>
          <section className="panel">
            <form className="training-program-rename" onSubmit={handleRename}>
              <label>
                Program name
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={120}
                />
              </label>
              <button type="submit" className="button" disabled={saving || !nameDraft.trim()}>
                {saving ? "Saving…" : "Save name"}
              </button>
            </form>
            <p className="subtext">
              {program.start_date || "—"} → {program.last_date || program.days?.at?.(-1)?.scheduled_on || "—"}
              {" · "}
              {program.days_per_week || "—"} days/week
              {" · "}
              {program.training_day_count || 0} training days
            </p>
            {Array.isArray(program.goals) && program.goals.length > 0 && (
              <ul className="training-goal-list">
                {program.goals.map((goal, index) => (
                  <li key={`goal-${index}`}>{goal}</li>
                ))}
              </ul>
            )}
            {program.progression_summary && (
              <p className="training-progression-callout">
                <strong>Progression:</strong> {program.progression_summary}
              </p>
            )}
            {program.notes && <p className="subtext">{program.notes}</p>}
          </section>

          <div className="training-program-layout">
            <section className="panel">
              <h2>Schedule</h2>
              <p className="subtext">
                Change any date to move that day; every day after it shifts by the same amount.
              </p>
              <div className="training-plan-weeks">
                {daysByWeek.map(([week, days]) => (
                  <section key={`week-${week}`} className="training-plan-week">
                    <h3>Week {week || "?"}</h3>
                    <ul className="training-list">
                      {days.map((day) => {
                        const draft = dateDrafts[day.id] || day.scheduled_on || "";
                        const dirty = Boolean(day.scheduled_on && draft !== day.scheduled_on);
                        return (
                          <li
                            key={day.id}
                            className={`training-list-row training-schedule-row${
                              previewId === day.id ? " is-selected" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="training-day-select"
                              onClick={() => setPreviewId(day.id)}
                            >
                              <strong>
                                {day.day_label || ""}
                                {day.session_name ? ` · ${day.session_name}` : ""}
                              </strong>
                              <span className="stat-meta">
                                {day.is_rest
                                  ? "Rest / recovery"
                                  : `${day.exercise_count || day.exercises?.length || 0} exercises`}
                                {day.progression_notes ? ` · ${day.progression_notes}` : ""}
                              </span>
                            </button>
                            <div className="training-schedule-date">
                              <label className="training-date-field">
                                <span className="sr-only">Date</span>
                                <input
                                  type="date"
                                  value={draft}
                                  disabled={Boolean(reschedulingId)}
                                  onChange={(event) =>
                                    setDateDrafts((prev) => ({
                                      ...prev,
                                      [day.id]: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                className="button"
                                disabled={!dirty || Boolean(reschedulingId)}
                                onClick={() => handleReschedule(day)}
                              >
                                {reschedulingId === day.id ? "Saving…" : "Apply"}
                              </button>
                            </div>
                            {!day.is_rest ? (
                              <div className="training-row-actions">
                                <button
                                  type="button"
                                  className="button"
                                  onClick={() => setPreviewId(day.id)}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="button-primary"
                                  disabled={Boolean(startingId)}
                                  onClick={() => handleStart(day.id)}
                                >
                                  {startingId === day.id ? "Starting…" : "Start"}
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Day preview</h2>
              {!previewDay ? (
                <p className="subtext">Select a day to preview exercises without starting.</p>
              ) : (
                <div>
                  <h3>
                    {previewDay.scheduled_on} · {previewDay.session_name || previewDay.name}
                  </h3>
                  <div className="training-schedule-date training-schedule-date--preview">
                    <label className="training-date-field">
                      Date
                      <input
                        type="date"
                        value={dateDrafts[previewDay.id] || previewDay.scheduled_on || ""}
                        disabled={Boolean(reschedulingId)}
                        onChange={(event) =>
                          setDateDrafts((prev) => ({
                            ...prev,
                            [previewDay.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="button"
                      disabled={
                        Boolean(reschedulingId) ||
                        !previewDay.scheduled_on ||
                        (dateDrafts[previewDay.id] || previewDay.scheduled_on) ===
                          previewDay.scheduled_on
                      }
                      onClick={() => handleReschedule(previewDay)}
                    >
                      {reschedulingId === previewDay.id ? "Saving…" : "Apply + shift later days"}
                    </button>
                  </div>
                  {previewDay.is_rest ? (
                    <p className="subtext">
                      {previewDay.progression_notes || "Rest day — recover and stay mobile."}
                    </p>
                  ) : (
                    <>
                      {previewDay.progression_notes && (
                        <p className="training-progression-callout">{previewDay.progression_notes}</p>
                      )}
                      <ul className="training-list">
                        {(previewDay.exercises || []).map((item) => (
                          <li
                            key={item.id || `${item.exercise_id}-${item.sort_order}`}
                            className="training-list-row"
                          >
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
                          disabled={Boolean(startingId)}
                          onClick={() => handleStart(previewDay.id)}
                        >
                          {startingId === previewDay.id ? "Starting…" : "Start this day"}
                        </button>
                        <Link className="button" to={`/app/${appName}/routines/${previewDay.id}`}>
                          Edit day
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </>
      )}
      {confirmModal}
    </>
  );
}

export default TrainingProgramPage;
