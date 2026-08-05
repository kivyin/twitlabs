import { useEffect, useMemo, useState } from "react";
import {
  createTrainingMeasurement,
  deleteTrainingMeasurement,
  listTrainingMeasurements,
} from "../../api/trainingApi";
import EChart from "../../components/EChart";
import PageHeader from "../../components/PageHeader";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  TrainingAthleteSwitcher,
  useTrainingAthlete,
} from "./TrainingAthleteContext";
import { formatTrainingDate } from "../../utils/trainingUtils";
import { buildBodyWeightOption } from "../../utils/trainingCharts";

const emptyForm = () => ({
  measured_on: new Date().toISOString().slice(0, 10),
  body_weight: "",
  waist: "",
  chest: "",
  arms: "",
  hips: "",
  thighs: "",
  notes: "",
});

function TrainingMeasurementsPage() {
  const appName = "training";
  const { athleteUserId } = useTrainingAthlete();
  const { confirm, confirmModal } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const result = await listTrainingMeasurements(athleteUserId);
      setRows(result.measurements ?? []);
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
      await createTrainingMeasurement(form, athleteUserId);
      setForm(emptyForm());
      await load();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: "Delete measurement?",
      message: `Remove the measurement from ${formatTrainingDate(row.measured_on)}?`,
      confirmLabel: "Delete measurement",
    });
    if (!ok) return;
    try {
      await deleteTrainingMeasurement(row.id, athleteUserId);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const weightPoints = rows
    .filter((row) => row.body_weight != null)
    .slice()
    .reverse();

  const bodyWeightOption = useMemo(() => buildBodyWeightOption(weightPoints), [weightPoints]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Training", to: `/app/${appName}` },
          { label: "Measurements" },
        ]}
        title="Body measurements"
        subtitle="Track body weight and optional tape measures over time."
        footer={<TrainingAthleteSwitcher />}
      />

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <form className="form form-shell" onSubmit={handleSubmit}>
          <h2>Log measurement</h2>
          <div className="form-grid two-col">
            <label>
              Date
              <input
                type="date"
                value={form.measured_on}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, measured_on: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Body weight
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.body_weight}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, body_weight: event.target.value }))
                }
              />
            </label>
            <label>
              Waist
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.waist}
                onChange={(event) => setForm((prev) => ({ ...prev, waist: event.target.value }))}
              />
            </label>
            <label>
              Chest
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.chest}
                onChange={(event) => setForm((prev) => ({ ...prev, chest: event.target.value }))}
              />
            </label>
            <label>
              Arms
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.arms}
                onChange={(event) => setForm((prev) => ({ ...prev, arms: event.target.value }))}
              />
            </label>
            <label>
              Hips
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.hips}
                onChange={(event) => setForm((prev) => ({ ...prev, hips: event.target.value }))}
              />
            </label>
            <label>
              Thighs
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.thighs}
                onChange={(event) => setForm((prev) => ({ ...prev, thighs: event.target.value }))}
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
          <button type="submit" className="button-primary">
            Save measurement
          </button>
        </form>
      </section>

      {bodyWeightOption && (
        <section className="panel">
          <h2>Body weight trend</h2>
          <p className="subtext">Logged weight over time.</p>
          <EChart option={bodyWeightOption} height={280} />
        </section>
      )}

      <section className="panel">
        <h2>History</h2>
        {rows.length === 0 ? (
          <p className="subtext">No measurements yet.</p>
        ) : (
          <ul className="training-list">
            {rows.map((row) => (
              <li key={row.id} className="training-list-row">
                <div>
                  <strong>{formatTrainingDate(row.measured_on)}</strong>
                  <span className="stat-meta">
                    {[
                      row.body_weight != null ? `Wt ${row.body_weight}` : null,
                      row.waist != null ? `Waist ${row.waist}` : null,
                      row.chest != null ? `Chest ${row.chest}` : null,
                      row.arms != null ? `Arms ${row.arms}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleDelete(row)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {confirmModal}
    </>
  );
}

export default TrainingMeasurementsPage;
