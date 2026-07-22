import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField from "../ui/FormField";
import FavoriteIconPicker from "./FavoriteIconPicker";
import { DEFAULT_FAVORITE_ICON } from "../../utils/favoriteIcons";

/**
 * Edit a favorite's display label, icon, and color. Icons come from the
 * curated lucide-react set, or a small uploaded image (including .ico).
 *
 * Callers should pass a `key` derived from the favorite's id so React
 * remounts this component (and re-seeds state from `favorite`) whenever a
 * different favorite is opened for editing, instead of relying on an effect.
 */
function FavoriteEditModal({ open, favorite, onClose, onSave }) {
  const [label, setLabel] = useState(favorite?.label || "");
  const [icon, setIcon] = useState(favorite?.icon || DEFAULT_FAVORITE_ICON);
  const [color, setColor] = useState(favorite?.color || "");
  const [customIconData, setCustomIconData] = useState(favorite?.custom_icon_data || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || !favorite) return null;

  const handlePickerChange = (updates) => {
    if ("icon" in updates) setIcon(updates.icon);
    if ("color" in updates) setColor(updates.color);
    if ("customIconData" in updates) setCustomIconData(updates.customIconData);
  };

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Give this favorite a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(favorite.id, {
        label: trimmed,
        icon: customIconData ? null : icon,
        color: color || null,
        custom_icon_data: customIconData || null,
      });
      onClose();
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
      title="Edit favorite"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="favorite-edit-label" required>
          <input
            id="favorite-edit-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
            autoFocus
          />
        </FormField>

        <FormField label="Icon & color" hint="Pick a library icon or upload your own (.ico, .png, .svg…).">
          <FavoriteIconPicker
            icon={icon}
            color={color}
            customIconData={customIconData}
            onChange={handlePickerChange}
          />
        </FormField>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default FavoriteEditModal;
