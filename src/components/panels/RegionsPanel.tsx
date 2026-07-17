"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type Region, type PresidentialNational, type ParliamentarySummary } from "@/lib/api";
import CandidateResultRow from "../CandidateResultRow";
import GhanaFlag from "../GhanaFlag";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

// RegionsPanel is the regional-level mirror of GhanaPanel — same
// template, same behaviour, scoped to one region instead of the whole
// country. UPDATED (17 Jul 2026): summary content is fully type-scoped to
// the active Presidential/Parliamentary tab (matches GhanaPanel's own
// correction) — Presidential tab shows only the presidential candidate
// list; Parliamentary tab shows total votes summed BY PARTY (full party
// name, not a person — no single candidate represents a party's regional
// parliamentary result) alongside the real seat tally with its majority
// badge. Never both simultaneously, and never a sum of individual
// candidates' votes for Parliamentary (that's meaningless across ~5-30
// different people per region).
interface RegionSummaryData {
  region: Region;
  presidential: PresidentialNational | null;
  votesByParty: PresidentialNational | null;
  seatSummary: ParliamentarySummary | null;
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
          electionType === "presidential"
            ? Promise.all([
                api.presidentialRegional(electionYear, r.id).catch(() => null),
                Promise.resolve(null),
                Promise.resolve(null),
              ])
            : Promise.all([
                Promise.resolve(null),
                api.parliamentaryRegionalVotesByParty(electionYear, r.id).catch(() => null),
                api.parliamentaryRegionalSummary(electionYear, r.id).catch(() => null),
              ])
        )
      );
      if (cancelled) return;
      setCards(sorted.map((region, i) => ({ region, presidential: results[i][0], votesByParty: results[i][1], seatSummary: results[i][2] })));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [electionType, electionYear]);

  function renderRegionSummary({ region, presidential, votesByParty, seatSummary }: RegionSummaryData, clickable: boolean) {
    const hasAny =
      (electionType === "presidential" && presidential && presidential.results.length > 0) ||
      (electionType === "parliamentary" && ((votesByParty && votesByParty.results.length > 0) || (seatSummary && seatSummary.declaredSeats > 0)));

    return (
      <div key={region.id}>
        <div
          className="ghana-status-bar"
          onClick={clickable ? () => onFocusRegion(region.shortName) : undefined}
          style={{ cursor: clickable ? "pointer" : "default" }}
        >
          <span className="ghana-panel-title"><GhanaFlag size={18} /> {region.name.toUpperCase()}</span>
        </div>

        {electionType === "presidential" && presidential && presidential.results.length > 0 && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">Presidential — {presidential.election}</div>
            </div>
            <CandidateResultRow results={presidential.results} />
          </div>
        )}

        {electionType === "parliamentary" && votesByParty && votesByParty.results.length > 0 && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">Parliamentary — {votesByParty.election} — Total Votes by Party</div>
            </div>
            <CandidateResultRow results={votesByParty.results} />
          </div>
        )}

        {electionType === "parliamentary" && seatSummary && seatSummary.declaredSeats > 0 && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">
                Parliamentary — {seatSummary.election} — {seatSummary.declaredSeats}/{seatSummary.totalSeats} seats declared
              </div>
              {seatSummary.hasMajority && <span className="declared-badge">MAJORITY</span>}
            </div>
            <div className="candidates">
              {seatSummary.parties.map((p) => (
                <div className="candidate-row" key={p.abbreviation}>
                  <div
                    className="party-pill"
                    style={{ background: `${p.colourHex || "#5C6E8A"}22`, color: p.colourHex || "#5C6E8A", border: `1px solid ${p.colourHex || "#5C6E8A"}55` }}
                  >
                    {p.abbreviation}
                  </div>
                  <div className="candidate-name">{p.seats} seats</div>
                  <div className="candidate-pct" style={{ color: "var(--muted)" }}>
                    {((p.seats / seatSummary.totalSeats) * 100).toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAny && <div className="no-results">No data available for {region.name} yet.</div>}
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
