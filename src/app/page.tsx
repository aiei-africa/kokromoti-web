"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import HeaderStack from "@/components/HeaderStack";
import BottomNav, { type NavPanel } from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import ResultsPanel from "@/components/panels/ResultsPanel";
import GhanaPanel from "@/components/panels/GhanaPanel";
import RegionsPanel from "@/components/panels/RegionsPanel";
import FavouritesPanel from "@/components/panels/FavouritesPanel";
import ConstituencyDrilldown from "@/components/ConstituencyDrilldown";
import ElectionYearTabs from "@/components/ElectionYearTabs";
import ShareButton, { type ShareData } from "@/components/ShareButton";
import AuthModal from "@/components/AuthModal";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavouritesProvider } from "@/contexts/FavouritesContext";
import { currentElectionCodeFor } from "@/lib/results";

export interface SelectedConstituency { id: string; name: string; regionName: string; }

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [navPanel, setNavPanel] = useState<NavPanel>("results");
  const [electionType, setElectionType] = useState<"presidential" | "parliamentary">("presidential");
  // Global selected year for the Results/Regions/Ghana list-and-card views
  // (ElectionYearTabs). Separate from electionType — one shared year
  // across both races, so the app always shows "the same year" everywhere
  // at once rather than three independent pickers. Does NOT affect the
  // map, boundaries, or trend chart anywhere (MapExplorer) — those stay on
  // 2024 shapefiles / full 1996-2024 trend series by design, unchanged.
  const [electionYear, setElectionYear] = useState("2024");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConstituency, setSelectedConstituency] = useState<SelectedConstituency | null>(null);
  const [constituencyInitialTab, setConstituencyInitialTab] = useState<"summary" | "history">("summary");
  // Which region to show on the Regions tab, when arriving there via a tap
  // on the Ghana tab's national map rather than direct bottom-nav
  // navigation. Direct navigation (handleNavChange below) clears this, so
  // tapping "Regions" normally still shows the existing full card list.
  const [regionFocus, setRegionFocus] = useState<string | null>(null);

  // Restore the last-viewed screen once, on mount, from sessionStorage —
  // NOT survives full browser close (by design: sessionStorage, not
  // localStorage — a genuinely new visit should start fresh; only a
  // same-tab reload/poor-connectivity retry should return to where the
  // person was).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kokromoti_session_state_v1");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.navPanel) setNavPanel(saved.navPanel);
      if (saved.electionType) setElectionType(saved.electionType);
      if (saved.electionYear) setElectionYear(saved.electionYear);
      if (saved.regionFocus !== undefined) setRegionFocus(saved.regionFocus);
      if (saved.selectedConstituency !== undefined) setSelectedConstituency(saved.selectedConstituency);
      if (saved.constituencyInitialTab) setConstituencyInitialTab(saved.constituencyInitialTab);
      if (typeof saved.searchQuery === "string") setSearchQuery(saved.searchQuery);
    } catch {
      // Corrupted/unavailable storage — fall back to normal defaults, not an error.
    }

    // URL params win over sessionStorage — this is what makes a SHARED
    // link actually open to the right screen for someone who has never
    // been in this app before (they have no sessionStorage of their own).
    try {
      const params = new URLSearchParams(window.location.search);
      const panel = params.get("panel");
      const type = params.get("type");
      const year = params.get("year");
      const cid = params.get("cid");
      if (type === "presidential" || type === "parliamentary") setElectionType(type);
      if (year) setElectionYear(year);
      if (cid) {
        setSelectedConstituency({ id: cid, name: params.get("cname") ?? "", regionName: params.get("cregion") ?? "" });
        setConstituencyInitialTab("summary");
      } else if (panel === "results" || panel === "live" || panel === "favourites" || panel === "regions" || panel === "ghana") {
        setNavPanel(panel as NavPanel);
      }
    } catch {
      // Malformed query string — ignore, defaults/sessionStorage already applied above.
    }
  }, []);

  // Persist on every change to the state that defines "which screen the
  // person is looking at" — cheap, synchronous, no debounce needed.
  useEffect(() => {
    try {
      sessionStorage.setItem("kokromoti_session_state_v1", JSON.stringify({
        navPanel, electionType, electionYear, regionFocus, selectedConstituency, constituencyInitialTab, searchQuery,
      }));
    } catch {
      // Storage unavailable (private browsing, quota, etc.) — non-fatal, just skip persisting.
    }
    try {
      const params = new URLSearchParams();
      params.set("type", electionType);
      params.set("year", electionYear);
      if (selectedConstituency) {
        params.set("panel", "constituency");
        params.set("cid", selectedConstituency.id);
        params.set("cname", selectedConstituency.name);
        params.set("cregion", selectedConstituency.regionName);
      } else {
        params.set("panel", navPanel);
      }
      window.history.replaceState(null, "", "?" + params.toString());
    } catch {
      // Non-fatal — URL just won't reflect the current screen this time.
    }
  }, [navPanel, electionType, electionYear, regionFocus, selectedConstituency, constituencyInitialTab, searchQuery]);

  function handleNavChange(panel: NavPanel) {
    if (panel !== "regions") setRegionFocus(null);
    setNavPanel(panel);
  }

  function handleSelectConstituencyFromMap(id: string, name: string, regionName: string | null) {
    setConstituencyInitialTab("history");
    setSelectedConstituency({ id, name, regionName: regionName ?? "" });
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div className={`app-shell${navPanel === "ghana" || navPanel === "regions" ? " app-shell--wide" : ""}`}>
        <HeaderStack>
          <TopBar
            electionType={electionType}
            onElectionTypeChange={setElectionType}
            onSearchToggle={() => setSearchOpen((s) => !s)}
          />

          {searchOpen && (
            <div className="search-bar open">
              <input
                className="search-input"
                type="text"
                placeholder="Search constituency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="date-bar">
            {navPanel === "results" || navPanel === "regions" || navPanel === "ghana" || navPanel === "favourites" ? (
              <ElectionYearTabs value={electionYear} onChange={setElectionYear} />
            ) : (
              <div className="election-badge historical">
                <div className="live-dot" />
                {currentElectionCodeFor(electionType)} GENERAL ELECTIONS
              </div>
            )}
          </div>
        </HeaderStack>

        <div className="content">
          <div className={`panel ${navPanel === "results" ? "active" : ""}`}>
            {navPanel === "results" && (
              <ResultsPanel
                electionType={electionType}
                electionYear={electionYear}
                searchQuery={searchQuery}
                onSelectConstituency={(c) => { setConstituencyInitialTab("summary"); setSelectedConstituency(c); }}
                onNavigateToRegion={(region) => { setRegionFocus(region); setNavPanel("regions"); }}
              />
            )}
          </div>
          <div className={`panel ${navPanel === "live" ? "active" : ""}`}>
            {navPanel === "live" && (
              <div className="tap-hint" style={{ padding: 24 }}>
                Live collation is a 2028 feature — station-level results don't exist for
                historical elections. This tab activates once the 2028 pipeline is built.
              </div>
            )}
          </div>
          <div className={`panel ${navPanel === "favourites" ? "active" : ""}`}>
            {navPanel === "favourites" && (
              <FavouritesPanel electionType={electionType} electionYear={electionYear} onSelectConstituency={(c) => { setConstituencyInitialTab("summary"); setSelectedConstituency(c); }} />
            )}
          </div>
          <div className={`panel ${navPanel === "regions" ? "active" : ""}`}>
            {navPanel === "regions" && (
              <RegionsPanel electionType={electionType} electionYear={electionYear} regionFocus={regionFocus} onSelectConstituency={handleSelectConstituencyFromMap} />
            )}
          </div>
          <div className={`panel ${navPanel === "ghana" ? "active" : ""}`}>
            {navPanel === "ghana" && (
              <GhanaPanel electionType={electionType} electionYear={electionYear} onNavigateToRegion={(region) => { setRegionFocus(region); setNavPanel("regions"); }} />
            )}
          </div>
        </div>

        <BottomNav active={navPanel} onChange={handleNavChange} />
      </div>

      {selectedConstituency && (
        <ConstituencyDrilldown
          constituency={selectedConstituency}
          electionType={electionType}
          electionYear={electionYear}
          initialTab={constituencyInitialTab}
          onClose={() => setSelectedConstituency(null)}
        />
      )}

      <AuthModal />
      <ShareButton
        getShareData={(): ShareData => {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://app.aiei-africa.org";
          if (selectedConstituency) {
            const params = new URLSearchParams({
              panel: "constituency", type: electionType, year: electionYear,
              cid: selectedConstituency.id, cname: selectedConstituency.name, cregion: selectedConstituency.regionName,
            });
            return {
              url: origin + "/?" + params.toString(),
              title: selectedConstituency.name + " — Kokromoti",
              text: selectedConstituency.name + " (" + selectedConstituency.regionName + ") — " + electionYear + " " + electionType + " results on Kokromoti.",
            };
          }
          const params = new URLSearchParams({ panel: navPanel, type: electionType, year: electionYear });
          return {
            url: origin + "/?" + params.toString(),
            title: "Kokromoti — 33 Years of Ghana Elections, Down to the Last Constituency",
            text: "Every Ghana election since 1992 — Presidential & Parliamentary, all 16 regions, all 276 constituencies. Explore Kokromoti.",
          };
        }}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <FavouritesProvider>
        <AppShell />
      </FavouritesProvider>
    </AuthProvider>
  );
}
