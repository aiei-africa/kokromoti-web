"use client";
import { useEffect, useState } from "react";
import { api, type Region, type RegionResults } from "@/lib/api";
import CandidateResultRow from "../CandidateResultRow";

export default function RegionsPanel({
  electionType, electionCode,
}: { electionType: "presidential" | "parliamentary"; electionCode: string }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regionData, setRegionData] = useState<RegionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.regions().then((r) => {
      setRegions(r.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
  }, []);

  async function openRegion(region: Region) {
    if (expandedId === region.id) { setExpandedId(null); setRegionData(null); return; }
    setExpandedId(region.id);
    setRegionData(null);
    try {
      const data = await api.regionResults(region.id, electionCode, electionType.toUpperCase() as "PRESIDENTIAL" | "PARLIAMENTARY");
      setRegionData(data);
    } catch {
      setRegionData(null);
    }
  }

  if (loading) return <div className="tap-hint">Loading regions...</div>;

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div className="regions-status-bar">
        <span className="regions-title">🗺️ ALL 16 REGIONS</span>
        <span className="regions-subtitle">{regions.length} regions</span>
      </div>
      {regions.map((region) => (
        <div key={region.id}>
          <div className="region-header" onClick={() => openRegion(region)}>
            <div className="region-name">{region.name}</div>
            <div className="region-count">{region._count.constituencies} constituencies</div>
          </div>
          {expandedId === region.id && (
            <div className="constituency-row">
              {regionData ? (
                <>
                  <div className="row-top">
                    <div className="constituency-name">
                      Turnout: {regionData.turnoutPct?.toFixed(1) ?? "—"}%
                    </div>
                  </div>
                  <CandidateResultRow results={regionData.results} />
                </>
              ) : (
                <div className="no-results">Loading {region.name}...</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
