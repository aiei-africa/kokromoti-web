"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";

const FALLBACK_COLOUR = "#5C6E8A";
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr\.|Nana|Hon\.|Prof\.|Flt\.|Lt\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
const PARTY_COLOUR: Record<string, string> = { NDC: "#1B6B3A", NPP: "#003082" };
const YEARS = ["1996", "2000", "2004", "2008", "2012", "2016", "2020", "2024"];
const FALLBACK_BOUNDS = L.latLngBounds([4.3, -3.6], [11.5, 1.5]);

type Scope =
  | { type: "national" }
  | { type: "region"; id: string; name: string }
  | { type: "constituency"; id: string; name: string; region: string | null };

interface TrendPoint { year: number; electionCode: string; votePct: number; }
interface TrendResponse {
  scope: string;
  history: {
    electionCode: string; year: number;
    candidates: { name: string; party: string | null; colourHex: string | null; photoUrl: string | null; votes: number; votePct: number }[];
    registeredVoters: number | null; totalCast: number | null; validVotes: number | null;
    rejectedBallots: number | null; turnoutPct: number | null; margin: number | null;
  }[];
  trend: { NDC: { colourHex: string | null; points: TrendPoint[] }; NPP: { colourHex: string | null; points: TrendPoint[] }; Others: { colourHex: string | null; points: TrendPoint[] } };
}

interface MapExplorerProps {
  mode: "full" | "region-locked" | "constituency-isolated";
  // Which race's results colour the map and feed the trend chart. Defaults
  // to "presidential" for any caller that doesn't pass it, preserving
  // prior behaviour. Added 16 Jul 2026 — every scope was PRESIDENTIAL-only
  // before this.
  electionType?: "presidential" | "parliamentary";
  regionName?: string;
  constituencyId?: string;
  constituencyName?: string;
  onNavigateToRegion?: (regionName: string) => void;
  onSelectConstituency?: (id: string, name: string, region: string | null) => void;
}

function lockToBounds(map: L.Map, bounds: L.LatLngBounds) {
  if (!bounds.isValid()) return;
  const padded = bounds.pad(0.06);
  map.setMaxBounds(padded);
  const fitZoom = map.getBoundsZoom(bounds, false);
  map.setMinZoom(fitZoom);
}

