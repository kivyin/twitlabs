import { useState } from "react";
import { importTransactionsCsv } from "../api/budgetApi";

function TransactionImportModal({ open, onClose, onImported }) {
  const [csvText, setCsvText] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  if (!open) {
    return null;
  }

  const handleImport = async () => {
    setImporting(true);
    setError("");
    setResult(null);

    try {
      const importResult = await importTransactionsCsv(csvText, skipDuplicates);
      setResult(importResult);
      if (importResult.created > 0) {
        onImported?.();
      }
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-transactions-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="import-transactions-title">Import transactions from CSV</h2>
        <p className="subtext">
          Expected columns: <code>date</code>, <code>account</code>, <code>amount</code>,{" "}
          <code>category</code>, plus optional <code>payee</code>, <code>description</code>,{" "}
          <code>cleared</code>.
        </p>

        <label>
          CSV content
          <textarea
            rows={12}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder={"date,account,category,amount,description,payee,cleared\n2026-07-01,Checking,Groceries,-45.20,Walmart,Walmart,0"}
          />
        </label>

        <label className="checkbox-field">
          <span className="checkbox-row">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(event) => setSkipDuplicates(event.target.checked)}
            />
            <span>Skip duplicates (same account, date, amount, and description)</span>
          </span>
        </label>

        {result && (
          <div className="import-result">
            <p className="status">
              Imported {result.created} transaction{result.created === 1 ? "" : "s"}
              {result.skipped ? `, skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}` : ""}.
            </p>
            {result.errors?.length > 0 && (
              <ul className="import-errors">
                {result.errors.map((entry) => (
                  <li key={`${entry.row}-${entry.error}`}>
                    Row {entry.row}: {entry.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="button-primary" onClick={handleImport} disabled={importing || !csvText.trim()}>
            {importing ? "Importing..." : "Import"}
          </button>
          <button type="button" onClick={onClose} disabled={importing}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionImportModal;
