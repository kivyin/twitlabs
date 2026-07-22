import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  FAVORITE_COLOR_PALETTE,
  FAVORITE_ICON_MAX_BYTES,
  FAVORITE_ICON_NAMES,
  FAVORITE_ICON_UPLOAD_ACCEPT,
  renderFavoriteIcon,
} from "../../utils/favoriteIcons";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

/**
 * Combined icon + color picker for favorite entries: a curated lucide-react
 * icon grid, quick color swatches with a free-form hex input, and a file
 * upload for custom icons (including .ico favicons, not just SVG).
 */
function FavoriteIconPicker({ icon, color, customIconData, onChange }) {
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");

  const previewColor = color || "var(--brand)";

  const handleSelectIcon = (name) => {
    setUploadError("");
    onChange({ icon: name, customIconData: null });
  };

  const handleSelectColor = (hex) => {
    onChange({ color: hex });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");

    const isIco = /\.ico$/i.test(file.name || "");
    const type = isIco && !file.type ? "image/x-icon" : file.type;
    if (!ALLOWED_UPLOAD_TYPES.has(type) && !isIco) {
      setUploadError("Use a PNG, JPEG, WebP, GIF, SVG, or ICO file.");
      return;
    }
    if (file.size > FAVORITE_ICON_MAX_BYTES) {
      setUploadError("That file is too large. Please use an icon under 300KB.");
      return;
    }

    try {
      let dataUrl = await readFileAsDataUrl(file);
      if (isIco && dataUrl.startsWith("data:application/octet-stream")) {
        dataUrl = dataUrl.replace("data:application/octet-stream", "data:image/x-icon");
      } else if (isIco && dataUrl.startsWith("data:;")) {
        dataUrl = dataUrl.replace("data:;", "data:image/x-icon;");
      }
      onChange({ customIconData: dataUrl, icon: null });
    } catch {
      setUploadError("Could not read that file. Please try another.");
    }
  };

  const handleRemoveCustomIcon = () => {
    onChange({ customIconData: null });
  };

  return (
    <div className="favorite-icon-picker">
      <div className="favorite-icon-preview" style={{ color: previewColor }}>
        {customIconData ? (
          <img src={customIconData} alt="" className="favorite-icon-preview-img" />
        ) : (
          renderFavoriteIcon(icon, { size: 22, strokeWidth: 2, "aria-hidden": "true" })
        )}
      </div>

      <div className="favorite-icon-picker-body">
        <div className="favorite-icon-swatches" role="group" aria-label="Icon color">
          {FAVORITE_COLOR_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`favorite-color-swatch${color === hex ? " active" : ""}`}
              style={{ backgroundColor: hex }}
              aria-label={`Use color ${hex}`}
              aria-pressed={color === hex}
              onClick={() => handleSelectColor(hex)}
            />
          ))}
          <label className="favorite-color-custom" title="Custom color">
            <input
              type="color"
              value={color || "#4f9cff"}
              onChange={(event) => handleSelectColor(event.target.value)}
              aria-label="Custom icon color"
            />
          </label>
        </div>

        <div className="favorite-icon-grid" role="group" aria-label="Icon library">
          {FAVORITE_ICON_NAMES.map((name) => {
            const active = !customIconData && icon === name;
            return (
              <button
                key={name}
                type="button"
                className={`favorite-icon-option${active ? " active" : ""}`}
                aria-label={name}
                aria-pressed={active}
                title={name}
                onClick={() => handleSelectIcon(name)}
              >
                {renderFavoriteIcon(name, { size: 18, strokeWidth: 2, "aria-hidden": "true" })}
              </button>
            );
          })}
        </div>

        <div className="favorite-icon-upload-row">
          <label className="linkish-button favorite-icon-upload-button">
            Upload custom icon (.ico, .png, .svg…)
            <input
              ref={fileInputRef}
              type="file"
              accept={FAVORITE_ICON_UPLOAD_ACCEPT}
              onChange={handleFileChange}
              hidden
            />
          </label>
          {customIconData && (
            <button
              type="button"
              className="linkish-button favorite-icon-remove-custom"
              onClick={handleRemoveCustomIcon}
            >
              <X size={14} aria-hidden="true" /> Remove custom icon
            </button>
          )}
        </div>
        {uploadError && (
          <p className="field-error" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}

export default FavoriteIconPicker;
