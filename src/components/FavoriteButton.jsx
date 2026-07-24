import { useLocation } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";

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
  const { isFavorite, toggleFavorite } = useFavorites();

  const targetPath = path ?? `${location.pathname}${location.search}`;
  const favorited = isFavorite(targetPath);

  const resolveLabel = () => {
    if (label) return label;
    const doc = document.querySelector(".page-header h1");
    return doc?.textContent?.trim() || targetPath;
  };

  const actionLabel = favorited ? "Remove from favorites" : "Add this page to favorites";

  return (
    <button
      type="button"
      className={`favorite-button${favorited ? " active" : ""}`}
      aria-pressed={favorited}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={() => toggleFavorite({ path: targetPath, label: resolveLabel() })}
    >
      <StarIcon filled={favorited} />
    </button>
  );
}

export default FavoriteButton;
