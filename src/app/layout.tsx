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
    default: "Kokromoti — 33 Years of Ghana Elections, Down to the Last Constituency",
    template: "%s — Kokromoti",
  },
  description:
    "Every Ghana election since 1992 — Presidential & Parliamentary, national to constituency level. All 16 regions, all 276 constituencies, real verified results. Built by AIEI, the African Institute for Electoral Intelligence.",
  applicationName: "Kokromoti",
  keywords: ["Ghana elections", "election results", "Ghana election history", "Kokromoti", "AIEI", "electoral intelligence", "Ghana politics", "constituency results", "Ghana parliamentary elections", "Ghana presidential elections"],
  authors: [{ name: "AIEI — African Institute for Electoral Intelligence" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Kokromoti",
    title: "Kokromoti — 33 Years of Ghana Elections, Down to the Last Constituency",
    description: "Every Presidential & Parliamentary election since 1992 — national trends down to all 276 constituencies. Real, verified results. This is Ghana's most complete election intelligence platform.",
    // opengraph-image.png is auto-detected by Next.js from src/app/ — no need
    // to reference it manually here.
  },
  twitter: {
    card: "summary_large_image",
    title: "Kokromoti — 33 Years of Ghana Elections, Down to the Last Constituency",
    description: "Presidential & Parliamentary results since 1992 — every region, all 276 constituencies. Explore Kokromoti.",
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