export default function MapExplorer({ mode, electionType = "presidential", regionName, constituencyId, constituencyName, onNavigateToRegion, onSelectConstituency }: MapExplorerProps) {
  const apiType = electionType === "parliamentary" ? "PARLIAMENTARY" : "PRESIDENTIAL";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const nationalBoundsRef = useRef<L.LatLngBounds | null>(null);
  // Live winner-by-shortName for the requested electionType, merged onto
  // the static regions GeoJSON's baked-in (Presidential-only) properties
  // at render time — see regionStyle().
  const regionWinnerRef = useRef<Map<string, { winnerParty: string | null; winnerColourHex: string | null }>>(new Map());

  const [regionsGeoJSON, setRegionsGeoJSON] = useState<any>(null);
  const [constituenciesGeoJSON, setConstituenciesGeoJSON] = useState<any>(null);
  const [regionIdByShortName, setRegionIdByShortName] = useState<Map<string, string>>(new Map());
  const [mapState, setMapState] = useState<"regions" | "region-filtered" | "all-constituencies">(
    mode === "full" ? "regions" : "region-filtered"
  );

  const [scope, setScope] = useState<Scope>(
    mode === "constituency-isolated" && constituencyId
      ? { type: "constituency", id: constituencyId, name: constituencyName ?? "", region: regionName ?? null }
      : mode === "region-locked" && regionName
      ? { type: "region", id: "", name: regionName }
      : { type: "national" }
  );
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "full") fetch("/ghana-regions-16.geojson").then((r) => r.json()).then(setRegionsGeoJSON);
  }, []);

  // Boundaries + region-winner data both depend on electionType, so both
  // are (re)fetched whenever it changes, not just on mount.
  useEffect(() => {
    (async () => {
      const boundaries = await api.mapConstituencyBoundaries(apiType);
      setConstituenciesGeoJSON(boundaries);
      if (!nationalBoundsRef.current) nationalBoundsRef.current = L.geoJSON(boundaries as any).getBounds();

      const regions = await api.mapRegions(apiType);
      const idMap = new Map(regions.map((r: any) => [r.shortName, r.id]));
      setRegionIdByShortName(idMap);
      regionWinnerRef.current = new Map(regions.map((r: any) => [r.shortName, { winnerParty: r.winnerParty ?? null, winnerColourHex: r.winnerColourHex ?? null }]));

      if (mode === "region-locked" && regionName) {
        const id = idMap.get(regionName);
        if (id) setScope((prev) => (prev.type === "region" ? { ...prev, id } : prev));
      }
    })();
  }, [apiType]);

  // Redraw whatever's currently shown when electionType changes (colours
  // depend on it; geometry does not, so the layer's shape stays the same,
  // only its fill updates). Skipped on the very first mount — the
  // ready-gated effect further down handles initial draw.
  // BUG FOUND IN AUDIT (17 Jul 2026): this used to key off [apiType]
  // directly, which fires the instant the Presidential/Parliamentary tab
  // flips — before the async fetch for the NEW type's data has resolved.
  // The redraw ran with stale (previous race's) geoJSON/region-winner
  // data, and since nothing else re-triggers it once the fresh data
  // actually lands (regionWinnerRef is a ref — updating it doesn't
  // schedule any effect), the map silently kept showing the wrong race's
  // colours until a full remount. Now keyed on the real data finishing
  // its update instead of the type merely changing.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (!mapRef.current || !layerRef.current) return;
    if (mode === "full") { if (mapState === "regions") showRegions(); else showAllConstituencies(); }
    else if (mode === "region-locked" && regionName) showRegionFiltered(regionName, false);
    else if (mode === "constituency-isolated") showIsolatedConstituency();
  }, [constituenciesGeoJSON, regionIdByShortName]);

  useEffect(() => {
    setSelectedYear(null);
    const params = scope.type === "national" ? "scope=national" : `scope=${scope.type}&id=${scope.id}`;
    setTrendData(null);
    if (scope.type !== "region" || scope.id) {
      api.mapTrend(`${params}&type=${apiType}`)
        .then((data) => setTrendData(data && data.trend ? data : null))
        .catch(() => setTrendData(null));
    }
  }, [scope, apiType]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: mode !== "constituency-isolated", dragging: mode !== "constituency-isolated", scrollWheelZoom: mode !== "constituency-isolated", maxBounds: FALLBACK_BOUNDS, maxBoundsViscosity: 0.9, minZoom: mode === "constituency-isolated" ? undefined : 6 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO", maxZoom: 12 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  function regionStyle(feature: any) {
    const live = regionWinnerRef.current.get(feature.properties.region);
    const party = live ? live.winnerParty : feature.properties.winner_party;
    return { fillColor: PARTY_COLOUR[party as string] || "#888", weight: 1.5, opacity: 1, color: "#0d1b30", fillOpacity: 0.65 };
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
    setMapState("regions");
    setScope({ type: "national" });
    const layer = L.geoJSON(regionsGeoJSON, {
      style: regionStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(feature.properties.region, { sticky: true });
        lyr.on({
          mouseover: (e) => (e.target as L.Path).setStyle(hiStyle()),
          mouseout: (e) => layerRef.current?.resetStyle(e.target),
          click: () => onNavigateToRegion?.(feature.properties.region),
        });
      },
    }).addTo(mapRef.current);
    layerRef.current = layer;
    const bounds = nationalBoundsRef.current ?? (layer as any).getBounds();
    mapRef.current.fitBounds(bounds);
    lockToBounds(mapRef.current, bounds);
  }

  function showRegionFiltered(targetRegion: string, fitToBounds: boolean) {
    if (!mapRef.current || !constituenciesGeoJSON) return;
    clearLayer();
    setMapState("region-filtered");
    const filtered = { type: "FeatureCollection", features: constituenciesGeoJSON.features.filter((f: any) => f.properties.region === targetRegion) };
    if (filtered.features.length === 0) {
      console.warn(`No constituencies matched region "${targetRegion}" — check for a naming mismatch between the region source and live data.`);
      return;
    }
    const layer = L.geoJSON(filtered as any, {
      style: constStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(feature.properties.name, { sticky: true });
        lyr.on({
          mouseover: (e) => (e.target as L.Path).setStyle(hiStyle()),
          mouseout: (e) => layerRef.current?.resetStyle(e.target),
          click: () => {
            if (mode === "full") { onSelectConstituency?.(feature.properties.constituencyId, feature.properties.name, feature.properties.region); return; }
            setScope({ type: "constituency", id: feature.properties.constituencyId, name: feature.properties.name, region: feature.properties.region });
          },
        });
      },
    }).addTo(mapRef.current);
    layerRef.current = layer;
    const bounds = (layer as any).getBounds();
    if (fitToBounds) mapRef.current.fitBounds(bounds, { padding: [16, 16] });
    lockToBounds(mapRef.current, bounds);
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
    const bounds = nationalBoundsRef.current ?? (layer as any).getBounds();
    mapRef.current.fitBounds(bounds);
    lockToBounds(mapRef.current, bounds);
  }

  function showIsolatedConstituency() {
    if (!mapRef.current || !constituenciesGeoJSON || !constituencyId) return;
    clearLayer();
    const feature = constituenciesGeoJSON.features.find((f: any) => f.properties.constituencyId === constituencyId);
    if (!feature) return;
    const layer = L.geoJSON(feature, { style: constStyle }).addTo(mapRef.current);
    layerRef.current = layer;
    const bounds = (layer as any).getBounds();
    mapRef.current.fitBounds(bounds, { padding: [8, 8] });
    lockToBounds(mapRef.current, bounds);
  }

  const ready = mode === "full" ? regionsGeoJSON && constituenciesGeoJSON && regionIdByShortName.size > 0 : constituenciesGeoJSON;
  useEffect(() => {
    if (!ready || !mapRef.current || layerRef.current) return;
    if (mode === "full") showRegions();
    else if (mode === "region-locked" && regionName) showRegionFiltered(regionName, true);
    else if (mode === "constituency-isolated") showIsolatedConstituency();
  }, [ready]);

  return (
    <div className="map-explorer">
      <div className="map-explorer-map-col">
        {mode === "full" && (
          <div className="map-explorer-crumb-bar">
            {mapState === "regions" && <span className="map-explorer-crumb-label">16 Regions</span>}
            {mapState === "all-constituencies" && (
              <>
                <button className="map-explorer-crumb-btn" onClick={showRegions}>← All Regions</button>
                <span className="map-explorer-crumb-label">All 276 Constituencies</span>
              </>
            )}
          </div>
        )}
        <div ref={mapContainerRef} className={mode === "constituency-isolated" ? "const-isolated-map" : "map-explorer-canvas"} />
        {mode === "full" && mapState === "regions" && (
          <div style={{ padding: 10 }}>
            <button className="map-explorer-crumb-btn primary" onClick={showAllConstituencies} style={{ width: "100%" }}>Reveal All 276 Constituencies</button>
          </div>
        )}
      </div>
      <div className="map-explorer-chart-col">
        {trendData ? <TrendChart data={trendData} selectedYear={selectedYear} onSelectYear={setSelectedYear} /> : <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>Loading trend…</div>}
      </div>
    </div>
  );
}

