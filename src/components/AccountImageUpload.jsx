import { useEffect, useRef, useState } from "react";
import { deleteAccountImage, fetchAccountImageUrl, uploadAccountImage } from "../api/budgetApi";
import Button from "./ui/Button";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

/**
 * Lets the user set a photo/logo for an account, shown as the tile image on
 * the accounts list. Only available once the account exists (edit mode),
 * mirroring AccountTransactionsPanel's edit-only related-data pattern.
 */
function AccountImageUpload({ accountId, hasImage, onChanged }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(hasImage));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function load() {
      if (!hasImage) {
        setPreviewUrl("");
        setLoading(false);
        return;
      }

      setLoading(true);
      const url = await fetchAccountImageUrl(accountId);
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setPreviewUrl(url);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accountId, hasImage]);

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large. Please use a file under 5MB.");
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await uploadAccountImage(accountId, { fileBase64: dataUrl, mimeType: file.type });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(dataUrl);
      onChanged?.(true);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteAccountImage(accountId);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      onChanged?.(false);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-image-upload">
      <div className="account-image-upload-preview">
        {loading ? (
          <span className="account-image-placeholder">…</span>
        ) : previewUrl ? (
          <img src={previewUrl} alt="" className="account-image-upload-img" />
        ) : (
          <span className="account-image-placeholder" aria-hidden="true">
            🏦
          </span>
        )}
      </div>
      <div className="account-image-upload-body">
        <p className="account-image-upload-label">Account image</p>
        <p className="subtext">Shown on the account tile. JPEG, PNG, WebP, or GIF, up to 5MB.</p>
        <div className="account-image-upload-actions">
          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Working…" : previewUrl ? "Change image" : "Upload image"}
          </Button>
          {previewUrl && (
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelected}
            disabled={busy}
            hidden
          />
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default AccountImageUpload;
