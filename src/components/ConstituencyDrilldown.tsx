"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, type ConstituencyFullResult, type ArchiveStation, type CandidateResult } from "@/lib/api";

import type { SelectedConstituency } from "@/app/page";

const MapExplorer = dynamic(() => import("./MapExplorer"), { ssr: false });

type Tab = "summary" | "stations" | "history" | "facts" | "news";
const FALLBACK_COLOUR = "#5C6E8A";

function partyOf(c: CandidateResult) { return c.candidate?.party ?? c.party ?? null; }
function nameOf(c: CandidateResult) { return c.candidate?.fullName ?? c.fullName ?? "Unknown"; }
function photoOf(c: CandidateResult) { return c.candidate?.photoUrl ?? null; }
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Nana|Hon\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

// NOTE (audit, 17 Jul 2026): the old HistoryTrendChart component (SVG line
// chart + tooltip, ~200 lines) that used to live here was removed — it had
// been fully dead code since the "history" tab was switched over to
// MapExplorer (which fetches and renders its own trend chart). Nothing in
// this file called it any longer; ConstituencyHistory/TrendPoint/TrendSeries
// types and their only consumer are gone together.

export default function ConstituencyDrilldown({
  constituency, electionType, electionYear, onClose, initialTab,
}: {
  constituency: SelectedConstituency;
  electionType: "presidential" | "parliamentary";
  electionYear: string;
  onClose: () => void;
  initialTab?: Tab; // arriving via the map explorer opens straight to "history" instead of the default "summary"
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "summary");
  const [result, setResult] = useState<ConstituencyFullResult | null>(null);
  const [stations, setStations] = useState<ArchiveStation[] | null>(null);
  const [facts, setFacts] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const electionCode = electionYear;

  useEffect(() => {
    setLoading(true);
    const resultFetch =
      electionType === "presidential"
        ? api.presidentialConstituency(electionCode, constituency.id)
        : api.parliamentaryConstituency(electionCode, constituency.id);

    Promise.all([
      resultFetch.catch(() => null),
      api.constituency(constituency.id).catch(() => null),
    ]).then(([r, detail]: [any, any]) => {
      setResult(r);
      setFacts(detail?.facts ?? null);
      setLoading(false);
    });

    // AUDIT FIX (17 Jul 2026): electionCode was read above but missing from
    // this dependency array — switching years via ElectionYearTabs while a
    // constituency drilldown was already open never re-fetched, silently
    // showing stale data from whichever year was active when it first
    // opened. Also reset stations here, so the Stations tab's own effect
    // (below) correctly refetches for the new year too, instead of keeping
    // whatever it last loaded under its own now-stale !stations guard.
    setStations(null);
  }, [constituency.id, electionType, electionCode]);

  useEffect(() => {
    if (tab === "stations" && !stations) {
      // Same era-matching principle as ResultsPanel: base this on the
      // actual year shown, not hardcoded to always-current. This was a
      // real latent bug — always fetching the current 2024 register even
      // while Parliamentary was still showing 2020 data, silently
      // mismatched the whole time.
      const fetchStations = electionCode === "2024" ? api.stationsCurrent(constituency.id) : api.stationsArchive(constituency.id);
      fetchStations.then(setStations).catch(() => setStations([]));
    }
  }, [tab, constituency.id, electionType, electionCode, stations]);

  const sortedVotes = result?.votes ? [...result.votes].sort((a, b) => b.votePct - a.votePct) : [];
  const leader = sortedVotes[0];
  const runnerUp = sortedVotes[1];
  const margin = leader && runnerUp ? ((leader.votePct ?? 0) - (runnerUp.votePct ?? 0)).toFixed(2) : null;

  return (
    <div className="drilldown-overlay open">
      <div className={`dd-shell${tab === "history" ? " dd-shell--wide" : ""}`}>
      <div className="dd-topbar">
        <div className="dd-top-row">
          <button className="dd-back" onClick={onClose}>←</button>
          <div className="dd-title">
            <div className="dd-const-name">{constituency.name}</div>
            <div className="dd-region-name">{constituency.regionName.toUpperCase()} REGION</div>
          </div>
        </div>
        <div className="dd-tabs">
          {(["summary", "stations", "history", "facts", "news"] as Tab[]).map((t) => (
            <div key={t} className={`dd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "history" ? "Hist. Trend" : t}
            </div>
          ))}
        </div>
      </div>

      <div className="dd-content">
        {loading && <div className="tap-hint" style={{ padding: 24 }}>Loading {constituency.name}...</div>}

        {!loading && tab === "summary" && result && (
          <>
            {leader && (
              <div className="dd-leader-banner">
                {photoOf(leader) ? (
                  <img
                    src={photoOf(leader)!}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${partyOf(leader)?.colourHex || FALLBACK_COLOUR}55` }}
                  />
                ) : (
                  <div className="dd-cand-avatar" style={{ background: `${partyOf(leader)?.colourHex || FALLBACK_COLOUR}22`, color: partyOf(leader)?.colourHex || FALLBACK_COLOUR, border: `1px solid ${partyOf(leader)?.colourHex || FALLBACK_COLOUR}55` }}>
                    {initialsOf(nameOf(leader))}
                  </div>
                )}
                <div
                  className="dd-leader-party"
                  style={{ background: `${partyOf(leader)?.colourHex || FALLBACK_COLOUR}22`, color: partyOf(leader)?.colourHex || FALLBACK_COLOUR, border: `1px solid ${partyOf(leader)?.colourHex || FALLBACK_COLOUR}55` }}
                >
                  {partyOf(leader)?.abbreviation ?? "IND"}
                </div>
                <div className="dd-leader-name">{nameOf(leader)}</div>
                <div className="dd-leader-pct" style={{ color: partyOf(leader)?.colourHex || FALLBACK_COLOUR }}>
                  {(leader.votePct ?? 0).toFixed(2)}%
                </div>
              </div>
            )}

            <div className="dd-candidates">
              {sortedVotes.map((c) => {
                const party = partyOf(c);
                const colour = party?.colourHex || FALLBACK_COLOUR;
                return (
                  <div className="dd-cand-row" key={party?.abbreviation ?? nameOf(c)}>
                    {photoOf(c) ? (
                      <img
                        src={photoOf(c)!}
                        alt=""
                        className="dd-cand-avatar"
                        style={{ objectFit: "cover", border: `1px solid ${colour}55` }}
                      />
                    ) : (
                      <div className="dd-cand-avatar" style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}>
                        {initialsOf(nameOf(c))}
                      </div>
                    )}
                    <div className="dd-cand-pill" style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}>
                      {party?.abbreviation ?? "IND"}
                    </div>
                    <div className="dd-cand-name">{nameOf(c)}</div>
                    <div className="dd-cand-bar-wrap">
                      <div className="dd-cand-bar" style={{ width: `${c.votePct}%`, background: colour }} />
                    </div>
                    <div className="dd-cand-votes">{c.votes.toLocaleString()}</div>
                    <div className="dd-cand-pct" style={{ color: colour }}>{(c.votePct ?? 0).toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>

            <div className="dd-vote-accounting">
              <div className="dd-vote-accounting-hdr">Vote Accounting</div>
              <div className="dd-va-row"><span className="dd-va-label">Registered Voters</span><span className="dd-va-value">{result.registeredVoters?.toLocaleString() ?? "—"}</span></div>
              <div className="dd-va-row"><span className="dd-va-label">Votes Cast</span><span className="dd-va-value">{result.totalCast?.toLocaleString() ?? "—"}</span></div>
              <div className="dd-va-row"><span className="dd-va-label">Valid Votes</span><span className="dd-va-value highlight">{result.validVotes?.toLocaleString() ?? "—"}</span></div>
              <div className="dd-va-row"><span className="dd-va-label">Rejected Ballots</span><span className="dd-va-value warn">{result.rejectedBallots?.toLocaleString() ?? "—"}</span></div>
              <div className="dd-va-row"><span className="dd-va-label">Turnout Rate</span><span className="dd-va-value highlight">{result.turnoutPct?.toFixed(2) ?? "—"}%</span></div>
            </div>

            <div className="dd-stats-grid">
              <div className="dd-stat">
                <div className="dd-stat-label">Status</div>
                <div className="dd-stat-value">{result.status}</div>
              </div>
              <div className="dd-stat">
                <div className="dd-stat-label">Margin</div>
                <div className="dd-stat-value">{margin ? `${margin}%` : "—"}</div>
                <div className="dd-stat-sub">{leader && (partyOf(leader)?.abbreviation ?? "IND")} advantage</div>
              </div>
              <div className="dd-stat">
                <div className="dd-stat-label">Region</div>
                <div className="dd-stat-value">{constituency.regionName.toUpperCase()}</div>
              </div>
              <div className="dd-stat">
                <div className="dd-stat-label">Election</div>
                <div className="dd-stat-value">{electionCode}</div>
              </div>
            </div>
          </>
        )}

        {!loading && tab === "summary" && !result && (
          <div className="no-results" style={{ padding: 24 }}>No {electionType} result on record for this constituency in {electionCode}.</div>
        )}

        {tab === "stations" && (
          <div style={{ padding: "8px 0" }}>
            {!stations && <div className="tap-hint" style={{ padding: 24 }}>Loading stations...</div>}
            {stations && stations.length === 0 && (
              <div className="no-results" style={{ padding: 24 }}>No archived station records for this constituency.</div>
            )}
            {stations && stations.length > 0 && (
              <>
                <div className="dd-vote-accounting-hdr" style={{ padding: "8px 16px" }}>
                  {stations.length} STATIONS · {electionCode === "2024" ? "2024 EC REGISTER" : "2012–2016 LEGACY REGISTER"}
                </div>
                {stations.map((s) => (
                  <div className="dd-va-row" style={{ padding: "6px 16px" }} key={s.code}>
                    <span className="dd-va-label">{s.name}</span>
                    <span className="dd-va-value" style={{ fontWeight: 400 }}>{s.registeredVoters?.toLocaleString() ?? "—"}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "history" && (
          <div style={{ padding: "12px 16px 0" }}>
            <MapExplorer mode="constituency-isolated" electionType={electionType} constituencyId={constituency.id} constituencyName={constituency.name} />
          </div>
        )}

        {tab === "facts" && (
          <div style={{ padding: 20 }}>
            {facts ? (
              <p style={{ color: "var(--white)", fontSize: 14, lineHeight: 1.6 }}>{facts}</p>
            ) : (
              <div className="no-results">No historical notes on record for this constituency yet.</div>
            )}
            <div className="dd-profile-section" style={{ marginTop: 20 }}>
              <div className="dd-profile-hdr">CONSTITUENCY PROFILE</div>
              <div className="dd-profile-grid">
                <div className="dd-profile-item">
                  <div className="dd-profile-item-label">Region</div>
                  <div className="dd-profile-item-value">{constituency.regionName}</div>
                </div>
                <div className="dd-profile-item">
                  <div className="dd-profile-item-label">Registered Voters ({electionCode})</div>
                  <div className="dd-profile-item-value">{result?.registeredVoters?.toLocaleString() ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "news" && (
          <div className="no-results" style={{ padding: 24 }}>
            No news content available yet — this tab activates once a real news feed is wired in.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
