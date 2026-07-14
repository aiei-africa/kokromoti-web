"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window` at module-load time, which crashes during
// Next.js's server-side render pass (there's no window on the server) —
// "use client" alone doesn't prevent that first SSR pass, only ssr:false
// on a dynamic import does. This is the standard, well-known fix for
// Leaflet specifically in Next.js.
const MapTrendDashboard = dynamic(() => import("@/components/MapTrendDashboard"), { ssr: false });

export default function MapTestPage() {
  return (
    <div style={{ background: "#071021", minHeight: "100vh" }}>
      <MapTrendDashboard />
    </div>
  );
}
