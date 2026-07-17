"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type Region, type RegionResults } from "@/lib/api";
import GhanaFlag from "../GhanaFlag";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

const FALLBACK_COLOUR = "#5C6E8A";

interface RegionCardData {
  region: Region;
  data: RegionResults | null;
}

// RegionsPanel is the regional-level mirror of GhanaPanel — same template,
// same order: summary "league table" stats first, interactive map +
// trend chart below. Regional is just Ghana's national aggregation scoped
// to one region instead of the whole country; both must look and behave
// the same way, just at a different level.
//
// regionFocus is set either by tapping a region on the Ghana tab's
// national map, OR by tapping a region's own card here — both lead to the
// exact same single-region drill-down. No static per-constituency text
// list anywhere in this file — that content is redundant with the real,
// interactive map below it (tap any constituency on the map to open its
// actual drilldown), and repeating it as static text was the outdated
// pattern this was built to replace.
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

  // The "league table" summary — constituencies declared, turnout, top-3
  // party running total. Same content whether shown in the card list or
  // at the top of a single region's drill-down; only `clickable` differs.
  function renderRegionSummary({ region, data }: RegionCardData, clickable: boolean) {
    const totalConst = region._count.constituencies;
    const declaredConst = data?.constituenciesReporting ?? 0;
    const top3 = data?.results.slice(0, 3) ?? [];

    return (
      <div
        className="reg-card"
        key={region.id}
        onClick={clickable ? () => onFocusRegion(region.shortName) : undefined}
        style={{ cursor: clickable ? "pointer" : "default" }}
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
      </div>
    );
  }

  if (regionFocus) {
    const focused = cards.find((c) => c.region.shortName === regionFocus);
    return (
      <div>
        <div className="ghana-status-bar">
          <span className="ghana-panel-title">{regionFocus.toUpperCase()}</span>
        </div>
        {/* Same template as GhanaPanel: summary stats on top, dashboard
            (map + trend chart) below — regional is just this same
            aggregation scoped to one region instead of the whole country. */}
        {focused ? (
          <div style={{ padding: 12 }}>{renderRegionSummary(focused, false)}</div>
        ) : (
          !loading && <div className="tap-hint" style={{ padding: 20 }}>No data available for {regionFocus} yet.</div>
        )}
        <MapExplorer mode="region-locked" electionType={electionType} regionName={regionFocus} onSelectConstituency={onSelectConstituency} />
      </div>
    );
  }

  if (loading) return <div className="tap-hint">Loading regions...</div>;

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
      {cards.map((cardData) => renderRegionSummary(cardData, true))}
    </div>
  );
}
