"use client";

export type NavPanel = "results" | "live" | "favourites" | "regions" | "ghana";

const NAV_ITEMS: { id: NavPanel; icon: string; label: string; resultsIcon?: boolean }[] = [
  { id: "results", icon: "", label: "Results", resultsIcon: true },
  { id: "live", icon: "📡", label: "Live" },
  { id: "favourites", icon: "⭐", label: "Favourites" },
  { id: "regions", icon: "🗺️", label: "Regions" },
  { id: "ghana", icon: "🇬🇭", label: "Ghana" },
];

export default function BottomNav({ active, onChange }: { active: NavPanel; onChange: (p: NavPanel) => void }) {
  return (
    <div className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.resultsIcon ? (
            <div className="nav-results-icon">
              <div className="nav-bar" />
              <div className="nav-bar" />
              <div className="nav-bar" />
            </div>
          ) : (
            <div className="nav-icon">{item.icon}</div>
          )}
          <div className="nav-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
