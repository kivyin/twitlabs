import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runZeroBoot } from "../../api/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import { invalidateForeignKeyLabelCache } from "../../utils/foreignKeyLabelCache";

function AdminZeroBootPage() {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const canConfirm = confirmText.trim().toUpperCase() === "ZERO";

  const handleRun = async () => {
    setRunning(true);
    setError("");
    setStatus("");
    setResult(null);

    try {
      const payload = await runZeroBoot({ confirm: "ZERO" });
      invalidateForeignKeyLabelCache();
      setShowConfirm(false);
      setConfirmText("");
      setResult(payload);
      setStatus(
        `Zero boot complete. Preserved root user "${payload.preserved_user?.username ?? "admin"}".`
      );
    } catch (runError) {
      setError(runError.message);
      setShowConfirm(false);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>Zero Boot</h2>
      </div>

      <p className="subtext">
        Factory-reset the database to an out-of-box state. This permanently clears user-entered
        records while keeping the root administrator and base configuration.
      </p>

      <section className="panel inset-panel zero-boot-panel">
        <h3>What will be removed</h3>
        <ul className="doc-bullets">
          <li>All accounts, transactions, budgets, payees, goals, recurring bills, and attachments</li>
          <li>All tasks, projects, tags, notes, notebooks, and decision picker lists</li>
          <li>Custom dashboards and custom SQL reports</li>
          <li>Favorites, column preferences, deleted-record archives, and error logs</li>
          <li>Every user except the root <code>admin</code> account</li>
        </ul>

        <h3>What will be kept / restored</h3>
        <ul className="doc-bullets">
          <li>Root administrator user and system-admin access</li>
          <li>Out-of-box applications (Budget, Tasks, Notes, Decision Picker)</li>
          <li>Default account types and default income/expense categories</li>
          <li>Dictionary metadata and standard Administration / app navigation</li>
          <li>Built-in reports (they ship with the app, not as database rows)</li>
        </ul>

        <label>
          Type <strong>ZERO</strong> to enable the reset
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="ZERO"
            autoComplete="off"
            disabled={running}
          />
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="danger-button"
            disabled={!canConfirm || running}
            onClick={() => setShowConfirm(true)}
          >
            {running ? "Running zero boot..." : "Run zero boot"}
          </button>
          {result && (
            <button type="button" onClick={() => navigate("/", { replace: true })}>
              Go to workspace home
            </button>
          )}
        </div>
      </section>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <section className="panel inset-panel">
          <h3>Reset summary</h3>
          <p className="subtext">
            Cleared {result.cleared_tables?.length ?? 0} tables. Removed{" "}
            {result.removed_attachment_dirs ?? 0} attachment folder(s) and{" "}
            {result.removed_account_images ?? 0} account image file(s).
          </p>
        </section>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Run zero boot?"
          message="This cannot be undone. All user-entered data will be permanently deleted. The root admin user and out-of-box configuration will remain."
          confirmLabel={running ? "Resetting..." : "Confirm zero boot"}
          onCancel={() => !running && setShowConfirm(false)}
          onConfirm={handleRun}
        />
      )}
    </div>
  );
}

export default AdminZeroBootPage;
