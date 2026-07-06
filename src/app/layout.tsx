import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://app.aiei-africa.org";

export const viewport: Viewport = {
  themeColor: "#080C14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kokromoti — Ghana Election Results",
    template: "%s — Kokromoti",
  },
  description:
    "Ghana's election intelligence platform — verified historical results (1992–2024), built by AIEI, the African Institute for Electoral Intelligence.",
  applicationName: "Kokromoti",
  keywords: ["Ghana elections", "election results", "Kokromoti", "AIEI", "electoral intelligence", "Ghana politics"],
  authors: [{ name: "AIEI — African Institute for Electoral Intelligence" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Kokromoti",
    title: "Kokromoti — Ghana Election Results",
    description: "Election Intelligence. Power to the People. Verified historical Ghana election results, 1992–2024.",
    // opengraph-image.png is auto-detected by Next.js from src/app/ — no need
    // to reference it manually here.
  },
  twitter: {
    card: "summary_large_image",
    title: "Kokromoti — Ghana Election Results",
    description: "Election Intelligence. Power to the People.",
    // twitter-image.png is likewise auto-detected.
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Restore day/night theme before paint, exactly matching v10's mechanism —
            a class on <html>, persisted in localStorage. Inlined here (not in a
            useEffect) so there's no flash of the wrong theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('k_theme') === 'day') {
                  document.documentElement.classList.add('day-mode');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <div id="appRoot">{children}</div>
      </body>
    </html>
  );
}
