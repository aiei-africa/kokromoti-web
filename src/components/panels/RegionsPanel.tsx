"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type Region, type PresidentialNational, type ParliamentarySummary } from "@/lib/api";
import CandidateResultRow from "../CandidateResultRow";
import GhanaFlag from "../GhanaFlag";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

// RegionsPanel is the regional-level mirror of GhanaPanel — same template,
// same behaviour, just scoped to one region instead of the whole country.
// Confirmed against GhanaPanel's actual current code (17 Jul 2026): the
// text summary shows BOTH Presidential (full candidate list via
// CandidateResultRow — same component/classes Results uses) AND
// Parliamentary (real seat tally with a majority badge) SIMULTANEOUSLY,
// completely independent of the Presidential/Parliamentary top tab —
// electionType only drives the map + trend chart below, exactly as it
// does in GhanaPanel. Both national and regional seat tallies use the
// same real method (winner per constituency, tallied by party) — never a
// sum of individual candidates' votes, which is meaningless for
// Parliamentary (each constituency has a different person running).
interface RegionSummaryData {
  region: Region;
  presidential: PresidentialNational | null;
  parliamentary: ParliamentarySummary | null;
}

export default function RegionsPanel({
  electionType, electionYear, regionFocus, onSelectConstituency, onFocusRegion,
}: {
  electionType: "presidential" | "parliamentary";
  electionYear: string;
  regionFocus: string | null;
  onSelectConstituency: (id: string, name: string, region: string | null) => void;
  onFocusRegion: (regionShortName: string) => void;
}) {
  const [cards, setCards] = useState<RegionSummaryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.regions().then(async (regions) => {
      const sorted = [...regions].sort((a, b) => a.name.localeCompare(b.name));
      const results = await Promise.all(
        sorted.map((r) =>
          Promise.all([
            api.presidentialRegional(electionYear, r.id).catch(() => null),
            api.parliamentaryRegionalSummary(electionYear, r.id).catch(() => null),
          ])
        )
      );
      if (cancelled) return;
      setCards(sorted.map((region, i) => ({ region, presidential: results[i][0], parliamentary: results[i][1] })));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [electionYear]);

  function renderRegionSummary({ region, presidential, parliamentary }: RegionSummaryData, clickable: boolean) {
    return (
      <div key={region.id}>
        <div
          className="ghana-status-bar"
          onClick={clickable ? () => onFocusRegion(region.shortName) : undefined}
          style={{ cursor: clickable ? "pointer" : "default" }}
        >
          <span className="ghana-panel-title"><GhanaFlag size={18} /> {region.name.toUpperCase()}</span>
        </div>

        {presidential && presidential.results.length > 0 && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">Presidential — {presidential.election}</div>
            </div>
            <CandidateResultRow results={presidential.results} />
          </div>
        )}

        {parliamentary && parliamentary.declaredSeats > 0 && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">
                Parliamentary — {parliamentary.election} — {parliamentary.declaredSeats}/{parliamentary.totalSeats} seats declared
              </div>
              {parliamentary.hasMajority && <span className="declared-badge">MAJORITY</span>}
            </div>
            <div className="candidates">
              {parliamentary.parties.map((p) => (
                <div className="candidate-row" key={p.abbreviation}>
                  <div
                    className="party-pill"
                    style={{ background: `${p.colourHex || "#5C6E8A"}22`, color: p.colourHex || "#5C6E8A", border: `1px solid ${p.colourHex || "#5C6E8A"}55` }}
                  >
                    {p.abbreviation}
                  </div>
                  <div className="candidate-name">{p.seats} seats</div>
                  <div className="candidate-pct" style={{ color: "var(--muted)" }}>
                    {((p.seats / parliamentary.totalSeats) * 100).toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!presidential || presidential.results.length === 0) && (!parliamentary || parliamentary.declaredSeats === 0) && (
          <div className="no-results">No data available for {region.name} yet.</div>
        )}
      </div>
    );
  }

  if (regionFocus) {
    const focused = cards.find((c) => c.region.shortName === regionFocus);
    return (
      <div>
        {focused ? (
          renderRegionSummary(focused, false)
        ) : (
          <div className="ghana-status-bar">
            <span className="ghana-panel-title">{regionFocus.toUpperCase()}</span>
          </div>
        )}
        <div style={{ padding: "0 0 80px" }}>
          <MapExplorer mode="region-locked" electionType={electionType} regionName={regionFocus} onSelectConstituency={onSelectConstituency} />
        </div>
      </div>
    );
  }

  if (loading) return <div className="tap-hint">Loading regions...</div>;

  return (
    <div style={{ paddingBottom: 80, display: "flex", flexDirection: "column", gap: 4 }}>
      {cards.map((cardData) => renderRegionSummary(cardData, true))}
    </div>
  );
}
