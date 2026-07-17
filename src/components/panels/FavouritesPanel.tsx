"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import { api, type ConstituencySeatResult, type ConstituencyGeo } from "@/lib/api";
import { pickTopTwo } from "@/lib/results";
import CandidateResultRow from "../CandidateResultRow";
import StarButton from "../StarButton";
import type { SelectedConstituency } from "@/app/page";

// A special-cased Results view — same real data, same real cards
// (constituency-row + CandidateResultRow: candidates, party pills, vote
// counts/percentages, vote bar), same navigation into the drilldown, just
// filtered down to the user's starred constituencies. Deliberately reuses
// ResultsPanel's own fetch shape (constituenciesGeo() joined against
// presidentialByConstituency/parliamentaryAllSeats for the current
// electionType/electionYear) rather than a bare name/region row, and
// deliberately follows the same global electionType/electionYear
// selection Results and Regions already do — a favourite constituency's
// card here shows whatever race/year is currently selected app-wide, not
// a fixed "current" year.
interface RegionGroup {
  shortName: string;
  seats: (ConstituencySeatResult & { constituencyId: string; totalStations: number })[];
}

export default function FavouritesPanel({
  electionType, electionYear, onSelectConstituency,
}: {
  electionType: "presidential" | "parliamentary";
  electionYear: string;
  onSelectConstituency: (c: SelectedConstituency) => void;
}) {
  const { user, openModal, logout } = useAuth();
  const { isFavourited } = useFavourites();
  const [groups, setGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setGroups([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.constituenciesGeo(),
      electionType === "presidential"
        ? api.presidentialByConstituency(electionYear)
        : api.parliamentaryAllSeats(electionYear),
    ])
      .then(([geo, seats]) => {
        if (cancelled) return;
        const geoByName = new Map<string, ConstituencyGeo>(geo.map((g) => [g.name, g]));
        const byRegion = new Map<string, RegionGroup>();

        for (const seat of seats) {
          const g = geoByName.get(seat.constituency.name);
          const constituencyId = g?.id ?? "";
          if (!constituencyId || !isFavourited("CONSTITUENCY", constituencyId)) continue; // the actual "favourites" filter
          const regionShortName = g?.region.shortName ?? "Other";
          // Same era-matching principle ResultsPanel uses: based on the
          // actual year shown (electionYear), not electionType — stays
          // correct regardless of which race is on which year.
          const totalStations = electionYear === "2024"
            ? g?._count?.pollingStations ?? 0
            : g?._count?.pollingStationArchive ?? 0;
          if (!byRegion.has(regionShortName)) byRegion.set(regionShortName, { shortName: regionShortName, seats: [] });
          byRegion.get(regionShortName)!.seats.push({ ...seat, constituencyId, totalStations });
        }

        const sortedGroups = [...byRegion.values()].sort((a, b) => a.shortName.localeCompare(b.shortName));
        for (const group of sortedGroups) group.seats.sort((a, b) => a.constituency.name.localeCompare(b.constituency.name));
        setGroups(sortedGroups);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [user, electionType, electionYear, isFavourited]);

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
        <div className="fav-empty" style={{ fontStyle: "normal", fontSize: 15, color: "var(--white)", marginBottom: 16 }}>
          Sign in to save your favourite constituencies.
        </div>
        <button className="auth-modal-submit" style={{ maxWidth: 220, margin: "0 auto" }} onClick={openModal}>
          Sign in / Create account
        </button>
      </div>
    );
  }

  if (loading) return <div className="tap-hint">Loading favourites...</div>;
  if (error) return <div className="no-results">Couldn't load favourites: {error}</div>;

  const hasAny = groups.some((g) => g.seats.length > 0);

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div className="fav-panel-header">
        <span className="fav-panel-title">⭐ FAVOURITES</span>
        <span style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={logout}>Sign out</span>
      </div>

      {!hasAny && (
        <div className="fav-empty">No favourites yet — tap the star on any constituency to save it here.</div>
      )}

      {groups.map((group) => (
        <div key={group.shortName}>
          <div className="region-header" style={{ scrollMarginTop: "calc(var(--topbar-h, 97px))" }}>
            <div className="region-name">{group.shortName.toUpperCase()} REGION</div>
            <div className="region-count">
              {group.seats.length} {electionType === "presidential" ? "constituencies" : "seats"}
            </div>
          </div>
          <div className="region-body expanded">
            {group.seats.map((seat) => {
              const topTwo = pickTopTwo(seat.results);
              const isDeclared = seat.status === "DECLARED" && seat.totalStations > 0;
              return (
                <div
                  className="constituency-row"
                  key={seat.constituency.ecCode}
                  onClick={() => onSelectConstituency({
                    id: seat.constituencyId, name: seat.constituency.name, regionName: group.shortName,
                  })}
                  style={{ cursor: "pointer" }}
                >
                  <div className="row-top">
                    <StarButton id={seat.constituencyId} />
                    <div className="constituency-name">{seat.constituency.name}</div>
                    {isDeclared && <span className="declared-badge">DECLARED</span>}
                    {seat.totalStations > 0 && (
                      <span className="stations-badge complete">
                        {seat.totalStations}/{seat.totalStations}
                      </span>
                    )}
                  </div>
                  <CandidateResultRow results={topTwo} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