function TrendChart({ data, selectedYear, onSelectYear }: { data: TrendResponse; selectedYear: string | null; onSelectYear: (c: string | null) => void }) {
  if (!data || !data.trend || !data.history) {
    return <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>Trend data unavailable right now.</div>;
  }
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const activeCode = selectedYear ?? hoveredCode;
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedYear) return;
    function handleOutside(e: MouseEvent) {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        onSelectYear(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [selectedYear, onSelectYear]);

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
  const selectedPoint = activeCode ? series.flatMap((s) => s.s.points).find((p) => p.electionCode === activeCode) : null;
  const selectedEntry = activeCode ? data.history.find((h) => h.electionCode === activeCode) : null;

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
      <div style={{ position: "relative" }} ref={chartRef}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }}>
          {gridLines.map((pct) => (
            <g key={pct}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yPos(pct)} y2={yPos(pct)} stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />
              <text x={PAD_L - 6} y={yPos(pct) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{Math.round(pct)}%</text>
            </g>
          ))}
          {allYears.map((y) => (
            <text key={y} x={xPos(y)} y={H - 8} textAnchor="middle" fontSize={10} fill={selectedPoint?.year === y ? "var(--gold)" : "var(--muted)"} fontWeight={selectedPoint?.year === y ? 700 : 400}>{y}</text>
          ))}
          {series.map(({ key, s, colour }) => {
            if (s.points.length === 0) return null;
            const sorted = [...s.points].sort((a, b) => a.year - b.year);
            const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.year)} ${yPos(p.votePct)}`).join(" ");
            return (
              <g key={key}>
                <path d={path} fill="none" stroke={colour} strokeWidth={2.5} opacity={0.9} />
                {sorted.map((p) => {
                  const isSel = p.electionCode === activeCode;
                  return (
                    <g
                      key={p.electionCode}
                      onClick={() => onSelectYear(selectedYear === p.electionCode ? null : p.electionCode)}
                      onMouseEnter={() => setHoveredCode(p.electionCode)}
                      onMouseLeave={() => setHoveredCode((prev) => (prev === p.electionCode ? null : prev))}
                      style={{ cursor: "pointer" }}
                    >
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
                    <span style={{ display: "flex", gap: 6, minWidth: 0, flex: 1, alignItems: "center" }}>
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${c.colourHex || FALLBACK_COLOUR}55` }} />
                      ) : (
                        <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: `${c.colourHex || FALLBACK_COLOUR}22`, color: c.colourHex || FALLBACK_COLOUR, border: `1px solid ${c.colourHex || FALLBACK_COLOUR}55` }}>
                          {initialsOf(c.name)}
                        </span>
                      )}
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
