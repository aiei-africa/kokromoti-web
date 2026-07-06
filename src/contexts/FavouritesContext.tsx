"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, type FavouritesResponse } from "@/lib/api";
import { useAuth } from "./AuthContext";

type EntityType = "CONSTITUENCY" | "REGION";

interface FavouritesContextValue {
  favouritedIds: Set<string>; // "TYPE:id" keys
  isFavourited: (type: EntityType, id: string) => boolean;
  toggleFavourite: (type: EntityType, id: string) => Promise<void>;
  loading: boolean;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

function key(type: EntityType, id: string) { return `${type}:${id}`; }

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const { token, openModal } = useAuth();
  const [favouritedIds, setFavouritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setFavouritedIds(new Set()); return; }
    setLoading(true);
    api.favourites(token)
      .then((data: FavouritesResponse) => {
        const ids = new Set<string>();
        for (const c of data.constituencies ?? []) ids.add(key("CONSTITUENCY", c.id));
        for (const r of data.regions ?? []) ids.add(key("REGION", r.id));
        setFavouritedIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const isFavourited = useCallback((type: EntityType, id: string) => favouritedIds.has(key(type, id)), [favouritedIds]);

  const toggleFavourite = useCallback(async (type: EntityType, id: string) => {
    if (!token) { openModal(); return; }
    const k = key(type, id);
    const currentlyFavourited = favouritedIds.has(k);

    // Optimistic update — star flips immediately, doesn't wait on the
    // round-trip, matching v10's instant-feedback star animation.
    setFavouritedIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavourited) next.delete(k); else next.add(k);
      return next;
    });

    try {
      if (currentlyFavourited) await api.removeFavourite(token, type, id);
      else await api.addFavourite(token, type, id);
    } catch {
      // roll back on failure (e.g. expired 15-minute token)
      setFavouritedIds((prev) => {
        const next = new Set(prev);
        if (currentlyFavourited) next.add(k); else next.delete(k);
        return next;
      });
      openModal();
    }
  }, [token, favouritedIds, openModal]);

  return (
    <FavouritesContext.Provider value={{ favouritedIds, isFavourited, toggleFavourite, loading }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used within FavouritesProvider");
  return ctx;
}
