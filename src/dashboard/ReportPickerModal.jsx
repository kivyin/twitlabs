import { buildReportKey, getBuiltinReports } from "./reportRegistry";

function ReportPickerModal({
  application,
  layout,
  customReports,
  onClose,
  onAdd,
  onBuildCustom,
}) {
  const activeKeys = new Set(layout.map((item) => item.key));
  const availableBuiltin = getBuiltinReports(application, { dashboardOnly: true }).filter(
    (report) => !activeKeys.has(buildReportKey("builtin", report.id))
  );
  const availableCustom = customReports.filter(
    (report) => !activeKeys.has(buildReportKey("custom", report.id))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card dashboard-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Add report</h2>
        <p>Choose a built-in report or one you created with SQL.</p>

        <div className="report-picker-section">
          <h3>Built-in reports</h3>
          {availableBuiltin.length === 0 ? (
            <p className="subtext">All built-in reports are already on your dashboard.</p>
          ) : (
            <ul className="report-picker-list">
              {availableBuiltin.map((report) => (
                <li key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
                    <span>{report.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(buildReportKey("builtin", report.id), report.defaultSpan)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="report-picker-section">
          <div className="report-picker-section-head">
            <h3>Custom reports</h3>
            <button type="button" className="linkish-button" onClick={onBuildCustom}>
              Build new report
            </button>
          </div>
          {availableCustom.length === 0 ? (
            <p className="subtext">No saved custom reports yet.</p>
          ) : (
            <ul className="report-picker-list">
              {availableCustom.map((report) => (
                <li key={report.id}>
                  <div>
                    <strong>{report.name}</strong>
                    <span>{report.description || report.widget_kind}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(buildReportKey("custom", report.id), 2)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportPickerModal;
