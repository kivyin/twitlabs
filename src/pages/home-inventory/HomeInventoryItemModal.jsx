import { useEffect, useRef, useState } from "react";
import {
  createHomeInventoryItem,
  deleteHomeInventoryItemImage,
  fetchHomeInventoryItemImageUrl,
  readFileAsDataUrl,
  updateHomeInventoryItem,
  uploadHomeInventoryItemImage,
} from "../../api/homeInventoryApi";
import Modal from "../../components/ui/Modal";
import HomeInventoryBrandField from "./HomeInventoryBrandField";

const emptyForm = (locationId) => ({
  location_id: locationId || "",
  name: "",
  brand: "",
  description: "",
  quantity: 1,
  unit: "",
});

function HomeInventoryItemModal({
  open,
  onClose,
  onSaved,
  locations = [],
  item = null,
  defaultLocationId = "",
}) {
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyForm(defaultLocationId));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setError("");
    setPendingImage(null);
    setRemoveImage(false);
    if (item) {
      setForm({
        location_id: item.location_id,
        name: item.name || "",
        brand: item.brand || "",
        description: item.description || "",
        quantity: item.quantity ?? 1,
        unit: item.unit || "",
      });
    } else {
      setForm(emptyForm(defaultLocationId || locations[0]?.id || ""));
    }
    return undefined;
  }, [open, item, defaultLocationId, locations]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    async function load() {
      if (!open || !item?.image_path || removeImage || pendingImage) {
        setPreviewUrl(pendingImage?.dataUrl || "");
        return;
      }
      const url = await fetchHomeInventoryItemImageUrl(item.id);
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setPreviewUrl(url);
    }
    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, item?.id, item?.image_path, removeImage, pendingImage]);

  const bumpQuantity = (delta) => {
    setForm((prev) => ({
      ...prev,
      quantity: Math.max(0, Number(prev.quantity || 0) + delta),
    }));
  };

  const handlePickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingImage({ dataUrl, mimeType: file.type || "image/jpeg" });
      setRemoveImage(false);
      setPreviewUrl(dataUrl);
    } catch (readError) {
      setError(readError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        location_id: Number(form.location_id),
        name: form.name.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
      };
      let saved;
      if (item?.id) {
        const result = await updateHomeInventoryItem(item.id, payload);
        saved = result.item;
      } else {
        const result = await createHomeInventoryItem(payload);
        saved = result.item;
      }

      if (removeImage && item?.image_path) {
        const cleared = await deleteHomeInventoryItemImage(saved.id);
        saved = cleared.item;
      } else if (pendingImage) {
        const uploaded = await uploadHomeInventoryItemImage(saved.id, {
          fileBase64: pendingImage.dataUrl,
          mimeType: pendingImage.mimeType,
        });
        saved = uploaded.item;
      }

      onSaved?.(saved);
      onClose?.();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit item" : "Add item"}
      description="Name, brand, quantity, location, optional photo."
      size="md"
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="home-inventory-item-form"
            className="button-primary"
            disabled={saving || !form.name.trim() || !form.location_id}
          >
            {saving ? "Saving…" : "Save item"}
          </button>
        </>
      }
    >
      <form id="home-inventory-item-form" className="form form-shell" onSubmit={handleSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <div className="form-grid">
          <label className="form-field-full">
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Chicken thighs"
              required
              maxLength={120}
            />
          </label>
          <div className="form-field-full">
            <HomeInventoryBrandField
              value={form.brand}
              disabled={saving}
              onChange={(brand) => setForm((prev) => ({ ...prev, brand }))}
            />
          </div>
          <label className="form-field-full">
            Location
            <select
              value={form.location_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location_id: event.target.value }))
              }
              required
            >
              <option value="">Select location…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field-full">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              placeholder="Notes, pack size, freeze date…"
              maxLength={500}
            />
          </label>
          <div className="home-inv-qty-row form-field-full">
            <span className="home-inv-qty-label">Quantity</span>
            <div className="home-inv-qty-controls">
              <button
                type="button"
                className="button home-inv-touch-btn"
                onClick={() => bumpQuantity(-1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                inputMode="decimal"
              />
              <button
                type="button"
                className="button home-inv-touch-btn"
                onClick={() => bumpQuantity(1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          <label>
            Unit
            <input
              value={form.unit}
              onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
              placeholder="pack, lb, bag…"
              maxLength={40}
            />
          </label>
        </div>

        <div className="home-inv-photo-block">
          <div className="home-inv-photo-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="" />
            ) : (
              <span className="subtext">No photo</span>
            )}
          </div>
          <div className="home-inv-photo-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handlePickImage}
            />
            <button
              type="button"
              className="button home-inv-touch-btn-wide"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? "Change photo" : "Add photo"}
            </button>
            {previewUrl ? (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setPendingImage(null);
                  setRemoveImage(true);
                  setPreviewUrl("");
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default HomeInventoryItemModal;
