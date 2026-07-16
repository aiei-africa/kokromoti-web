"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, type ConstituencyFullResult, type ArchiveStation, type ConstituencyHistory, type CandidateResult } from "@/lib/api";
import { currentElectionCodeFor } from "@/lib/results";
import type { SelectedConstituency } from "@/app/page";

const MapExplorer = dynamic(() => import("./MapExplorer"), { ssr: false });

type Tab = "summary" | "stations" | "history" | "facts" | "news";
const FALLBACK_COLOUR = "#5C6E8A";

function partyOf(c: CandidateResult) { return c.candidate?.party ?? c.party ?? null; }
function nameOf(c: CandidateResult) { return c.candidate?.fullName ?? c.fullName ?? "Unknown"; }
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Nana|Hon\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

type TrendPoint = { year: number; electionCode: string; votePct: number; provisional: boolean };
type TrendSeries = { colourHex: string | null; points: TrendPoint[] };

// Self-contained SVG line chart — no charting library in this project, and
// three lines over ~9 points doesn't need one. Y-axis auto-scales to the
// real data range (not fixed 0-100) so the actual movement is visible
// rather than compressed flat. Provisional points (1992) render hollow,
// not filled, so the source caveat stays visible in the chart itself,
// not just in a footnote beneath it.
// Interactive SVG line chart — no charting library in this project, and
// three lines over ~9 points doesn't need one. Y-axis auto-scales to the
// real data range so movement is actually visible. Provisional points
// (1992) render hollow, not filled. Every point is tappable — the visible
// dot is small, but each carries an invisible, much larger touch target
// (r=14) around it, since a 3.5px circle is not a reliable mobile tap
// Interactive SVG line chart with a floating tooltip. No charting library
// in this project, and three lines over ~9 points doesn't need one.
// Y-axis auto-scales to the real data range so movement is actually
// visible. Provisional points (1992) render hollow, not filled. Tapping a
// point opens a tooltip anchored near that point — there is no separate
// detail block or table anywhere on the page; the tooltip IS the detail
// view. The tooltip itself is a normal HTML element positioned absolutely
// over the chart (not rendered inside the SVG via foreignObject), so it
// can grow to whatever height its content actually needs — an 8-candidate
// year is roughly twice the chart's own height, and a foreignObject-based
// tooltip would overflow past the SVG's box and bleed into the legend/hint
// text below it; a normal HTML block in normal document flow doesn't have
// that failure mode. Tapping the same point again closes it; tapping a
// different point moves it there.
function HistoryTrendChart({ history, trend, allYears }: { history: ConstituencyHistory["history"]; trend: ConstituencyHistory["trend"]; allYears: number[] }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  // Hover previews a point's tooltip on desktop (mouse only — touch devices
  // don't fire mouseenter/mouseleave reliably, so mobile tap-to-pin below
  // is unaffected). A pinned point (selectedCode, set by clicking) takes
  // priority over hover, so hovering elsewhere never disturbs a pin.
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const activeCode = selectedCode ?? hoveredCode;
  const chartRef = useRef<HTMLDivElement>(null);
  const W = 600, H = 220, PAD_L = 34, PAD_R = 12, PAD_T = 14, PAD_B = 24;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;

  // Guard: `history` being truthy at the call site does not guarantee
  // `history.trend` is fully populated — constituencies with no computable
  // trend (e.g. Ablekuma North's 2024 presidential row, whose vote fields
  // are genuinely null) return a history array with an absent/incomplete
  // trend object. MapExplorer.tsx already guards this exact shape;
  // HistoryTrendChart did not, causing the real production crash:
  // "Cannot read properties of undefined (reading 'NDC')".
  if (!trend || !trend.NDC || !trend.NPP || !trend.Others) {
    return (
      <div className="tap-hint" style={{ padding: 24 }}>
        No historical trend data available for this constituency.
      </div>
    );
  }

  const series: { key: "NDC" | "NPP" | "Others"; s: TrendSeries; colour: string }[] = [
    { key: "NDC", s: trend.NDC, colour: trend.NDC.colourHex || "#2e7d4f" },
    { key: "NPP", s: trend.NPP, colour: trend.NPP.colourHex || "#163488" },
    { key: "Others", s: trend.Others, colour: trend.Others.colourHex || "#9db0cc" },
  ];

  const allPct = series.flatMap((s) => s.s.points.map((p) => p.votePct));
  if (allPct.length === 0) return null;
  const yMin = Math.max(0, Math.floor(Math.min(...allPct) / 5) * 5 - 5);
  const yMax = Math.min(100, Math.ceil(Math.max(...allPct) / 5) * 5 + 5);
  const yRange = yMax - yMin || 1;

  const xMin = Math.min(...allYears), xMax = Math.max(...allYears);
  const xRange = xMax - xMin || 1;

  const xPos = (year: number) => PAD_L + ((year - xMin) / xRange) * plotW;
  const yPos = (pct: number) => PAD_T + plotH - ((pct - yMin) / yRange) * plotH;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * yRange);

  const selectedEntry = activeCode ? history.find((h) => h.electionCode === activeCode) : null;
  const selectedPoint = activeCode ? series.flatMap((s) => s.s.points).find((p) => p.electionCode === activeCode) : null;

  function handleTap(code: string) {
    setSelectedCode((prev) => (prev === code ? null : code));
  }

  // Clicking anywhere outside the chart/tooltip dismisses a pinned point.
  // mousedown (not click) is used so it never races with a point's own
  // onClick — clicking a different point stays inside chartRef, so this
  // never interferes with switching the pin from one point to another.
  useEffect(() => {
    if (!selectedCode) return;
    function handleOutside(e: MouseEvent) {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setSelectedCode(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [selectedCode]);

  // Tooltip position — computed in the same 0-600/0-220 coordinate space as
  // the chart, then expressed as percentages so it aligns with the SVG's
  // own rendered box exactly. TT_H here is only a rough estimate used to
  // decide whether the tooltip opens above or below the point — it no
  // longer needs to be precise, because the tooltip is a normal HTML block
  // now (not SVG content), so it grows to whatever height its actual
  // content needs. That's the real fix for the previous bug: an 8-candidate
  // tooltip was taller than the chart's own SVG box, so it overflowed past
  // the SVG entirely and bled into the legend/hint text below it. A normal
  // HTML element in normal document flow doesn't have that failure mode.
  const TT_W = W * 0.96;
  const candCount = selectedEntry ? Math.max(1, (selectedEntry.candidates ?? []).length) : 1;
  const roughTTH = selectedEntry && (selectedEntry.candidates ?? []).length > 0 ? 46 + candCount * 38 : 50;
  let ttX = 0, ttY = 0;
  if (selectedPoint) {
    const px = xPos(selectedPoint.year), py = yPos(selectedPoint.votePct);
    ttX = px + TT_W / 2 > W - PAD_R ? W - PAD_R - TT_W : px - TT_W / 2 < PAD_L ? PAD_L : px - TT_W / 2;
    ttY = py - roughTTH - 10 < PAD_T ? py + 14 : Math.max(PAD_T, py - roughTTH - 10);
    ttX = Math.max(4, Math.min(ttX, W - TT_W - 4));
  }

  return (
    <div style={{ padding: "12px 16px 4px" }}>
      <div style={{ position: "relative" }} ref={chartRef}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }}>
        {gridLines.map((pct) => (
          <g key={pct}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yPos(pct)} y2={yPos(pct)} stroke="var(--line)" strokeWidth={0.5} opacity={0.5} />
            <text x={PAD_L - 6} y={yPos(pct) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{Math.round(pct)}%</text>
          </g>
        ))}
        {allYears.map((y) => {
          const isSel = selectedPoint?.year === y;
          return <text key={y} x={xPos(y)} y={H - 8} textAnchor="middle" fontSize={9} fill={isSel ? "var(--gold)" : "var(--muted)"} fontWeight={isSel ? 700 : 400}>{y}</text>;
        })}
        {series.map(({ key, s, colour }) => {
          if (s.points.length === 0) return null;
          const sorted = [...s.points].sort((a, b) => a.year - b.year);
          const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.year)} ${yPos(p.votePct)}`).join(" ");
          return (
            <g key={key}>
              <path d={path} fill="none" stroke={colour} strokeWidth={2} opacity={0.9} />
              {sorted.map((p) => {
                const isSelected = p.electionCode === activeCode;
                return (
                  <g
                    key={p.electionCode}
                    onClick={() => handleTap(p.electionCode)}
                    onMouseEnter={() => setHoveredCode(p.electionCode)}
                    onMouseLeave={() => setHoveredCode((prev) => (prev === p.electionCode ? null : prev))}
                    style={{ cursor: "pointer" }}
                  >
                    {/* invisible, larger touch target — the visible dot alone is too small to tap reliably on mobile */}
                    <circle cx={xPos(p.year)} cy={yPos(p.votePct)} r={14} fill="transparent" />
                    <circle
                      cx={xPos(p.year)} cy={yPos(p.votePct)} r={isSelected ? 5.5 : 3.5}
                      fill={colour}
                      stroke={colour} strokeWidth={isSelected ? 2 : 0}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
        </svg>

        {selectedEntry && selectedPoint && (
          <div
            style={{
              position: "absolute",
              left: `${(ttX / W) * 100}%`,
              top: `${(ttY / H) * 100}%`,
              width: `${(TT_W / W) * 100}%`,
              zIndex: 20,
              background: "#ffffff", border: "1px solid #d5dae3", borderRadius: 8, boxSizing: "border-box",
              padding: "12px 14px", boxShadow: "0 6px 24px rgba(0,0,0,0.45)", fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingBottom: 6, borderBottom: "2px solid #0a1220" }}>
              <span style={{ color: "#0a1220", fontSize: 17, fontWeight: 800 }}>
                {selectedEntry.year}
              </span>
              {selectedEntry.margin != null && <span style={{ fontSize: 12, color: "#0a1220", fontWeight: 600 }}>margin +{selectedEntry.margin.toFixed(2)}pt</span>}
            </div>
            {(selectedEntry.candidates ?? []).length === 0 ? (
              <div style={{ color: "#5C6E8A", fontSize: 13, fontStyle: "italic" }}>No data on record for {selectedEntry.year}.</div>
            ) : (
              <>
                {selectedEntry.candidates.map((c) => (
                  <div key={c.fullName} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, fontSize: 13.5, padding: "6px 0", borderBottom: "1px solid #eef1f5", color: "#0a1220" }}>
                    <span style={{ display: "flex", gap: 6, minWidth: 0, flex: 1 }}>
                      <span style={{ color: c.colourHex || FALLBACK_COLOUR, fontWeight: 800, flexShrink: 0, fontSize: 12 }}>{c.party ?? "IND"}</span>
                      <span style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35, fontWeight: 500 }}>{c.fullName}</span>
                    </span>
                    <span style={{ flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.votes.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#5C6E8A" }}>{c.votePct.toFixed(2)}%</div>
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #0a1220", fontSize: 12, color: "#0a1220", lineHeight: 1.7 }}>
                  {selectedEntry.registeredVoters != null && <div><strong>{selectedEntry.registeredVoters.toLocaleString()}</strong> registered{selectedEntry.turnoutPct != null && <> · <strong>{selectedEntry.turnoutPct.toFixed(2)}%</strong> turnout</>}</div>}
                  {(selectedEntry.totalCast != null || selectedEntry.validVotes != null) && (
                    <div>
                      {selectedEntry.totalCast != null && <><strong>{selectedEntry.totalCast.toLocaleString()}</strong> cast</>}
                      {selectedEntry.validVotes != null && <> · <strong>{selectedEntry.validVotes.toLocaleString()}</strong> valid</>}
                      {selectedEntry.rejectedBallots != null && <> · <strong>{selectedEntry.rejectedBallots.toLocaleString()}</strong> rejected</>}
                    </div>
                  )}
                  {selectedEntry.stationsTotal != null && (
                    <div><strong>{selectedEntry.stationsReporting ?? "?"}/{selectedEntry.stationsTotal}</strong> stations reporting</div>
                  )}
                </div>
                {selectedEntry.notes && (
                  <div style={{ marginTop: 8, padding: "7px 9px", background: "#fdf3e0", border: "1px solid #e0a83e", borderRadius: 5, fontSize: 11.5, color: "#8a5a10", lineHeight: 1.5 }}>
                    ⚠ {selectedEntry.notes}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConstituencyDrilldown({
  constituency, electionType, onClose, initialTab,
}: {
  constituency: SelectedConstituency;
  electionType: "presidential" | "parliamentary";
  onClose: () => void;
  initialTab?: Tab; // arriving via the map explorer opens straight to "history" instead of the default "summary"
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "summary");
  const [result, setResult] = useState<ConstituencyFullResult | null>(null);
  const [stations, setStations] = useState<ArchiveStation[] | null>(null);
  const [facts, setFacts] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const electionCode = currentElectionCodeFor(electionType);

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
  }, [constituency.id, electionType]);

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
  }, [tab, constituency.id, electionType, stations]);

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
