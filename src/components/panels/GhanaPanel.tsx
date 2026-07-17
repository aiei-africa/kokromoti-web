"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type PresidentialNational, type ParliamentarySummary } from "@/lib/api";

import CandidateResultRow from "../CandidateResultRow";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

// Shows both election types simultaneously (unlike Results, which is
// tab-scoped to one type at a time) — so it independently tracks each
// type's own current year rather than depending on any outer tab state.
export default function GhanaPanel({ electionType, electionYear, onNavigateToRegion }: { electionType: "presidential" | "parliamentary"; electionYear: string; onNavigateToRegion: (regionName: string) => void }) {
  const [national, setNational] = useState<PresidentialNational | null>(null);
  const [seatSummary, setSeatSummary] = useState<ParliamentarySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.presidentialNational(electionYear).catch(() => null),
      api.parliamentarySummary(electionYear).catch(() => null),
    ]).then(([n, s]) => {
      setNational(n);
      setSeatSummary(s);
      setLoading(false);
    });
  }, [electionYear]);

  return (
    <div id="panel-ghana">
      <div className="ghana-status-bar">
        <span className="ghana-panel-title">🇬🇭 NATIONAL SUMMARY</span>
        <span className="ghana-panel-sub">{loading ? "Aggregating all levels…" : "All-time"}</span>
      </div>

      <MapExplorer mode="full" electionType={electionType} onNavigateToRegion={onNavigateToRegion} />

      <div style={{ padding: "0 0 80px" }}>
        {national && (
          <div className="constituency-row">
            <div className="row-top">
              <div className="constituency-name">Presidential — {national.election}</div>
            </div>
            <CandidateResultRow results={national.results} />
          </div>
        )}

        {seatSummary && (
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

        {!national && !seatSummary && !loading && (
          <div className="no-results">No national data available yet.</div>
        )}
      </div>
    </div>
  );
}
