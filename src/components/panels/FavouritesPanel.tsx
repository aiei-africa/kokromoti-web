"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import type { FavouritesResponse } from "@/lib/api";
import StarButton from "../StarButton";
import type { SelectedConstituency } from "@/app/page";

export default function FavouritesPanel({
  onSelectConstituency,
}: { onSelectConstituency: (c: SelectedConstituency) => void }) {
  const { user, token, openModal, logout } = useAuth();
  const { favouritedIds } = useFavourites(); // triggers re-fetch below when it changes
  const [data, setData] = useState<FavouritesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setData(null); return; }
    setLoading(true);
    api.favourites(token).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [token, favouritedIds.size]);

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
        <div className="fav-empty" style={{ fontStyle: "normal", fontSize: 15, color: "var(--white)", marginBottom: 16 }}>
          Sign in to save your favourite constituencies and regions.
        </div>
        <button className="auth-modal-submit" style={{ maxWidth: 220, margin: "0 auto" }} onClick={openModal}>
          Sign in / Create account
        </button>
      </div>
    );
  }

  if (loading) return <div className="tap-hint">Loading favourites...</div>;

  const hasRegions = (data?.regions?.length ?? 0) > 0;
  const hasConstituencies = (data?.constituencies?.length ?? 0) > 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="fav-panel-header">
        <span className="fav-panel-title">⭐ FAVOURITES</span>
        <span style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={logout}>Sign out</span>
      </div>

      {!hasRegions && !hasConstituencies && (
        <div className="fav-empty">No favourites yet — tap the star on any constituency or region to save it here.</div>
      )}

      {hasRegions && (
        <>
          <div className="fav-section-hdr"><span className="fav-section-hdr-text">REGIONS</span></div>
          {data!.regions.map((r) => (
            <div className="fav-region-header" key={r.id}>
              <StarButton type="REGION" id={r.id} region />
              <span style={{ color: "var(--white)", fontSize: 14 }}>{r.name}</span>
            </div>
          ))}
        </>
      )}

      {hasConstituencies && (
        <>
          <div className="fav-section-hdr"><span className="fav-section-hdr-text">CONSTITUENCIES</span></div>
          {data!.constituencies.map((c) => (
            <div
              className="fav-con-header"
              key={c.id}
              onClick={() => onSelectConstituency({ id: c.id, name: c.name, regionName: c.region?.shortName ?? "" })}
              style={{ cursor: "pointer" }}
            >
              <StarButton type="CONSTITUENCY" id={c.id} />
              <span style={{ color: "var(--white)", fontSize: 14 }}>{c.name}</span>
              <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "auto" }}>{c.region?.shortName}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
