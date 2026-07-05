"use client";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import HeaderStack from "@/components/HeaderStack";
import BottomNav, { type NavPanel } from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import ResultsPanel from "@/components/panels/ResultsPanel";
import GhanaPanel from "@/components/panels/GhanaPanel";
import RegionsPanel from "@/components/panels/RegionsPanel";
import { CURRENT_ELECTION_CODE } from "@/lib/results";

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [navPanel, setNavPanel] = useState<NavPanel>("results");
  const [electionType, setElectionType] = useState<"presidential" | "parliamentary">("presidential");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
            <div className="search-bar">
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

          {/* No election-year selector, by design — this build shows only the
              current election (CURRENT_ELECTION_CODE). Older years become
              reachable later via a constituency's Hist. Trend tab in its
              drilldown, not a top-level dropdown. */}
          <div className="date-bar">
            <div className="election-badge historical">
              <div className="live-dot" />
              HISTORICAL RECORD
            </div>
            <span style={{ fontSize: "inherit", color: "inherit" }}>
              {CURRENT_ELECTION_CODE} General Election
            </span>
          </div>
        </HeaderStack>

        <div className="content">
          <div className={`panel ${navPanel === "results" ? "active" : ""}`}>
            {navPanel === "results" && (
              <ResultsPanel electionType={electionType} searchQuery={searchQuery} />
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
    </>
  );
}
