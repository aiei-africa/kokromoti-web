"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  electionType: "presidential" | "parliamentary";
  onElectionTypeChange: (type: "presidential" | "parliamentary") => void;
  onSearchToggle: () => void;
}

export default function TopBar({ electionType, onElectionTypeChange, onSearchToggle }: TopBarProps) {
  const [isDay, setIsDay] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const { user, openModal, logout } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDay(document.documentElement.classList.contains("day-mode"));
  }, []);

  // close the account panel on an outside tap
  useEffect(() => {
    if (!accountPanelOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setAccountPanelOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountPanelOpen]);

  function toggleDayMode() {
    const root = document.documentElement;
    const nowDay = root.classList.toggle("day-mode");
    setIsDay(nowDay);
    localStorage.setItem("k_theme", nowDay ? "day" : "night");
  }

  function handleProfileClick() {
    if (user) setAccountPanelOpen((s) => !s);
    else openModal();
  }

  return (
    <div className="topbar">
      <div className="topbar-row1">
        <div className="logo-area">
          <Image
            src="/logo.png"
            alt="Kokromoti"
            width={34}
            height={34}
            style={{ borderRadius: 8, boxShadow: "0 0 18px rgba(240,165,0,0.35)" }}
            priority
          />
          <div className="logo-text">
            KOKRO<span>MOTI</span>
          </div>
        </div>
        <div className="topbar-icons" style={{ position: "relative" }}>
          <button className="icon-btn" onClick={onSearchToggle}>🔍</button>
          <button className="icon-btn" onClick={toggleDayMode} title="Toggle day/night mode">
            {isDay ? "🌕" : "🌙"}
          </button>
          <button className="icon-btn" onClick={handleProfileClick} title={user ? user.fullName : "Sign in"}>
            {user ? "👤" : "👤"}
          </button>

          {accountPanelOpen && user && (
            <div className="account-panel" ref={panelRef}>
              <div className="account-panel-name">{user.fullName}</div>
              <div className="account-panel-email">{user.email}</div>
              {!user.emailVerified && (
                <div className="account-panel-unverified">Email not verified</div>
              )}
              <button
                className="account-panel-signout"
                onClick={() => { logout(); setAccountPanelOpen(false); }}
              >
                Sign out
              </button>
            </div>
          )}
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
