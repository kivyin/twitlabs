import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useFavorites } from "../context/FavoritesContext";
import FavoriteEditModal from "./favorites/FavoriteEditModal";

function StarIcon({ filled }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/**
 * Star toggle that favorites the current page (or an explicit path/label).
 * Favorited pages appear under "Favorites" in the left navigation.
 */
function FavoriteButton({ path, label }) {
  const location = useLocation();
  const { favorites, isFavorite, toggleFavorite, updateFavorite } = useFavorites();
  const [justAdded, setJustAdded] = useState(null);
  const [editing, setEditing] = useState(false);

  const targetPath = path ?? `${location.pathname}${location.search}`;
  const favorited = isFavorite(targetPath);
  const current = favorites.find((favorite) => favorite.path === targetPath);

  const resolveLabel = () => {
    if (label) return label;
    const doc = document.querySelector(".page-header h1");
    return doc?.textContent?.trim() || targetPath;
  };

  const actionLabel = favorited ? "Remove from favorites" : "Add this page to favorites";

  const handleToggle = async () => {
    const result = await toggleFavorite({ path: targetPath, label: resolveLabel() });
    setJustAdded(result);
  };

  const favoriteRecord = current || justAdded;

  return (
    <span className="favorite-button-group">
      <button
        type="button"
        className={`favorite-button${favorited ? " active" : ""}`}
        aria-pressed={favorited}
        aria-label={actionLabel}
        title={actionLabel}
        onClick={handleToggle}
      >
        <StarIcon filled={favorited} />
      </button>
      {favorited && favoriteRecord && (
        <button
          type="button"
          className="favorite-button favorite-customize-button"
          aria-label="Customize this favorite's icon and color"
          title="Customize icon & color"
          onClick={() => setEditing(true)}
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      )}
      <FavoriteEditModal
        key={favoriteRecord?.id ?? "closed"}
        open={editing}
        favorite={favoriteRecord}
        onClose={() => setEditing(false)}
        onSave={updateFavorite}
      />
    </span>
  );
}

export default FavoriteButton;
