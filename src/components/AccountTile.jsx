import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAccountImageUrl } from "../api/budgetApi";
import BrowseLink from "./BrowseLink";
import { formatCurrency } from "../utils/format";
import { getSignedAmountClass } from "../utils/money";

/**
 * Card view of a single account for the accounts list "Tiles" mode. Loads
 * its own authenticated image preview (accounts store their photo on disk,
 * not inline) so the grid can render before any images resolve.
 */
function AccountTile({
  account,
  accountId,
  appName,
  typeLabel,
  onDelete,
  reorderable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDropTarget = false,
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFit, setImageFit] = useState("cover");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function load() {
      if (!account.image_path) {
        setImageUrl("");
        return;
      }

      const url = await fetchAccountImageUrl(accountId);
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setImageUrl(url);
    }

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accountId, account.image_path]);

  // Pick object-fit based on how the image's shape compares to the media
  // area (roughly 2.3:1). Wide logos and tall/square marks get "contain" so
  // they aren't cropped into an over-zoomed slice; photo-like images close to
  // the container's shape keep "cover" to fill the tile edge to edge.
  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (!naturalWidth || !naturalHeight) return;
    const imageRatio = naturalWidth / naturalHeight;
    const container = event.target.parentElement;
    const containerRatio =
      container && container.clientHeight > 0
        ? container.clientWidth / container.clientHeight
        : 2.3;
    // "cover" scales by max(widthRatio, heightRatio); this factor is how much
    // of the image gets cropped away. Beyond ~35% cropped, contain looks better.
    const cropFactor =
      Math.max(imageRatio / containerRatio, containerRatio / imageRatio);
    setImageFit(cropFactor > 1.35 ? "contain" : "cover");
  };

  const initial = String(account.name || "?").trim().charAt(0).toUpperCase() || "?";
  const editPath = `/app/${appName}/accounts/${encodeURIComponent(String(accountId))}/edit`;
  const registerPath = `/app/${appName}/accounts/${encodeURIComponent(String(accountId))}/register`;
  const tileClassName = [
    "account-tile",
    isDragging ? "is-dragging" : "",
    isDropTarget ? "is-drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={tileClassName}
      onDragOver={
        reorderable
          ? (event) => {
              event.preventDefault();
              onDragOver?.();
            }
          : undefined
      }
      onDrop={
        reorderable
          ? (event) => {
              event.preventDefault();
              onDrop?.();
            }
          : undefined
      }
    >
      {reorderable ? (
        <button
          type="button"
          className="account-tile-drag-handle"
          draggable
          title="Drag to reorder"
          aria-label="Drag to reorder"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            onDragStart?.();
          }}
          onDragEnd={() => onDragEnd?.()}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      ) : null}
      <BrowseLink to={editPath} className="account-tile-media" aria-hidden="true" tabIndex={-1}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`account-tile-image account-tile-image-${imageFit}`}
            onLoad={handleImageLoad}
          />
        ) : (
          <span className="account-tile-placeholder">{initial}</span>
        )}
      </BrowseLink>
      <div className="account-tile-body">
        <BrowseLink to={editPath} className="account-tile-name">
          {account.name}
        </BrowseLink>
        {typeLabel && <p className="account-tile-type">{typeLabel}</p>}
        {(account.owner_label || account.is_joint) && (
          <p className="account-tile-owner">
            {account.owner_label ? `Owner: ${account.owner_label}` : null}
            {Number(account.is_joint) === 1
              ? `${account.owner_label ? " · " : ""}Joint`
              : null}
          </p>
        )}
        <p className={`account-tile-balance ${getSignedAmountClass(account.balance)}`}>
          {formatCurrency(account.balance)}
        </p>
      </div>
      <div className="account-tile-actions">
        <Link className="record-link" to={registerPath}>
          Register
        </Link>
        <BrowseLink className="record-link" to={editPath}>
          Edit
        </BrowseLink>
        <button type="button" className="danger-button" onClick={() => onDelete(account)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default AccountTile;
