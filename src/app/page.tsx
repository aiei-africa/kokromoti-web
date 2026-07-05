"use client";
import { useEffect, useState } from "react";
import { api, type Election } from "@/lib/api";
import TopBar from "@/components/TopBar";
import HeaderStack from "@/components/HeaderStack";
import BottomNav, { type NavPanel } from "@/components/BottomNav";
import ResultsPanel from "@/components/panels/ResultsPanel";
import GhanaPanel from "@/components/panels/GhanaPanel";
import RegionsPanel from "@/components/panels/RegionsPanel";

// Historical elections only for this phase — 2020/2024 join once that data
// is brought up to the same standard as 1996-2016; 2028 is a distinct,
// later phase (live collation, not applicable to historical browsing).
const AVAILABLE_ELECTIONS = ["2016", "2012", "2008", "2008R", "2004", "2000", "2000R", "1996"];

export default function HomePage() {
  const [navPanel, setNavPanel] = useState<NavPanel>("results");
  const [electionType, setElectionType] = useState<"presidential" | "parliamentary">("presidential");
  const [electionCode, setElectionCode] = useState("2016");
  const [searchOpen, setSearchOpen] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);

  useEffect(() => {
    api.elections().then((all) =>
      setElections(all.filter((e) => AVAILABLE_ELECTIONS.includes(e.code)))
    );
  }, []);

  return (
    <>
      <HeaderStack>
        <TopBar
          electionType={electionType}
          onElectionTypeChange={setElectionType}
          onSearchToggle={() => setSearchOpen((s) => !s)}
        />

        {searchOpen && (
          <div className="search-bar">
            <input className="search-input" type="text" placeholder="Search constituency..." />
          </div>
        )}

        <div className="date-bar">
          <div className="election-badge historical">
            <div className="live-dot" />
            HISTORICAL RECORD
          </div>
          <select
            value={electionCode}
            onChange={(e) => setElectionCode(e.target.value)}
            style={{ background: "transparent", border: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}
          >
            {AVAILABLE_ELECTIONS.map((code) => (
              <option key={code} value={code} style={{ color: "#000" }}>
                {code} General Election
              </option>
            ))}
          </select>
        </div>
      </HeaderStack>

      <div className="content">
        <div className={`panel ${navPanel === "results" ? "active" : ""}`}>
          {navPanel === "results" && <ResultsPanel electionType={electionType} electionCode={electionCode} />}
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
          {navPanel === "regions" && <RegionsPanel electionType={electionType} electionCode={electionCode} />}
        </div>
        <div className={`panel ${navPanel === "ghana" ? "active" : ""}`}>
          {navPanel === "ghana" && <GhanaPanel electionCode={electionCode} />}
        </div>
      </div>

      <BottomNav active={navPanel} onChange={setNavPanel} />
    </>
  );
}
