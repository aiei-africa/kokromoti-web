"use client";
import { useEffect, useState } from "react";
import { api, type ConstituencySeatResult, type ConstituencyGeo } from "@/lib/api";
import { CURRENT_ELECTION_CODE, pickTopTwo } from "@/lib/results";
import CandidateResultRow from "../CandidateResultRow";

interface RegionGroup {
  shortName: string;
  seats: (ConstituencySeatResult & { totalStations: number })[];
}

export default function ResultsPanel({
  electionType, searchQuery,
}: { electionType: "presidential" | "parliamentary"; searchQuery: string }) {
  const [groups, setGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.constituenciesGeo(),
      electionType === "presidential"
        ? api.presidentialByConstituency(CURRENT_ELECTION_CODE)
        : api.parliamentaryAllSeats(CURRENT_ELECTION_CODE),
    ])
      .then(([geo, seats]) => {
        if (cancelled) return;
        const geoByName = new Map<string, ConstituencyGeo>(geo.map((g) => [g.name, g]));
        const byRegion = new Map<string, RegionGroup>();

        for (const seat of seats) {
          const g = geoByName.get(seat.constituency.name);
          const regionShortName = g?.region.shortName ?? "Other";
          // Real historical station-level data doesn't exist for 1996-2016 —
          // stationsReporting was seeded as a 0 placeholder. Using the
          // CURRENT (2024) station count as an honest, real-data proxy for
          // "total" — not year-matched to 2016 specifically, but real
          // rather than fabricated. Historical results are always fully
          // complete, so reported == total whenever we show a count at all.
          const totalStations = g?._count?.pollingStations ?? 0;
          if (!byRegion.has(regionShortName)) byRegion.set(regionShortName, { shortName: regionShortName, seats: [] });
          byRegion.get(regionShortName)!.seats.push({ ...seat, totalStations });
        }

        const sortedGroups = [...byRegion.values()].sort((a, b) => a.shortName.localeCompare(b.shortName));
        for (const group of sortedGroups) group.seats.sort((a, b) => a.constituency.name.localeCompare(b.constituency.name));
        setGroups(sortedGroups);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [electionType]);

  if (loading) return <div className="tap-hint">Loading {CURRENT_ELECTION_CODE}...</div>;
  if (error) return <div className="no-results">Couldn't load results: {error}</div>;

  // Same matching rule as v10's matchesSearch: case-insensitive substring,
  // empty query matches everything.
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string) => !query || name.toLowerCase().includes(query);

  const visibleGroups = groups
    .map((group) => ({ ...group, seats: group.seats.filter((s) => matchesSearch(s.constituency.name)) }))
    .filter((group) => group.seats.length > 0);

  if (!visibleGroups.length) {
    return <div className="no-results">{query ? `No constituency matching "${searchQuery}"` : `No results available for ${CURRENT_ELECTION_CODE} yet.`}</div>;
  }

  return (
    <div style={{ padding: "0 0 80px" }}>
      {visibleGroups.map((group) => (
        <div key={group.shortName}>
          <div className="region-header">
            <div className="region-name">{group.shortName.toUpperCase()} REGION</div>
            <div className="region-count">{group.seats.length} seats</div>
          </div>
          <div className="region-body expanded">
            {group.seats.map((seat) => {
              const topTwo = pickTopTwo(seat.results);
              const isDeclared = seat.status === "DECLARED" && seat.totalStations > 0;
              return (
                <div className="constituency-row" key={seat.constituency.ecCode}>
                  <div className="row-top">
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
