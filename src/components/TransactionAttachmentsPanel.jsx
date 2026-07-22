import { useEffect, useState } from "react";
import { getToken } from "../api/authApi";
import {
  deleteTransactionAttachment,
  downloadTransactionAttachment,
  listTransactionAttachments,
  uploadTransactionAttachment,
} from "../api/transactionApi";
import ConfirmModal from "./common/ConfirmModal";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(source) {
  return source === "receipt_scan" ? "Receipt scan" : "Upload";
}

async function fetchAttachmentPreviewUrl(transactionId, attachmentId) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `/api/budget/transactions/${transactionId}/attachments/${attachmentId}`,
    { headers }
  );
  if (!response.ok) {
    return "";
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function TransactionAttachmentsPanel({
  transactionId = null,
  pendingAttachments = [],
  onPendingAttachmentsChange,
  disabled = false,
}) {
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!transactionId) {
      return undefined;
    }

    let active = true;
    const objectUrls = [];

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await listTransactionAttachments(transactionId);
        if (!active) return;

        const rows = result.attachments ?? [];
        setAttachments(rows);

        const nextPreviews = {};
        await Promise.all(
          rows.map(async (attachment) => {
            if (!String(attachment.mime_type || "").startsWith("image/")) {
              return;
            }
            try {
              const url = await fetchAttachmentPreviewUrl(transactionId, attachment.id);
              if (url) {
                objectUrls.push(url);
                nextPreviews[attachment.id] = url;
              }
            } catch {
              // Skip broken previews.
            }
          })
        );
        if (active) {
          setPreviewUrls(nextPreviews);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setAttachments([]);
          setPreviewUrls({});
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [transactionId]);

  const addPending = (item) => {
    onPendingAttachmentsChange?.((current) => [...current, item]);
  };

  const removePending = (index) => {
    onPendingAttachmentsChange?.((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setStatus("");

    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      setError("Choose an image (JPEG, PNG, WebP, GIF) or PDF.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const pendingItem = {
        key: `${Date.now()}-${file.name}`,
        fileBase64: dataUrl,
        mimeType: file.type || "application/octet-stream",
        filename: file.name || "attachment",
        source: "upload",
        previewUrl: file.type.startsWith("image/") ? dataUrl : "",
      };

      if (transactionId) {
        setBusy(true);
        const result = await uploadTransactionAttachment(transactionId, pendingItem);
        const attachment = result.attachment;
        setAttachments((current) => [...current, attachment]);
        if (String(attachment.mime_type || "").startsWith("image/")) {
          const url = await fetchAttachmentPreviewUrl(transactionId, attachment.id);
          if (url) {
            setPreviewUrls((current) => ({ ...current, [attachment.id]: url }));
          }
        }
        setStatus(`Attached “${attachment.filename}”.`);
      } else {
        addPending(pendingItem);
        setStatus(`“${pendingItem.filename}” will attach when you save.`);
      }
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (attachment) => {
    setError("");
    try {
      await downloadTransactionAttachment(transactionId, attachment.id, attachment.filename);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  const handleDeleteSaved = async () => {
    if (!deleteTarget) {
      return;
    }

    const attachment = deleteTarget;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await deleteTransactionAttachment(transactionId, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      setPreviewUrls((current) => {
        const next = { ...current };
        if (next[attachment.id]) {
          URL.revokeObjectURL(next[attachment.id]);
          delete next[attachment.id];
        }
        return next;
      });
      setStatus(`Removed “${attachment.filename}”.`);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="transaction-attachments-panel">
      <div className="transaction-attachments-head">
        <div>
          <h3>Attachments</h3>
          <p className="subtext">
            Receipts, PDFs, and photos linked to this transaction.
            {!transactionId ? " Files selected here attach when you save." : ""}
          </p>
        </div>
        <label className="linkish-button attachment-upload-button">
          {busy ? "Working..." : "Add file"}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelected}
            disabled={disabled || busy}
            hidden
          />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {status && <p className="status-text">{status}</p>}

      {loading ? (
        <p className="subtext">Loading attachments...</p>
      ) : (
        <ul className="transaction-attachments-list">
          {pendingAttachments.map((item, index) => (
            <li key={item.key || `${item.filename}-${index}`} className="transaction-attachment-item">
              <div className="transaction-attachment-main">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="transaction-attachment-thumb" />
                ) : (
                  <div className="transaction-attachment-thumb placeholder">PDF</div>
                )}
                <div>
                  <strong>{item.filename}</strong>
                  <p className="subtext">Pending · {sourceLabel(item.source)}</p>
                </div>
              </div>
              <button
                type="button"
                className="linkish-button"
                onClick={() => removePending(index)}
                disabled={disabled || busy}
              >
                Remove
              </button>
            </li>
          ))}

          {attachments.map((attachment) => (
            <li key={attachment.id} className="transaction-attachment-item">
              <div className="transaction-attachment-main">
                {previewUrls[attachment.id] ? (
                  <img
                    src={previewUrls[attachment.id]}
                    alt=""
                    className="transaction-attachment-thumb"
                  />
                ) : (
                  <div className="transaction-attachment-thumb placeholder">
                    {String(attachment.mime_type || "").startsWith("image/") ? "IMG" : "PDF"}
                  </div>
                )}
                <div>
                  <strong>{attachment.filename}</strong>
                  <p className="subtext">
                    {sourceLabel(attachment.source)} · {formatBytes(attachment.size_bytes)}
                  </p>
                </div>
              </div>
              <div className="transaction-attachment-actions">
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => handleDownload(attachment)}
                  disabled={disabled || busy}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => setDeleteTarget(attachment)}
                  disabled={disabled || busy}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}

          {pendingAttachments.length === 0 && attachments.length === 0 ? (
            <li className="subtext">No attachments yet.</li>
          ) : null}
        </ul>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove attachment?"
          message={`Remove attachment “${deleteTarget.filename}”?`}
          confirmLabel={busy ? "Removing..." : "Remove"}
          busy={busy}
          onCancel={() => !busy && setDeleteTarget(null)}
          onConfirm={handleDeleteSaved}
        />
      )}
    </section>
  );
}

export default TransactionAttachmentsPanel;
