function ReportSkeleton({ lines = 3 }) {
  return (
    <div className="report-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="report-skeleton-line" />
      ))}
    </div>
  );
}

export default ReportSkeleton;
