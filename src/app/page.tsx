"use client";
import { useState } from "react";
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
            {navPanel === "results" || navPanel === "regions" || navPanel === "ghana" ? (
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
