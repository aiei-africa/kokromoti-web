"use client";
import { useFavourites } from "@/contexts/FavouritesContext";

// Constituencies only — see FavouritesContext for why regions were dropped.
export default function StarButton({ id }: { id: string }) {
  const { isFavourited, toggleFavourite } = useFavourites();
  const starred = isFavourited("CONSTITUENCY", id);

  return (
    <button
      className={`star-btn ${starred ? "starred" : ""}`}
      onClick={(e) => { e.stopPropagation(); toggleFavourite("CONSTITUENCY", id); }}
      aria-label={starred ? "Remove favourite" : "Add favourite"}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
