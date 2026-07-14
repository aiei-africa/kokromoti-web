"use client";
import MapTrendDashboard from "@/components/MapTrendDashboard";

// Temporary verification route — visit /map-test to check the dashboard
// renders and fetches real data, before deciding where it permanently
// lives in navigation. Delete this file once that decision is made and
// the component is wired in properly.
export default function MapTestPage() {
  return (
    <div style={{ background: "#071021", minHeight: "100vh" }}>
      <MapTrendDashboard />
    </div>
  );
}
