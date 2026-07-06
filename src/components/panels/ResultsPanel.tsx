"use client";
import { useEffect, useRef, useState } from "react";
import { api, type ConstituencySeatResult, type ConstituencyGeo } from "@/lib/api";
import { currentElectionCodeFor, pickTopTwo } from "@/lib/results";
import CandidateResultRow from "../CandidateResultRow";
import StarButton from "../StarButton";
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
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const electionCode = currentElectionCodeFor(electionType);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveChip(null);

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

  // Measure the filter bar's own height (varies across the responsive
  // tiers), so scroll-margin-top on each region-header can correctly
  // account for BOTH sticky layers (header stack + this bar) — same
  // technique HeaderStack itself uses for the header stack alone.
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;
    const setHeight = () => document.documentElement.style.setProperty("--filter-bar-h", `${el.offsetHeight}px`);
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [groups.length]);

  if (loading) return <div className="tap-hint">Loading {electionCode}...</div>;
  if (error) return <div className="no-results">Couldn't load results: {error}</div>;

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string) => !query || name.toLowerCase().includes(query);

  // Search genuinely filters (hiding non-matches is the correct behavior for
  // "find this constituency"). Region chips do NOT filter — they jump to a
  // section within the full, always-visible list; tapping "All" scrolls
  // back to the top rather than un-hiding anything, since nothing was ever
  // hidden by a chip tap in the first place.
  const visibleGroups = groups
    .map((group) => ({ ...group, seats: group.seats.filter((s) => matchesSearch(s.constituency.name)) }))
    .filter((group) => group.seats.length > 0);

  function jumpToRegion(shortName: string | null) {
    setActiveChip(shortName);
    if (!shortName) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(`region-${shortName}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div className="region-filter-bar" ref={filterBarRef}>
        <div className={`region-filter-chip ${!activeChip ? "active" : ""}`} onClick={() => jumpToRegion(null)}>
          All
        </div>
        {groups.map((g) => (
          <div
            key={g.shortName}
            className={`region-filter-chip ${activeChip === g.shortName ? "active" : ""}`}
            onClick={() => jumpToRegion(g.shortName)}
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
          <div className="region-header" id={`region-${group.shortName}`} style={{ scrollMarginTop: "calc(var(--topbar-h, 97px) + var(--filter-bar-h, 50px))" }}>
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
                  onClick={() => seat.constituencyId && onSelectConstituency({
                    id: seat.constituencyId, name: seat.constituency.name, regionName: group.shortName,
                  })}
                  style={{ cursor: "pointer" }}
                >
                  <div className="row-top">
                    {seat.constituencyId && <StarButton type="CONSTITUENCY" id={seat.constituencyId} />}
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
