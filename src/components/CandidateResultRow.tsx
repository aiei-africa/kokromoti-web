"use client";
import type { CandidateResult } from "@/lib/api";
// Adapted from v10's constituency-row pattern. v10 hard-codes exactly two
// parties (NDC/NPP, simulating a future two-horse race) — real 1992-2016
// data has multi-candidate fields (up to 8 presidential candidates in some
// years), so this generalizes the same visual language across N candidates
// instead, using each party's real colourHex from the API rather than a
// hardcoded ndc/npp class pair.
const FALLBACK_COLOUR = "#5C6E8A"; // v10's --oth-bar / neutral grey, for parties with no assigned colour yet
function partyOf(c: CandidateResult) {
  return c.candidate?.party ?? c.party ?? null;
}
function nameOf(c: CandidateResult) {
  return c.candidate?.fullName ?? c.fullName ?? "Unknown";
}
function photoOf(c: CandidateResult) {
  return c.candidate?.photoUrl ?? null;
}
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Nana|Hon\.|Prof\.|Flt\.|Lt\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
export default function CandidateResultRow({ results }: { results: CandidateResult[] }) {
  if (!results.length) return <div className="no-results">Awaiting results...</div>;
  const leader = results[0];
  const leaderColour = partyOf(leader)?.colourHex || FALLBACK_COLOUR;
  return (
    <>
      <div className="candidates">
        {results.map((c, i) => {
          const party = partyOf(c);
          const colour = party?.colourHex || FALLBACK_COLOUR;
          const isLeader = i === 0;
          const photo = photoOf(c);
          const name = nameOf(c);
          return (
            <div className="candidate-row" key={party?.abbreviation ?? name}>
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${colour}55` }}
                />
              ) : (
                <div
                  style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}
                >
                  {initialsOf(name)}
                </div>
              )}
              <div
                className="party-pill"
                style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}
              >
                {party?.abbreviation ?? "IND"}
              </div>
              <div className="candidate-name">{name}</div>
              {/* Hidden on phone (space-constrained), shown from the laptop
                  tier upward via CSS — see .vote-count in globals.css. Real
                  vote count, not just the share, matching the drilldown
                  detail screen's own "14,949  30.7%" pattern. */}
              <span className="vote-count">({c.votes.toLocaleString()})</span>
              <div
                className="candidate-pct"
                style={{ color: isLeader ? leaderColour : "var(--muted)" }}
              >
                {(c.votePct ?? 0).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="vote-bar">
        {results.map((c, i) => {
          const party = partyOf(c);
          const colour = party?.colourHex || FALLBACK_COLOUR;
          return (
            <div
              key={party?.abbreviation ?? i}
              style={{ width: `${c.votePct}%`, background: colour, height: "100%" }}
            />
          );
        })}
      </div>
    </>
  );
}
