"use client";
import { useEffect, useState } from "react";
import { api, type Region, type RegionResults } from "@/lib/api";
import { CURRENT_ELECTION_CODE } from "@/lib/results";
import GhanaFlag from "../GhanaFlag";

const FALLBACK_COLOUR = "#5C6E8A";
const OTHER_COLOUR = "#94A3B8";

interface RegionCardData {
  region: Region;
  data: RegionResults | null;
}

export default function RegionsPanel({ electionType }: { electionType: "presidential" | "parliamentary" }) {
  const [cards, setCards] = useState<RegionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const type = electionType.toUpperCase() as "PRESIDENTIAL" | "PARLIAMENTARY";

    api.regions().then(async (regions) => {
      const sorted = [...regions].sort((a, b) => a.name.localeCompare(b.name));
      const results = await Promise.all(
        sorted.map((r) => api.regionResults(r.id, CURRENT_ELECTION_CODE, type).catch(() => null))
      );
      if (cancelled) return;
      setCards(sorted.map((region, i) => ({ region, data: results[i] })));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [electionType]);

  if (loading) return <div className="tap-hint">Loading regions...</div>;

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
      {cards.map(({ region, data }) => {
        const totalConst = region._count.constituencies;
        const declaredConst = data?.constituenciesReporting ?? 0;
        const isExpanded = expandedId === region.id;
        // Top 3 parties by vote share — generalized, not hardcoded to any
        // specific party, matching the same principle used everywhere else
        // (v10's real design hardcodes NDC/NPP/OTH since its data was
        // two-party simulated; real historical data has N parties).
        const top3 = data?.results.slice(0, 3) ?? [];

        return (
          <div className="reg-card" key={region.id} onClick={() => setExpandedId(isExpanded ? null : region.id)} style={{ cursor: "pointer" }}>
            <div className="reg-card-top">
              <div className="reg-card-flag"><GhanaFlag size={24} /></div>
              <div className="reg-card-name">{region.name}</div>
            </div>

            <div className="reg-stats">
              <div className="reg-stat">
                <div className="reg-stat-label">Constituencies</div>
                <div className="reg-stat-value">{declaredConst} / {totalConst}</div>
                <div className="reg-stat-sub">{declaredConst === 0 ? "None declared" : declaredConst === totalConst ? "All declared" : "Declared"}</div>
              </div>
              <div className="reg-stat">
                <div className="reg-stat-label">Turnout Rate</div>
                <div
                  className="reg-stat-value"
                  style={{ color: !data?.turnoutPct ? "var(--muted)" : data.turnoutPct > 60 ? "var(--ndc-light)" : data.turnoutPct > 40 ? "var(--gold)" : "var(--muted)" }}
                >
                  {data?.turnoutPct ? `${data.turnoutPct.toFixed(1)}%` : "—"}
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
                          {c.votePct.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isExpanded && data && (
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
      })}
    </div>
  );
}
