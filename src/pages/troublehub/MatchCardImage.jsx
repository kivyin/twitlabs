import { useEffect, useRef, useState } from "react";
import { fetchMatchCardImageUrl } from "../../api/troublehubApi";

function fileFromClipboard(event) {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type?.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

function MatchCardImage({
  card,
  className = "",
  canUpload = false,
  uploading = false,
  sfwBlur = false,
  /** Local draft preview (object URL) while editing — not uploaded yet. */
  draftPreviewUrl = null,
  /** Treat as no image (e.g. pending remove while editing). */
  forceEmpty = false,
  onUploadFile,
  onRemove,
}) {
  const [src, setSrc] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [pasteHint, setPasteHint] = useState("");
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    if (draftPreviewUrl || forceEmpty || !card?.id || !card.has_image) {
      setSrc(null);
      setLoadingImage(false);
      return undefined;
    }
    setLoadingImage(true);
    fetchMatchCardImageUrl(card.id).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setSrc(url);
      setLoadingImage(false);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [card?.id, card?.has_image, card?.image_path, draftPreviewUrl, forceEmpty]);

  const acceptFile = async (file) => {
    if (!file || !canUpload || uploading || !onUploadFile) return;
    if (!String(file.type || "").startsWith("image/")) {
      setPasteHint("That wasn’t an image file.");
      return;
    }
    setPasteHint("");
    await onUploadFile(file);
  };

  const uploadZone = (
    <div
      className={`th-match-image th-match-image--empty th-match-image--upload${
        className ? ` ${className}` : ""
      }`}
      tabIndex={0}
      role="button"
      aria-label="Add an image. Click to choose a file, or paste an image while this area is focused."
      onClick={() => {
        if (!uploading) fileInputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!uploading) fileInputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        acceptFile(file);
      }}
      onPaste={(event) => {
        const file = fileFromClipboard(event);
        if (!file) return;
        event.preventDefault();
        event.stopPropagation();
        acceptFile(file);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          acceptFile(file);
        }}
      />
      <div className="th-match-image-upload-copy">
        <span className="th-match-image-upload-icon" aria-hidden="true">
          {uploading ? "…" : "📷"}
        </span>
        <strong>{uploading ? "Working…" : "Add image"}</strong>
        <span className="stat-meta">Click, drop, or focus here and paste</span>
        {pasteHint ? <span className="field-error">{pasteHint}</span> : null}
      </div>
    </div>
  );

  if (draftPreviewUrl) {
    return (
      <div
        className={`th-match-image th-match-image--filled${className ? ` ${className}` : ""}`}
      >
        <img src={draftPreviewUrl} alt="" />
        <span className="th-match-image-draft-badge" aria-hidden="true">
          Draft
        </span>
        {canUpload && onRemove ? (
          <button
            type="button"
            className="th-match-image-remove"
            disabled={uploading}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label="Remove image"
            title="Remove image"
          >
            Remove image
          </button>
        ) : null}
      </div>
    );
  }

  if (forceEmpty || !card?.has_image) {
    if (canUpload) return uploadZone;
    return (
      <div
        className={`th-match-image th-match-image--empty${className ? ` ${className}` : ""}`}
        aria-hidden="true"
      >
        <span>✦</span>
      </div>
    );
  }

  if (loadingImage || !src) {
    return (
      <div
        className={`th-match-image th-match-image--empty${className ? ` ${className}` : ""}`}
        aria-hidden="true"
      >
        <span>…</span>
      </div>
    );
  }

  return (
    <div
      className={`th-match-image th-match-image--filled${sfwBlur ? " is-sfw-blurred" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <img src={src} alt="" />
      {sfwBlur ? (
        <span className="th-match-image-sfw-badge" aria-hidden="true">
          SFW
        </span>
      ) : null}
      {canUpload && onRemove ? (
        <button
          type="button"
          className="th-match-image-remove"
          disabled={uploading}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label="Remove image"
          title="Remove image"
        >
          Remove image
        </button>
      ) : null}
      {canUpload ? (
        <button
          type="button"
          className="th-match-image-replace"
          disabled={uploading}
          onClick={(event) => {
            event.stopPropagation();
            replaceInputRef.current?.click();
          }}
        >
          Replace
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            hidden
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              acceptFile(file);
            }}
          />
        </button>
      ) : null}
    </div>
  );
}

export default MatchCardImage;
