import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kokromoti — Ghana Election Results";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated, not a static asset — matches the same reason the code
// comment in layout.tsx assumed one would be "auto-detected": Next.js's
// file-convention auto-detection works identically for a static image OR
// this kind of generator file, but only if one of the two actually
// exists. Neither did — this was the real cause of the broken/missing
// social share preview.
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
        <div style={{ display: "flex", alignItems: "center", fontSize: 96, fontWeight: 800, letterSpacing: 6 }}>
          <span style={{ color: "#f2c94c" }}>KOKRO</span>
          <span style={{ color: "#ffffff" }}>MOTI</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#c7cedd", fontWeight: 500, letterSpacing: 1 }}>
          Election Intelligence. Power to the People.
        </div>
        <div style={{ marginTop: 18, fontSize: 24, color: "#8b95ab" }}>
          Verified Ghana election results, 1992–2024
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
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
