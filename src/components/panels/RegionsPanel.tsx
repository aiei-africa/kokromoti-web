"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type Region, type RegionResults } from "@/lib/api";
import GhanaFlag from "../GhanaFlag";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

const FALLBACK_COLOUR = "#5C6E8A";
const OTHER_COLOUR = "#94A3B8";

interface RegionCardData {
  region: Region;
  data: RegionResults | null;
}

// regionFocus is set either by tapping a region on the Ghana tab's national
// map, OR (as of this fix) by tapping a region's own card here — both now
// lead to the SAME single-region view: the real summary card (stats,
// turnout, party breakdown, full constituency-by-constituency winner list)
// followed by the interactive region-locked map + trend chart. Previously
// tapping a card here only toggled an inline text dropdown of past
// winners, a completely disconnected, weaker interaction from what tapping
// the same region on Ghana's map already did — this unifies the two into
// one real regional-level mirror of GhanaPanel. Direct bottom-nav
// navigation to Regions (regionFocus null) keeps the existing 16-card list
// behaviour, unchanged, as the entry point into either path.
export default function RegionsPanel({
  electionType, electionYear, regionFocus, onSelectConstituency, onFocusRegion,
}: {
  electionType: "presidential" | "parliamentary";
  electionYear: string;
  regionFocus: string | null;
  onSelectConstituency: (id: string, name: string, region: string | null) => void;
  onFocusRegion: (regionShortName: string) => void;
}) {
  const [cards, setCards] = useState<RegionCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const type = electionType.toUpperCase() as "PRESIDENTIAL" | "PARLIAMENTARY";
    const electionCode = electionYear;

    api.regions().then(async (regions) => {
      const sorted = [...regions].sort((a, b) => a.name.localeCompare(b.name));
      const results = await Promise.all(
        sorted.map((r) => api.regionResults(r.id, electionCode, type).catch(() => null))
      );
      if (cancelled) return;
      setCards(sorted.map((region, i) => ({ region, data: results[i] })));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [electionType, electionYear]);

  function renderRegionCard({ region, data }: RegionCardData, expanded: boolean) {
    const totalConst = region._count.constituencies;
    const declaredConst = data?.constituenciesReporting ?? 0;
    const top3 = data?.results.slice(0, 3) ?? [];

    return (
      <div
        className="reg-card"
        key={region.id}
        onClick={expanded ? undefined : () => onFocusRegion(region.shortName)}
        style={{ cursor: expanded ? "default" : "pointer" }}
      >
        <div className="reg-card-top">
          <div className="reg-card-flag"><GhanaFlag size={24} /></div>
          <div className="reg-card-name">{region.name}</div>
        </div>

        <div className="reg-stats">
          <div className="reg-stat">
            <div className="reg-stat-label">{electionType === "presidential" ? "Constituencies" : "Seats"}</div>
            <div className="reg-stat-value">{declaredConst} / {totalConst}</div>
            <div className="reg-stat-sub">{declaredConst === 0 ? "None declared" : declaredConst === totalConst ? "All declared" : "Declared"}</div>
          </div>
          <div className="reg-stat">
            <div className="reg-stat-label">Turnout Rate</div>
            <div
              className="reg-stat-value"
              style={{ color: !data?.turnoutPct ? "var(--muted)" : data.turnoutPct > 60 ? "var(--ndc-light)" : data.turnoutPct > 40 ? "var(--gold)" : "var(--muted)" }}
            >
              {data?.turnoutPct ? `${data.turnoutPct.toFixed(2)}%` : "—"}
            </div>
            <div className="reg-stat-sub">
              {data ? `${data.validVotes.toLocaleString()} Valid / ${data.registeredVoters.toLocaleString()} Reg.` : "Awaiting data"}
            </div>
          </div>
        </div>

        {top3.length > 0 && (
          <div className="reg-pres-row">
            <div className="reg-pres-label">
              {electionType === "presidential" ? "Presidential" : "Parliamentary"} Running Total
            </div>
            <div className="reg-pres-bars">
              {top3.map((c) => {
                const party = c.candidate?.party ?? (c as any).party;
                const colour = party?.colourHex || FALLBACK_COLOUR;
                return (
                  <div className="reg-pres-line" key={party?.abbreviation ?? c.fullName}>
                    <div
                      style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, letterSpacing: ".5px", width: 32, textAlign: "center", flexShrink: 0, background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}
                    >
                      {party?.abbreviation ?? "IND"}
                    </div>
                    <div className="reg-pres-bar-wrap">
                      <div className="reg-pres-bar-fill" style={{ width: `${c.votePct}%`, background: colour }} />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, minWidth: 48, textAlign: "right", color: colour }}>
                      {c.votePct.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expanded && data && data.byConstituency.length > 0 && (
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
            <div className="reg-pres-label" style={{ marginBottom: 8 }}>All constituencies, {region.name}</div>
            {data.byConstituency.map((c) => (
              <div key={c.constituency} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                <span style={{ color: "var(--white)" }}>{c.constituency}</span>
                <span style={{ color: "var(--muted)" }}>{c.winner ? `${c.winner.party} — ${c.winner.fullName}` : "Awaiting result"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (regionFocus) {
    // A real drill-down: title, then straight into the interactive map +
    // trend chart. No summary card, no static constituency-by-constituency
    // text list here — that content duplicated what the map itself already
    // lets you explore interactively (tap any constituency on the map to
    // open its real drilldown), and repeating it as static text was the
    // same "outdated dropdown" pattern this was supposed to replace, just
    // moved to a new screen instead of actually removed.
    return (
      <div>
        <div className="ghana-status-bar">
          <span className="ghana-panel-title">{regionFocus.toUpperCase()}</span>
        </div>
        <MapExplorer mode="region-locked" electionType={electionType} regionName={regionFocus} onSelectConstituency={onSelectConstituency} />
      </div>
    );
  }

  if (loading) return <div className="tap-hint">Loading regions...</div>;

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
      {cards.map((cardData) => renderRegionCard(cardData, false))}
    </div>
  );
}
