import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { scanReceipt } from "../api/budgetApi";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function ReceiptScanModal({ onClose, appName = "budget" }) {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [fileName, setFileName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    setPreviewUrl("");
    setImageBase64("");
    setMimeType("");
    setFileName("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose a receipt photo (JPEG, PNG, WebP, or GIF).");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviewUrl(dataUrl);
      setImageBase64(dataUrl);
      setMimeType(file.type || "image/jpeg");
      setFileName(file.name);
    } catch (readError) {
      setError(readError.message);
    }
  };

  const handleScan = async () => {
    if (!imageBase64) {
      setError("Choose a receipt photo first.");
      return;
    }

    setScanning(true);
    setError("");

    try {
      const result = await scanReceipt({ imageBase64, mimeType });
      const draft = result.draft;
      if (!draft) {
        throw new Error("No receipt data returned.");
      }

      onClose?.();
      navigate(`/app/${appName}/transactions/new`, {
        state: {
          receiptDraft: draft,
          receiptImage: {
            imageBase64,
            mimeType,
            fileName: fileName || "receipt.jpg",
          },
        },
      });
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel import-modal receipt-scan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-receipt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="scan-receipt-title">Scan receipt</h2>
        <p className="subtext">
          Upload a receipt photo. We&apos;ll extract the total, date, and merchant, then open a new
          transaction for you to pick an account and confirm.
        </p>
        <p className="subtext">
          Requires <code>GEMINI_API_KEY</code> in your server <code>.env</code>.
        </p>

        <label>
          Receipt photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={scanning}
          />
        </label>

        {fileName && <p className="subtext">{fileName}</p>}

        {previewUrl && (
          <div className="receipt-scan-preview">
            <img src={previewUrl} alt="Receipt preview" />
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            className="button-primary"
            onClick={handleScan}
            disabled={scanning || !imageBase64}
          >
            {scanning ? "Scanning..." : "Scan and continue"}
          </button>
          <button type="button" onClick={onClose} disabled={scanning}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptScanModal;
