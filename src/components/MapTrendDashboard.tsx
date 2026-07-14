"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";

const FALLBACK_COLOUR = "#5C6E8A";
const PARTY_COLOUR: Record<string, string> = { NDC: "#1B6B3A", NPP: "#003082" };
const YEARS = ["1996", "2000", "2004", "2008", "2012", "2016", "2020", "2024"];
const GHANA_BOUNDS = L.latLngBounds([4.3, -3.6], [11.5, 1.5]);

type Scope =
  | { type: "national" }
  | { type: "region"; id: string; name: string }
  | { type: "constituency"; id: string; name: string; region: string | null };

interface TrendPoint { year: number; electionCode: string; votePct: number; }
interface TrendResponse {
  scope: string;
  history: {
    electionCode: string; year: number;
    candidates: { name: string; party: string | null; colourHex: string | null; votes: number; votePct: number }[];
    registeredVoters: number | null; totalCast: number | null; validVotes: number | null;
    rejectedBallots: number | null; turnoutPct: number | null; margin: number | null;
  }[];
  trend: { NDC: { colourHex: string | null; points: TrendPoint[] }; NPP: { colourHex: string | null; points: TrendPoint[] }; Others: { colourHex: string | null; points: TrendPoint[] } };
}

// Combined map + trend dashboard. Map on the left (25% width), chart on the
// right (75%) — the map is a real filter for the chart, not a decoration
// beside it: tapping a region or constituency changes what the chart shows,
// fetched fresh from /map-dashboard/trend for that scope. This is the real,
// database-backed version of the standalone prototype — boundaries and
// trend data both come from the API now (ConstituencyBoundary,
// RegionalResult, NationalResult), not embedded static JSON.
export default function MapTrendDashboard() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const [regionsGeoJSON, setRegionsGeoJSON] = useState<any>(null);
  const [constituenciesGeoJSON, setConstituenciesGeoJSON] = useState<any>(null);
  const [regionIdByShortName, setRegionIdByShortName] = useState<Map<string, string>>(new Map());
  const [mapState, setMapState] = useState<"regions" | "region-filtered" | "all-constituencies">("regions");
  const [currentRegionName, setCurrentRegionName] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope>({ type: "national" });
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // Initial data load: static region boundary file (served from /public —
  // there's no live geometry-union capability in the Node backend, so this
  // stays a pre-computed file, same as the standalone prototype used),
  // constituency boundaries from the new API endpoint, and the region
  // id/shortName lookup needed to call /trend?scope=region&id=<realId>.
  useEffect(() => {
    // Sequenced, not concurrent — the Supabase pool here is capped at 5
    // connections, and firing several requests at once (each doing its own
    // internal queries) was contributing to real P2024 pool-timeout errors
    // observed in testing. The static GeoJSON fetch doesn't touch the DB at
    // all, so it can run independently; the two API calls run one after
    // the other.
    fetch("/ghana-regions-16.geojson").then((r) => r.json()).then(setRegionsGeoJSON);
    (async () => {
      const boundaries = await api.mapConstituencyBoundaries();
      setConstituenciesGeoJSON(boundaries);
      const regions = await api.mapRegions();
      setRegionIdByShortName(new Map(regions.map((r: any) => [r.shortName, r.id])));
    })();
  }, []);

  // Fetch trend data whenever scope changes
  useEffect(() => {
    setSelectedYear(null);
    const params = scope.type === "national" ? "scope=national" : `scope=${scope.type}&id=${scope.id}`;
    api.mapTrend(params).then(setTrendData);
  }, [scope]);

  // Map init (once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: true, maxBounds: GHANA_BOUNDS, maxBoundsViscosity: 0.9, minZoom: 6 }).fitBounds(GHANA_BOUNDS);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO", maxZoom: 12 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  function regionStyle(feature: any) {
    const party = feature.properties.winner_party;
    return { fillColor: PARTY_COLOUR[party] || "#888", weight: 1.5, opacity: 1, color: "#0d1b30", fillOpacity: 0.65 };
  }
  function constStyle(feature: any) {
    const party = feature.properties.winnerParty;
    return { fillColor: party ? (PARTY_COLOUR[party] || "#888") : "#666", weight: 1, opacity: 1, color: "#0d1b30", fillOpacity: party ? 0.65 : 0.3, dashArray: party ? undefined : "4,3" };
  }
  const hiStyle = () => ({ weight: 3, color: "#f2c94c", fillOpacity: 0.8 });

  function clearLayer() { if (layerRef.current && mapRef.current) { mapRef.current.removeLayer(layerRef.current); layerRef.current = null; } }

  function showRegions() {
    if (!mapRef.current || !regionsGeoJSON) return;
    clearLayer();
    setMapState("regions"); setCurrentRegionName(null);
    setScope({ type: "national" });
    const layer = L.geoJSON(regionsGeoJSON, {
      style: regionStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(feature.properties.region, { sticky: true });
        lyr.on({
          mouseover: (e) => (e.target as L.Path).setStyle(hiStyle()),
          mouseout: (e) => layerRef.current?.resetStyle(e.target),
          click: (e) => {
            const regionId = regionIdByShortName.get(feature.properties.region);
            if (regionId) setScope({ type: "region", id: regionId, name: feature.properties.region });
            drillIntoRegion(feature.properties.region, (e.target as L.Polygon).getBounds());
          },
        });
      },
    }).addTo(mapRef.current);
    layerRef.current = layer;
    mapRef.current.fitBounds(GHANA_BOUNDS);
  }

  function drillIntoRegion(regionName: string, bounds: L.LatLngBounds) {
    if (!mapRef.current || !constituenciesGeoJSON) return;
    clearLayer();
    setMapState("region-filtered"); setCurrentRegionName(regionName);
    const filtered = { type: "FeatureCollection", features: constituenciesGeoJSON.features.filter((f: any) => f.properties.region === regionName) };
    const layer = L.geoJSON(filtered as any, {
      style: constStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(feature.properties.name, { sticky: true });
        lyr.on({
          mouseover: (e) => (e.target as L.Path).setStyle(hiStyle()),
          mouseout: (e) => layerRef.current?.resetStyle(e.target),
          click: () => setScope({ type: "constituency", id: feature.properties.constituencyId, name: feature.properties.name, region: feature.properties.region }),
        });
      },
    }).addTo(mapRef.current);
    layerRef.current = layer;
    mapRef.current.fitBounds(bounds, { padding: [16, 16] });
  }

  function showAllConstituencies() {
    if (!mapRef.current || !constituenciesGeoJSON) return;
    clearLayer();
    setMapState("all-constituencies");
    setScope({ type: "national" });
    const layer = L.geoJSON(constituenciesGeoJSON, {
      style: constStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(feature.properties.name, { sticky: true });
        lyr.on({
          mouseover: (e) => (e.target as L.Path).setStyle(hiStyle()),
          mouseout: (e) => layerRef.current?.resetStyle(e.target),
          click: () => setScope({ type: "constituency", id: feature.properties.constituencyId, name: feature.properties.name, region: feature.properties.region }),
        });
      },
    }).addTo(mapRef.current);
    layerRef.current = layer;
    mapRef.current.fitBounds(GHANA_BOUNDS);
  }

  useEffect(() => {
    // All three pieces of data feed into the click handlers built inside
    // showRegions() (constituenciesGeoJSON and regionIdByShortName via
    // closure, not just regionsGeoJSON via props) — if the layer gets
    // built before the other two are ready, every click handler is
    // permanently frozen holding null/empty values from that instant,
    // since Leaflet's imperative event bindings don't get any of React's
    // usual re-render freshness. That was the actual cause of clicks
    // silently doing nothing: the layer was built as soon as the static
    // region file loaded, well before the two sequenced API calls behind
    // it had finished.
    const ready = regionsGeoJSON && constituenciesGeoJSON && regionIdByShortName.size > 0 && mapRef.current;
    if (ready && mapState === "regions" && !layerRef.current) showRegions();
  }, [regionsGeoJSON, constituenciesGeoJSON, regionIdByShortName]);

  return (
    <div style={{ display: "flex", flexDirection: "row", minHeight: "70vh" }} className="map-trend-dashboard">
      <div style={{ width: "25%", minWidth: 260, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
          {mapState === "regions" && <span style={{ fontSize: 12, color: "var(--muted)" }}>16 Regions</span>}
          {mapState === "region-filtered" && (
            <>
              <button onClick={showRegions} style={crumbBtnStyle}>← All Regions</button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{currentRegionName}</span>
              <button onClick={showAllConstituencies} style={{ ...crumbBtnStyle, background: "var(--gold-deep)", borderColor: "var(--gold-deep)", color: "var(--navy-deep)", fontWeight: 700 }}>Reveal All 276</button>
            </>
          )}
          {mapState === "all-constituencies" && (
            <>
              <button onClick={showRegions} style={crumbBtnStyle}>← All Regions</button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>All 276 Constituencies</span>
            </>
          )}
        </div>
        <div ref={mapContainerRef} style={{ flex: 1, minHeight: 320 }} />
      </div>
      <div style={{ width: "75%", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, color: "var(--gold-bright)", fontWeight: 700 }}>
          {scope.type === "national" ? "National" : scope.type === "region" ? `${scope.name} Region` : scope.name}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>
          {scope.type === "national" ? "All 276 constituencies, 1996–2024" : scope.type === "region" ? "Vote totals summed across every constituency in this region" : `${scope.region ?? ""} Region · Presidential results, 1996–2024`}
        </div>
        {trendData && <TrendChart data={trendData} selectedYear={selectedYear} onSelectYear={setSelectedYear} />}
      </div>
    </div>
  );
}

const crumbBtnStyle: CSSProperties = { background: "var(--navy-deep)", border: "1px solid var(--line)", color: "var(--cream)", padding: "6px 10px", borderRadius: 5, fontSize: 11, fontFamily: "inherit", cursor: "pointer", textAlign: "left" };

// Same chart/tooltip design already established and iterated on for the
// single-constituency Hist. Trend tab — reused directly, generalized to
// accept any scope's history/trend shape (identical response format from
// the backend either way, so no branching needed here beyond what the API
// already resolved).
function TrendChart({ data, selectedYear, onSelectYear }: { data: TrendResponse; selectedYear: string | null; onSelectYear: (c: string | null) => void }) {
  const W = 600, H = 300, PAD_L = 40, PAD_R = 14, PAD_T = 16, PAD_B = 26;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const series = [
    { key: "NDC", s: data.trend.NDC, colour: data.trend.NDC.colourHex || PARTY_COLOUR.NDC },
    { key: "NPP", s: data.trend.NPP, colour: data.trend.NPP.colourHex || PARTY_COLOUR.NPP },
    { key: "Others", s: data.trend.Others, colour: "#B71C1C" },
  ];
  const allPct = series.flatMap((s) => s.s.points.map((p) => p.votePct));
  if (allPct.length === 0) return <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>No data for this selection.</div>;
  const yMin = Math.max(0, Math.floor(Math.min(...allPct) / 5) * 5 - 5);
  const yMax = Math.min(100, Math.ceil(Math.max(...allPct) / 5) * 5 + 5);
  const yRange = yMax - yMin || 1;
  const allYears = YEARS.map(Number);
  const xMin = Math.min(...allYears), xMax = Math.max(...allYears);
  const xPos = (y: number) => PAD_L + ((y - xMin) / (xMax - xMin || 1)) * plotW;
  const yPos = (p: number) => PAD_T + plotH - ((p - yMin) / yRange) * plotH;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * yRange);
  const selectedPoint = selectedYear ? series.flatMap((s) => s.s.points).find((p) => p.electionCode === selectedYear) : null;
  const selectedEntry = selectedYear ? data.history.find((h) => h.electionCode === selectedYear) : null;

  let ttX = 0, ttY = 0, TT_W = 0;
  if (selectedPoint) {
    TT_W = W * 0.96;
    const px = xPos(selectedPoint.year), py = yPos(selectedPoint.votePct);
    const roughTTH = 46 + Math.max(1, (selectedEntry?.candidates.length ?? 1)) * 38 + 70;
    ttX = Math.max(4, Math.min(px - TT_W / 2, W - TT_W - 4));
    ttY = py - roughTTH - 10 < PAD_T ? py + 14 : Math.max(PAD_T, py - roughTTH - 10);
  }

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }}>
          {gridLines.map((pct) => (
            <g key={pct}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yPos(pct)} y2={yPos(pct)} stroke="var(--line)" strokeWidth={0.5} opacity={0.5} />
              <text x={PAD_L - 6} y={yPos(pct) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{Math.round(pct)}%</text>
            </g>
          ))}
          {allYears.map((y) => (
            <text key={y} x={xPos(y)} y={H - 8} textAnchor="middle" fontSize={10} fill={selectedPoint?.year === y ? "var(--gold-bright)" : "var(--muted)"} fontWeight={selectedPoint?.year === y ? 700 : 400}>{y}</text>
          ))}
          {series.map(({ key, s, colour }) => {
            if (s.points.length === 0) return null;
            const sorted = [...s.points].sort((a, b) => a.year - b.year);
            const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.year)} ${yPos(p.votePct)}`).join(" ");
            return (
              <g key={key}>
                <path d={path} fill="none" stroke={colour} strokeWidth={2.5} opacity={0.9} />
                {sorted.map((p) => {
                  const isSel = p.electionCode === selectedYear;
                  return (
                    <g key={p.electionCode} onClick={() => onSelectYear(selectedYear === p.electionCode ? null : p.electionCode)} style={{ cursor: "pointer" }}>
                      <circle cx={xPos(p.year)} cy={yPos(p.votePct)} r={16} fill="transparent" />
                      <circle cx={xPos(p.year)} cy={yPos(p.votePct)} r={isSel ? 6 : 4} fill={colour} stroke={isSel ? "#f2c94c" : "none"} strokeWidth={isSel ? 2 : 0} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {selectedEntry && selectedPoint && (
          <div style={{ position: "absolute", left: `${(ttX / W) * 100}%`, top: `${(ttY / H) * 100}%`, width: `${(TT_W / W) * 100}%`, zIndex: 20, background: "#ffffff", border: "1px solid #d5dae3", borderRadius: 8, padding: "12px 14px", boxShadow: "0 6px 24px rgba(0,0,0,0.45)", fontFamily: "inherit", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingBottom: 6, borderBottom: "2px solid #0a1220" }}>
              <span style={{ color: "#0a1220", fontSize: 17, fontWeight: 800 }}>{selectedEntry.year}</span>
              {selectedEntry.margin != null && <span style={{ fontSize: 12, color: "#0a1220", fontWeight: 600 }}>margin +{selectedEntry.margin.toFixed(2)}pt</span>}
            </div>
            {selectedEntry.candidates.length === 0 ? (
              <div style={{ color: "#5C6E8A", fontSize: 13, fontStyle: "italic" }}>No data on record for {selectedEntry.year}.</div>
            ) : (
              <>
                {selectedEntry.candidates.map((c) => (
                  <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, fontSize: 13.5, padding: "6px 0", borderBottom: "1px solid #eef1f5", color: "#0a1220" }}>
                    <span style={{ display: "flex", gap: 6, minWidth: 0, flex: 1 }}>
                      <span style={{ color: c.colourHex || FALLBACK_COLOUR, fontWeight: 800, flexShrink: 0, fontSize: 12 }}>{c.party ?? "IND"}</span>
                      <span style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35, fontWeight: 500 }}>{c.name}</span>
                    </span>
                    <span style={{ flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.votes.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#5C6E8A" }}>{c.votePct.toFixed(2)}%</div>
                    </span>
                  </div>
                ))}
                {(selectedEntry.registeredVoters != null || selectedEntry.totalCast != null) && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #0a1220", fontSize: 12, color: "#0a1220", lineHeight: 1.7 }}>
                    {selectedEntry.registeredVoters != null && <div><strong>{selectedEntry.registeredVoters.toLocaleString()}</strong> registered{selectedEntry.turnoutPct != null && <> · <strong>{selectedEntry.turnoutPct.toFixed(2)}%</strong> turnout</>}</div>}
                    {(selectedEntry.totalCast != null || selectedEntry.validVotes != null) && (
                      <div>
                        {selectedEntry.totalCast != null && <><strong>{selectedEntry.totalCast.toLocaleString()}</strong> cast</>}
                        {selectedEntry.validVotes != null && <> · <strong>{selectedEntry.validVotes.toLocaleString()}</strong> valid</>}
                        {selectedEntry.rejectedBallots != null && <> · <strong>{selectedEntry.rejectedBallots.toLocaleString()}</strong> rejected</>}
                      </div>
                    )}
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
