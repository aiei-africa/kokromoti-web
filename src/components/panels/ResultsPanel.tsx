"use client";
import { useEffect, useState } from "react";
import { api, type ConstituencySeatResult, type ConstituencyGeo, type Region } from "@/lib/api";
import { currentElectionCodeFor, pickTopTwo } from "@/lib/results";
import CandidateResultRow from "../CandidateResultRow";
import type { SelectedConstituency } from "@/app/page";

interface RegionGroup {
  shortName: string;
  seats: (ConstituencySeatResult & { constituencyId: string; totalStations: number })[];
}

export default function ResultsPanel({
  electionType, searchQuery, onSelectConstituency,
}: {
  electionType: "presidential" | "parliamentary";
  searchQuery: string;
  onSelectConstituency: (c: SelectedConstituency) => void;
}) {
  const [groups, setGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const electionCode = currentElectionCodeFor(electionType);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRegionFilter(null); // reset when switching Presidential/Parliamentary

    Promise.all([
      api.constituenciesGeo(),
      electionType === "presidential"
        ? api.presidentialByConstituency(electionCode)
        : api.parliamentaryAllSeats(electionCode),
    ])
      .then(([geo, seats]) => {
        if (cancelled) return;
        const geoByName = new Map<string, ConstituencyGeo>(geo.map((g) => [g.name, g]));
        const byRegion = new Map<string, RegionGroup>();

        for (const seat of seats) {
          const g = geoByName.get(seat.constituency.name);
          const regionShortName = g?.region.shortName ?? "Other";
          // Station register accuracy differs by era: the current (2024)
          // register is genuinely accurate for presidential (2024), but for
          // parliamentary (2020) neither the current nor the 2012-2016
          // archive is truly era-matched — the archive is at least
          // chronologically closer, so it's used as the better-available
          // approximation rather than the more mismatched current count.
          const totalStations = electionType === "presidential"
            ? g?._count?.pollingStations ?? 0
            : g?._count?.pollingStationArchive ?? 0;
          if (!byRegion.has(regionShortName)) byRegion.set(regionShortName, { shortName: regionShortName, seats: [] });
          byRegion.get(regionShortName)!.seats.push({ ...seat, constituencyId: g?.id ?? "", totalStations });
        }

        const sortedGroups = [...byRegion.values()].sort((a, b) => a.shortName.localeCompare(b.shortName));
        for (const group of sortedGroups) group.seats.sort((a, b) => a.constituency.name.localeCompare(b.constituency.name));
        setGroups(sortedGroups);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [electionType, electionCode]);

  if (loading) return <div className="tap-hint">Loading {electionCode}...</div>;
  if (error) return <div className="no-results">Couldn't load results: {error}</div>;

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string) => !query || name.toLowerCase().includes(query);

  const visibleGroups = groups
    .map((group) => ({ ...group, seats: group.seats.filter((s) => matchesSearch(s.constituency.name)) }))
    .filter((group) => group.seats.length > 0)
    .filter((group) => !regionFilter || group.shortName === regionFilter);

  return (
    <div style={{ padding: "0 0 80px" }}>
      {/* Region filter chips — jump straight to one region instead of
          scrolling past 270+ constituency cards. "All" clears the filter. */}
      <div className="region-filter-bar">
        <div
          className={`region-filter-chip ${!regionFilter ? "active" : ""}`}
          onClick={() => setRegionFilter(null)}
        >
          All
        </div>
        {groups.map((g) => (
          <div
            key={g.shortName}
            className={`region-filter-chip ${regionFilter === g.shortName ? "active" : ""}`}
            onClick={() => setRegionFilter(regionFilter === g.shortName ? null : g.shortName)}
          >
            {g.shortName}
          </div>
        ))}
      </div>

      {!visibleGroups.length && (
        <div className="no-results">
          {query ? `No constituency matching "${searchQuery}"` : `No results available for ${electionCode} yet.`}
        </div>
      )}

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
                <div
                  className="constituency-row"
                  key={seat.constituency.ecCode}
                  onClick={() => seat.constituencyId && onSelectConstituency({
                    id: seat.constituencyId, name: seat.constituency.name, regionName: group.shortName,
                  })}
                  style={{ cursor: "pointer" }}
                >
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
