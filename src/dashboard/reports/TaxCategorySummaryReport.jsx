import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTaxCategorySummary } from "../../api/budgetApi";
import ReportSkeleton from "../ReportSkeleton";
import { downloadCsv } from "../../utils/reportExport";
import { formatCurrency } from "../../utils/format";

function TaxCategorySummaryReport({ appName = "budget", fullPage = false }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getTaxCategorySummary(year);
        if (!active) return;
        setRows(result.rows ?? []);
        setGrandTotal(Number(result.grand_total) || 0);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [year]);

  const handleExport = () => {
    downloadCsv(rows, `tax-summary-${year}.csv`, [
      { key: "category_name", label: "category" },
      { key: "total", label: "total" },
    ]);
  };

  if (loading) return <ReportSkeleton lines={fullPage ? 8 : 5} />;
  if (error) return <p className="report-error">{error}</p>;

  return (
    <div className="tax-summary-report">
      <div className="report-toolbar">
        <label className="month-picker-label">
          Tax year
          <input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} />
        </label>
        {fullPage && rows.length > 0 && (
          <button type="button" className="button-small" onClick={handleExport}>
            Export CSV
          </button>
        )}
      </div>

      <p className="subtext">
        Totals include expense transactions in categories marked{" "}
        <strong>Tax Deductible</strong>.{" "}
        <Link to={`/app/${appName}/categories`}>Edit categories</Link>
      </p>

      {rows.length === 0 ? (
        <div className="report-empty">
          <p>No tax-deductible spending recorded for {year}.</p>
          <Link to={`/app/${appName}/categories`} className="report-empty-link">
            Mark categories as tax deductible
          </Link>
        </div>
      ) : (
        <>
          <p className="tax-summary-total">
            Total tax-deductible spending: <strong>{formatCurrency(grandTotal)}</strong>
          </p>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.category_id}>
                    <td>{row.category_name}</td>
                    <td>{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default TaxCategorySummaryReport;
