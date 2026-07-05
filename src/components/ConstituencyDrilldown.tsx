"use client";
import { useEffect, useState } from "react";
import { api, type ConstituencyFullResult, type ArchiveStation, type ConstituencyHistory, type CandidateResult } from "@/lib/api";
import { CURRENT_ELECTION_CODE } from "@/lib/results";
import type { SelectedConstituency } from "@/app/page";

type Tab = "summary" | "stations" | "history" | "facts" | "news";
const FALLBACK_COLOUR = "#5C6E8A";

function partyOf(c: CandidateResult) { return c.candidate?.party ?? c.party ?? null; }
function nameOf(c: CandidateResult) { return c.candidate?.fullName ?? c.fullName ?? "Unknown"; }
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Nana|Hon\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function ConstituencyDrilldown({
  constituency, electionType, onClose,
}: {
  constituency: SelectedConstituency;
  electionType: "presidential" | "parliamentary";
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [result, setResult] = useState<ConstituencyFullResult | null>(null);
  const [stations, setStations] = useState<ArchiveStation[] | null>(null);
  const [history, setHistory] = useState<ConstituencyHistory | null>(null);
  const [facts, setFacts] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const resultFetch =
      electionType === "presidential"
        ? api.presidentialConstituency(CURRENT_ELECTION_CODE, constituency.id)
        : api.parliamentaryConstituency(CURRENT_ELECTION_CODE, constituency.id);

    Promise.all([
      resultFetch.catch(() => null),
      api.constituency(constituency.id).catch(() => null),
    ]).then(([r, detail]: [any, any]) => {
      setResult(r);
      setFacts(detail?.facts ?? null);
      setLoading(false);
    });
  }, [constituency.id, electionType]);

  useEffect(() => {
    if (tab === "stations" && !stations) {
      api.stationsArchive(constituency.id).then(setStations).catch(() => setStations([]));
    }
    if (tab === "history" && !history) {
      const type = electionType.toUpperCase() as "PRESIDENTIAL" | "PARLIAMENTARY";
      api.constituencyHistory(constituency.id, type).then(setHistory).catch(() => null);
    }
  }, [tab, constituency.id, electionType, stations, history]);

  const sortedVotes = result?.votes ? [...result.votes].sort((a, b) => b.votePct - a.votePct) : [];
  const leader = sortedVotes[0];
  const runnerUp = sortedVotes[1];
  const margin = leader && runnerUp ? (leader.votePct - runnerUp.votePct).toFixed(1) : null;

  return (
    <div className="drilldown-overlay open">
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
                <div
                  className="dd-leader-party"
                  style={{ background: `${partyOf(leader)?.colourHex || FALLBACK_COLOUR}22`, color: partyOf(leader)?.colourHex || FALLBACK_COLOUR, border: `1px solid ${partyOf(leader)?.colourHex || FALLBACK_COLOUR}55` }}
                >
                  {partyOf(leader)?.abbreviation ?? "IND"}
                </div>
                <div className="dd-leader-name">{nameOf(leader)}</div>
                <div className="dd-leader-pct" style={{ color: partyOf(leader)?.colourHex || FALLBACK_COLOUR }}>
                  {leader.votePct.toFixed(1)}%
                </div>
              </div>
            )}

            <div className="dd-candidates">
              {sortedVotes.map((c) => {
                const party = partyOf(c);
                const colour = party?.colourHex || FALLBACK_COLOUR;
                return (
                  <div className="dd-cand-row" key={party?.abbreviation ?? nameOf(c)}>
                    <div className="dd-cand-avatar" style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}>
                      {initialsOf(nameOf(c))}
                    </div>
                    <div className="dd-cand-pill" style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}55` }}>
                      {party?.abbreviation ?? "IND"}
                    </div>
                    <div className="dd-cand-name">{nameOf(c)}</div>
                    <div className="dd-cand-bar-wrap">
                      <div className="dd-cand-bar" style={{ width: `${c.votePct}%`, background: colour }} />
                    </div>
                    <div className="dd-cand-votes">{c.votes.toLocaleString()}</div>
                    <div className="dd-cand-pct" style={{ color: colour }}>{c.votePct.toFixed(1)}%</div>
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
              <div className="dd-va-row"><span className="dd-va-label">Turnout Rate</span><span className="dd-va-value highlight">{result.turnoutPct?.toFixed(1) ?? "—"}%</span></div>
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
                <div className="dd-stat-value">{CURRENT_ELECTION_CODE}</div>
              </div>
            </div>
          </>
        )}

        {!loading && tab === "summary" && !result && (
          <div className="no-results" style={{ padding: 24 }}>No {electionType} result on record for this constituency in {CURRENT_ELECTION_CODE}.</div>
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
                  {stations.length} STATIONS · 2012–2016 LEGACY REGISTER
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
          <div>
            {!history && <div className="tap-hint" style={{ padding: 24 }}>Loading history...</div>}
            {history && (
              <>
                <div className="dd-seat-counter">
                  {history.tally.map((t) => (
                    <div className="dd-seat-block" key={t.party}>
                      <div className="dd-seat-num" style={{ color: history.history.find((h) => h.winner?.party === t.party)?.winner?.colourHex || FALLBACK_COLOUR }}>
                        {t.wins}
                      </div>
                      <div className="dd-seat-label">{t.party}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 16px" }}>
                  {history.isSwingSeat ? (
                    <span className="dd-stronghold-badge swing">SWING SEAT</span>
                  ) : history.tally[0] ? (
                    <span
                      className="dd-stronghold-badge"
                      style={{
                        background: `${history.history.find((h) => h.winner?.party === history.tally[0].party)?.winner?.colourHex || FALLBACK_COLOUR}22`,
                        color: history.history.find((h) => h.winner?.party === history.tally[0].party)?.winner?.colourHex || FALLBACK_COLOUR,
                        border: `1px solid ${history.history.find((h) => h.winner?.party === history.tally[0].party)?.winner?.colourHex || FALLBACK_COLOUR}55`,
                      }}
                    >
                      {history.tally[0].party} STRONGHOLD
                    </span>
                  ) : null}
                  <div className="dd-stat-sub" style={{ marginTop: 6 }}>
                    {history.tally.map((t) => `${t.party} ${t.wins}`).join(" / ")} in {history.electionsWithData} elections on record
                  </div>
                </div>
                {history.history.map((h) => (
                  <div className="dd-h2h-year" key={h.electionCode}>
                    <div className="dd-h2h-year-hdr">
                      <span className="dd-h2h-year-label">{h.year}</span>
                      {h.winner && (
                        <span
                          className="dd-h2h-winner-badge"
                          style={{ background: `${h.winner.colourHex || FALLBACK_COLOUR}22`, color: h.winner.colourHex || FALLBACK_COLOUR, border: `1px solid ${h.winner.colourHex || FALLBACK_COLOUR}55` }}
                        >
                          {h.winner.party ?? "IND"}
                        </span>
                      )}
                    </div>
                    {h.winner ? (
                      <div className="dd-h2h-row">
                        <div className="dd-h2h-name">{h.winner.fullName}</div>
                        <div className="dd-h2h-pct" style={{ color: h.winner.colourHex || FALLBACK_COLOUR }}>{h.winner.votePct.toFixed(1)}%</div>
                      </div>
                    ) : (
                      <div className="dd-h2h-turnout">No data on record for {h.year}.</div>
                    )}
                  </div>
                ))}
              </>
            )}
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
                  <div className="dd-profile-item-label">Registered Voters ({CURRENT_ELECTION_CODE})</div>
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
  );
}
