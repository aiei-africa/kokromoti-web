"use client";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import HeaderStack from "@/components/HeaderStack";
import BottomNav, { type NavPanel } from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import ResultsPanel from "@/components/panels/ResultsPanel";
import GhanaPanel from "@/components/panels/GhanaPanel";
import RegionsPanel from "@/components/panels/RegionsPanel";
import ConstituencyDrilldown from "@/components/ConstituencyDrilldown";
import { currentElectionCodeFor } from "@/lib/results";

export interface SelectedConstituency { id: string; name: string; regionName: string; }

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [navPanel, setNavPanel] = useState<NavPanel>("results");
  const [electionType, setElectionType] = useState<"presidential" | "parliamentary">("presidential");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConstituency, setSelectedConstituency] = useState<SelectedConstituency | null>(null);

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

          {/* Bug fix: v10's CSS requires the "open" class to make this
              visible (.search-bar itself is display:none by default,
              .search-bar.open overrides to display:flex) — the class was
              never actually applied here before, so the input existed in
              the DOM but was permanently invisible regardless of state. */}
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

          {/* Badge is dynamic now — Presidential and Parliamentary each
              track their own current election year independently. */}
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
                onSelectConstituency={setSelectedConstituency}
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
              <div className="tap-hint" style={{ padding: 24 }}>
                Favourites — sign in required. Coming in the next pass.
              </div>
            )}
          </div>
          <div className={`panel ${navPanel === "regions" ? "active" : ""}`}>
            {navPanel === "regions" && <RegionsPanel electionType={electionType} />}
          </div>
          <div className={`panel ${navPanel === "ghana" ? "active" : ""}`}>
            {navPanel === "ghana" && <GhanaPanel />}
          </div>
        </div>

        <BottomNav active={navPanel} onChange={setNavPanel} />
      </div>

      {selectedConstituency && (
        <ConstituencyDrilldown
          constituency={selectedConstituency}
          electionType={electionType}
          onClose={() => setSelectedConstituency(null)}
        />
      )}
    </>
  );
}
