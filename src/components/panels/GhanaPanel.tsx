"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type PresidentialNational, type ParliamentarySummary } from "@/lib/api";
import CandidateResultRow from "../CandidateResultRow";

const MapExplorer = dynamic(() => import("../MapExplorer"), { ssr: false });

// UPDATED (17 Jul 2026): summary content is now fully type-scoped to the
// active Presidential/Parliamentary tab, matching every other panel
// (Results, Regions) instead of always showing both simultaneously. Under
// Parliamentary, the candidate-list-style block now shows PARTIES (full
// name, not a person — no single candidate represents a party's national
// parliamentary result) with their TOTAL SUMMED VOTES across every
// parliamentary candidate of that party — a genuinely different, real
// metric from seats won (they diverge under FPTP), shown alongside the
// real seat tally with its majority badge.
export default function GhanaPanel({ electionType, electionYear, onNavigateToRegion }: { electionType: "presidential" | "parliamentary"; electionYear: string; onNavigateToRegion: (regionName: string) => void }) {
  const [presidential, setPresidential] = useState<PresidentialNational | null>(null);
  const [votesByParty, setVotesByParty] = useState<PresidentialNational | null>(null);
  const [seatSummary, setSeatSummary] = useState<ParliamentarySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPresidential(null);
    setVotesByParty(null);
    setSeatSummary(null);

    if (electionType === "presidential") {
      api.presidentialNational(electionYear).catch(() => null).then((n) => {
        setPresidential(n);
        setLoading(false);
      });
    } else {
      Promise.all([
        api.parliamentaryVotesByParty(electionYear).catch(() => null),
        api.parliamentarySummary(electionYear).catch(() => null),
      ]).then(([v, s]) => {
        setVotesByParty(v);
        setSeatSummary(s);
        setLoading(false);
      });
    }
  }, [electionType, electionYear]);

  return (
    <div id="panel-ghana">
      <div className="ghana-status-bar">
        <span className="ghana-panel-title">🇬🇭 NATIONAL SUMMARY</span>
        <span className="ghana-panel-sub">{loading ? "Aggregating all levels…" : "All-time"}</span>
      </div>

      <div style={{ padding: "0" }}>
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

        {!loading &&
          ((electionType === "presidential" && (!presidential || presidential.results.length === 0)) ||
            (electionType === "parliamentary" && (!votesByParty || votesByParty.results.length === 0) && (!seatSummary || seatSummary.declaredSeats === 0))) && (
            <div className="no-results">No national data available yet.</div>
          )}
      </div>

      <div style={{ padding: "0 0 80px" }}>
        <MapExplorer mode="full" electionType={electionType} onNavigateToRegion={onNavigateToRegion} />
      </div>
    </div>
  );
}
