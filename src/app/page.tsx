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
import AuthModal from "@/components/AuthModal";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavouritesProvider } from "@/contexts/FavouritesContext";
import { currentElectionCodeFor } from "@/lib/results";

export interface SelectedConstituency { id: string; name: string; regionName: string; }

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [navPanel, setNavPanel] = useState<NavPanel>("results");
  const [electionType, setElectionType] = useState<"presidential" | "parliamentary">("presidential");
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

      <div className="app-shell">
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
            <div className="election-badge historical">
              <div className="live-dot" />
              {currentElectionCodeFor(electionType)} GENERAL ELECTIONS
            </div>
          </div>
        </HeaderStack>

        <div className="content">
          <div className={`panel ${navPanel === "results" ? "active" : ""}`}>
            {navPanel === "results" && (
              <ResultsPanel
                electionType={electionType}
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
              <FavouritesPanel onSelectConstituency={(c) => { setConstituencyInitialTab("summary"); setSelectedConstituency(c); }} />
            )}
          </div>
          <div className={`panel ${navPanel === "regions" ? "active" : ""}`}>
            {navPanel === "regions" && (
              <RegionsPanel electionType={electionType} regionFocus={regionFocus} onSelectConstituency={handleSelectConstituencyFromMap} />
            )}
          </div>
          <div className={`panel ${navPanel === "ghana" ? "active" : ""}`}>
            {navPanel === "ghana" && (
              <GhanaPanel onNavigateToRegion={(region) => { setRegionFocus(region); setNavPanel("regions"); }} />
            )}
          </div>
        </div>

        <BottomNav active={navPanel} onChange={handleNavChange} />
      </div>

      {selectedConstituency && (
        <ConstituencyDrilldown
          constituency={selectedConstituency}
          electionType={electionType}
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
