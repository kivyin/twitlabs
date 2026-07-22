/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addFavorite, getFavorites, removeFavorite, updateFavorite as updateFavoriteApi } from "../api/favoritesApi";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [allFavorites, setFavorites] = useState([]);

  // When logged out, expose an empty list without touching state.
  const favorites = useMemo(() => (user ? allFavorites : []), [user, allFavorites]);

  useEffect(() => {
    if (!user || user.must_change_password) {
      return undefined;
    }

    let active = true;
    getFavorites()
      .then((items) => {
        if (active) setFavorites(items);
      })
      .catch(() => {
        if (active) setFavorites([]);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const isFavorite = useCallback(
    (path) => favorites.some((favorite) => favorite.path === path),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async ({ path, label, icon = null }) => {
      const existing = favorites.find((favorite) => favorite.path === path);
      if (existing) {
        setFavorites((current) => current.filter((favorite) => favorite.id !== existing.id));
        try {
          await removeFavorite(existing.id);
        } catch {
          setFavorites((current) => [...current, existing]);
        }
        return null;
      }

      try {
        const result = await addFavorite({ path, label, icon });
        const created = { id: result.id, path, label, icon, color: null, custom_icon_data: null, sort_order: favorites.length };
        setFavorites((current) => [...current, created]);
        return created;
      } catch {
        // leave state unchanged on failure
        return null;
      }
    },
    [favorites]
  );

  const deleteFavorite = useCallback(async (id) => {
    setFavorites((current) => current.filter((favorite) => favorite.id !== id));
    try {
      await removeFavorite(id);
    } catch {
      const items = await getFavorites().catch(() => []);
      setFavorites(items);
    }
  }, []);

  const updateFavorite = useCallback(async (id, updates) => {
    const previous = favorites.find((favorite) => favorite.id === id);
    setFavorites((current) =>
      current.map((favorite) => (favorite.id === id ? { ...favorite, ...updates } : favorite))
    );
    try {
      await updateFavoriteApi(id, updates);
    } catch (error) {
      if (previous) {
        setFavorites((current) =>
          current.map((favorite) => (favorite.id === id ? previous : favorite))
        );
      }
      throw error;
    }
  }, [favorites]);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, deleteFavorite, updateFavorite }),
    [favorites, isFavorite, toggleFavorite, deleteFavorite, updateFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider.");
  }
  return context;
}
