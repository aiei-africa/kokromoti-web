import { ImageResponse } from "next/og";

// NOT edge runtime — that's a Vercel-specific directive for their edge
// network. Kokromoti runs on Railway's standard Node.js deployment
// ("Detected Node" in the build log), where an edge-runtime route can
// silently fail to serve correctly. Node.js is the default when no
// runtime is declared, which is the correct choice here.
export const alt = "Kokromoti — Ghana's First Ever True Election App — 33 Years of Ghana Elections, Down to the Last Constituency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080C14",
          backgroundImage: "radial-gradient(circle at 50% 35%, #10192b 0%, #080C14 65%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 92, fontWeight: 800, letterSpacing: 6 }}>
          <span style={{ color: "#f2c94c" }}>KOKRO</span>
          <span style={{ color: "#ffffff" }}>MOTI</span>
        </div>
        <div style={{ marginTop: 26, fontSize: 38, color: "#ffffff", fontWeight: 700, letterSpacing: 0.5 }}>
          33 Years. Every Constituency. Every Vote.
        </div>
        <div style={{ marginTop: 16, fontSize: 24, color: "#9aa5bd", fontWeight: 500 }}>
          Presidential &amp; Parliamentary results, 1992–2024 — 16 regions, 276 constituencies
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            width: 160,
            height: 6,
            borderRadius: 3,
            background: "linear-gradient(90deg, #1B6B3A 0%, #f2c94c 50%, #003082 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
