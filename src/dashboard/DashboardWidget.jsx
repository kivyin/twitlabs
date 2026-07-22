function WidgetActionIcon({ path }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

function DashboardWidget({
  title,
  description,
  span = 1,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onToggleSpan,
  onEdit,
  children,
}) {
  return (
    <article className={`dashboard-widget dashboard-widget-span-${span}`}>
      <header className="dashboard-widget-header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className="dashboard-widget-actions">
          {onMoveLeft && (
            <button
              type="button"
              className="dashboard-widget-action"
              aria-label={`Move ${title} earlier`}
              title="Move earlier"
              onClick={onMoveLeft}
            >
              <WidgetActionIcon path={<path d="M15 18 9 12l6-6" />} />
            </button>
          )}
          {onMoveRight && (
            <button
              type="button"
              className="dashboard-widget-action"
              aria-label={`Move ${title} later`}
              title="Move later"
              onClick={onMoveRight}
            >
              <WidgetActionIcon path={<path d="m9 18 6-6-6-6" />} />
            </button>
          )}
          {onToggleSpan && (
            <button
              type="button"
              className="dashboard-widget-action"
              aria-label={
                span >= 3 ? `Narrow ${title}` : span === 2 ? `Widen ${title} to full` : `Widen ${title}`
              }
              title={span >= 3 ? "Narrower width" : span === 2 ? "Full width" : "Wider"}
              onClick={onToggleSpan}
            >
              <WidgetActionIcon
                path={
                  span >= 3 ? (
                    <>
                      <path d="M8 3v18" />
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </>
                  ) : (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 9h6v6H9z" />
                    </>
                  )
                }
              />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="dashboard-widget-action"
              aria-label={`Edit ${title}`}
              title="Edit report"
              onClick={onEdit}
            >
              <WidgetActionIcon
                path={<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />}
              />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="dashboard-widget-remove"
              aria-label={`Remove ${title} from dashboard`}
              title="Remove from dashboard"
              onClick={onRemove}
            >
              <WidgetActionIcon path={<path d="M18 6 6 18M6 6l12 12" />} />
            </button>
          )}
        </div>
      </header>
      <div className="dashboard-widget-body">{children}</div>
    </article>
  );
}

export default DashboardWidget;
