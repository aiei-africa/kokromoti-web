"use client";
import { useEffect, useState } from "react";
import { api, type ConstituencySeatResult, type ConstituencyGeo } from "@/lib/api";
import CandidateResultRow from "../CandidateResultRow";

interface RegionGroup {
  shortName: string;
  seats: (ConstituencySeatResult & { regionShortName: string })[];
}

export default function ResultsPanel({
  electionType, electionCode,
}: { electionType: "presidential" | "parliamentary"; electionCode: string }) {
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
          if (!byRegion.has(regionShortName)) byRegion.set(regionShortName, { shortName: regionShortName, seats: [] });
          byRegion.get(regionShortName)!.seats.push({ ...seat, regionShortName });
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
  if (!groups.length) return <div className="no-results">No results available for {electionCode} yet.</div>;

  return (
    <div style={{ padding: "0 0 80px" }}>
      {groups.map((group) => (
        <div key={group.shortName}>
          <div className="region-header">
            <div className="region-name">{group.shortName.toUpperCase()} REGION</div>
            <div className="region-count">{group.seats.length} seats</div>
          </div>
          <div className="region-body expanded">
            {group.seats.map((seat) => (
              <div className="constituency-row" key={seat.constituency.ecCode}>
                <div className="row-top">
                  <div className="constituency-name">{seat.constituency.name}</div>
                  {seat.status === "DECLARED" && <span className="declared-badge">DECLARED</span>}
                </div>
                <CandidateResultRow results={seat.results} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
