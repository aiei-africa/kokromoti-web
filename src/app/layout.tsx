import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kokromoti — Ghana Election Results",
  description: "Election Intelligence. Power to the People.",
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
