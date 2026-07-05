"use client";
import { useState, useEffect } from "react";

interface TopBarProps {
  electionType: "presidential" | "parliamentary";
  onElectionTypeChange: (type: "presidential" | "parliamentary") => void;
  onSearchToggle: () => void;
}

export default function TopBar({ electionType, onElectionTypeChange, onSearchToggle }: TopBarProps) {
  const [isDay, setIsDay] = useState(false);

  useEffect(() => {
    setIsDay(document.documentElement.classList.contains("day-mode"));
  }, []);

  function toggleDayMode() {
    const root = document.documentElement;
    const nowDay = root.classList.toggle("day-mode");
    setIsDay(nowDay);
    localStorage.setItem("k_theme", nowDay ? "day" : "night");
  }

  return (
    <div className="topbar">
      <div className="topbar-row1">
        <div className="logo-area">
          <div className="logo-thumb">KM</div>
          <div className="logo-text">
            KOKRO<span>MOTI</span>
          </div>
        </div>
        <div className="topbar-icons">
          <button className="icon-btn" onClick={onSearchToggle}>🔍</button>
          <button className="icon-btn" onClick={toggleDayMode} title="Toggle day/night mode">
            {isDay ? "🌕" : "🌙"}
          </button>
          <button className="icon-btn">👤</button>
        </div>
      </div>
      <div className="election-tabs">
        <div
          className={`election-tab ${electionType === "presidential" ? "active" : ""}`}
          onClick={() => onElectionTypeChange("presidential")}
        >
          Presidential
        </div>
        <div
          className={`election-tab ${electionType === "parliamentary" ? "active" : ""}`}
          onClick={() => onElectionTypeChange("parliamentary")}
        >
          Parliamentary
        </div>
        <div className="election-tab news-tab">News</div>
      </div>
    </div>
  );
}
