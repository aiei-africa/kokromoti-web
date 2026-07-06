"use client";
import { useFavourites } from "@/contexts/FavouritesContext";

export default function StarButton({
  type, id, region = false,
}: { type: "CONSTITUENCY" | "REGION"; id: string; region?: boolean }) {
  const { isFavourited, toggleFavourite } = useFavourites();
  const starred = isFavourited(type, id);

  return (
    <button
      className={`${region ? "region-star-btn" : "star-btn"} ${starred ? "starred" : ""}`}
      onClick={(e) => { e.stopPropagation(); toggleFavourite(type, id); }}
      aria-label={starred ? "Remove favourite" : "Add favourite"}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
