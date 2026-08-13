import { useEffect, useState } from "react";
import {
  createHomeInventoryLocation,
  updateHomeInventoryLocation,
} from "../../api/homeInventoryApi";
import Modal from "../../components/ui/Modal";

function HomeInventoryLocationModal({ open, onClose, onSaved, location = null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(location?.name || "");
    setDescription(location?.description || "");
  }, [open, location]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), description: description.trim() };
      const result = location?.id
        ? await updateHomeInventoryLocation(location.id, payload)
        : await createHomeInventoryLocation(payload);
      onSaved?.(result.location);
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
      title={location ? "Edit location" : "Add location"}
      size="sm"
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="home-inventory-location-form"
            className="button-primary"
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="home-inventory-location-form" className="form form-shell" onSubmit={handleSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <label className="form-field-full">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Garage fridge"
            required
            maxLength={120}
          />
        </label>
        <label className="form-field-full">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Optional notes about this storage spot"
          />
        </label>
      </form>
    </Modal>
  );
}

export default HomeInventoryLocationModal;
