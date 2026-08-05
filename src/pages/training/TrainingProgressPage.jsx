import { useEffect, useMemo, useState } from "react";
import { getTrainingProgress } from "../../api/trainingApi";
import EChart from "../../components/EChart";
import PageHeader from "../../components/PageHeader";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { formatTrainingDateTime } from "../../utils/trainingUtils";
import {
  buildCardioDurationOption,
  buildE1rmTrendOption,
  buildMuscleVolumeOption,
  buildTopE1rmOption,
  buildVolumeTrendOption,
  buildWeeklyCardioOption,
  buildWeeklyVolumeOption,
  formatTrainingChartNumber,
} from "../../utils/trainingCharts";
import { isCardioExercise } from "../../utils/trainingUtils";

function TrainingProgressPage() {
  const appName = "training";
  const { athleteUserId } = useTrainingAthlete();
  const [progress, setProgress] = useState({
    exercises: [],
    recent_prs: [],
    weekly_volume: [],
    weekly_cardio_mins: [],
    muscle_volume: [],
    top_by_e1rm: [],
  });
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTrainingProgress(athleteUserId)
      .then((result) => {
        if (!active) return;
        setProgress(
          result.progress ?? {
            exercises: [],
            recent_prs: [],
            weekly_volume: [],
            weekly_cardio_mins: [],
            muscle_volume: [],
            top_by_e1rm: [],
          }
        );
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [athleteUserId]);

  const selected = useMemo(
    () =>
      (progress.exercises ?? []).find((item) => String(item.exercise_id) === String(selectedId)) ||
      progress.exercises?.[0] ||
      null,
    [progress.exercises, selectedId]
  );
  const selectedCardio = Boolean(selected && (selected.is_cardio || isCardioExercise(selected)));

  const e1rmOption = useMemo(
    () => (selected && !selectedCardio ? buildE1rmTrendOption(selected.points) : null),
    [selected, selectedCardio]
  );
  const volumeOption = useMemo(
    () => (selected && !selectedCardio ? buildVolumeTrendOption(selected.points) : null),
    [selected, selectedCardio]
  );
  const cardioDurationOption = useMemo(
    () => (selected && selectedCardio ? buildCardioDurationOption(selected.points) : null),
    [selected, selectedCardio]
  );
  const weeklyOption = useMemo(
    () => buildWeeklyVolumeOption(progress.weekly_volume ?? []),
    [progress.weekly_volume]
  );
  const weeklyCardioOption = useMemo(
    () => buildWeeklyCardioOption(progress.weekly_cardio_mins ?? []),
    [progress.weekly_cardio_mins]
  );
  const topOption = useMemo(
    () => buildTopE1rmOption(progress.top_by_e1rm ?? []),
    [progress.top_by_e1rm]
  );
  const muscleOption = useMemo(
    () => buildMuscleVolumeOption(progress.muscle_volume ?? []),
    [progress.muscle_volume]
  );

  const hasOverviewCharts = Boolean(
    weeklyOption || weeklyCardioOption || topOption || muscleOption
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "Progress" },
        ]}
        title="Progress"
        subtitle="Estimated 1RM (Epley), volume trends, and personal records."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Recent PRs</h2>
        {(progress.recent_prs ?? []).length === 0 ? (
          <p className="subtext">No completed working sets yet.</p>
        ) : (
          <ul className="training-list">
            {progress.recent_prs.map((pr) => (
              <li key={pr.exercise_id} className="training-list-row">
                <div>
                  <strong>{pr.exercise_name}</strong>
                  <span className="stat-meta">
                    {pr.is_cardio
                      ? `${pr.duration_mins} min${
                          pr.distance ? ` · ${pr.distance} dist` : ""
                        }`
                      : `${pr.weight} × ${pr.reps} · e1RM ${pr.e1rm}`}{" "}
                    · {formatTrainingDateTime(pr.last_performed_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasOverviewCharts && (
        <section className="panel">
          <h2>Overview</h2>
          <p className="subtext">Volume and strength across all completed working sets.</p>
          <div className="training-charts-grid">
            {weeklyOption && (
              <div className="training-chart-card">
                <h3>Weekly volume</h3>
                <EChart option={weeklyOption} height={260} />
              </div>
            )}
            {weeklyCardioOption && (
              <div className="training-chart-card">
                <h3>Weekly cardio (minutes)</h3>
                <EChart option={weeklyCardioOption} height={260} />
              </div>
            )}
            {topOption && (
              <div className="training-chart-card">
                <h3>Top lifts (best e1RM)</h3>
                <EChart option={topOption} height={260} />
              </div>
            )}
            {muscleOption && (
              <div className="training-chart-card training-chart-card-wide">
                <h3>Volume by muscle group</h3>
                <EChart option={muscleOption} height={280} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="training-toolbar">
          <label>
            Exercise
            <select
              value={selected ? String(selected.exercise_id) : ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {(progress.exercises ?? []).map((item) => (
                <option key={item.exercise_id} value={String(item.exercise_id)}>
                  {item.exercise_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selected ? (
          selectedCardio ? (
            <>
              <div className="tasks-summary-grid">
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Longest bout</span>
                  <strong>{formatTrainingChartNumber(selected.best_duration_mins)} min</strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Best distance</span>
                  <strong>
                    {selected.best_distance
                      ? formatTrainingChartNumber(selected.best_distance)
                      : "—"}
                  </strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Total minutes</span>
                  <strong>{formatTrainingChartNumber(selected.total_duration_mins)}</strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Total distance</span>
                  <strong>
                    {selected.total_distance
                      ? formatTrainingChartNumber(selected.total_distance)
                      : "—"}
                  </strong>
                </article>
              </div>
              <div className="training-charts-grid">
                <div className="training-chart-card training-chart-card-wide">
                  <h3>Duration trend</h3>
                  {cardioDurationOption ? (
                    <EChart option={cardioDurationOption} height={260} />
                  ) : (
                    <p className="subtext">Need a logged cardio interval for this chart.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="tasks-summary-grid">
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Best e1RM</span>
                  <strong>{formatTrainingChartNumber(selected.best_e1rm) || "—"}</strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Best set</span>
                  <strong>
                    {selected.best_weight} × {selected.best_reps}
                  </strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Best set volume</span>
                  <strong>{Math.round(selected.best_volume_set || 0)}</strong>
                </article>
                <article className="panel tasks-stat-card">
                  <span className="tasks-stat-label">Total volume</span>
                  <strong>{Math.round(selected.total_volume || 0)}</strong>
                </article>
              </div>

              <div className="training-charts-grid">
                <div className="training-chart-card">
                  <h3>Estimated 1RM trend</h3>
                  {e1rmOption ? (
                    <EChart option={e1rmOption} height={260} />
                  ) : (
                    <p className="subtext">Need a logged set for this chart.</p>
                  )}
                </div>
                <div className="training-chart-card">
                  <h3>Session volume</h3>
                  {volumeOption ? (
                    <EChart option={volumeOption} height={260} />
                  ) : (
                    <p className="subtext">Need a logged set for this chart.</p>
                  )}
                </div>
              </div>
            </>
          )
        ) : (
          <p className="subtext">Pick an exercise after you log workouts.</p>
        )}
      </section>
    </>
  );
}

export default TrainingProgressPage;
