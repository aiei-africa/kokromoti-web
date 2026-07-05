"use client";
import { useEffect, useRef } from "react";

// Wraps everything that must stay frozen at the top (logo bar, search bar
// when open, date/election bar) as a single sticky unit, and measures its
// actual rendered height with a ResizeObserver — set as the --topbar-h CSS
// variable that .region-header's own sticky offset depends on. v10 did this
// dynamically via JS too (its .region-header CSS references var(--topbar-h)),
// but relied on a hardcoded 97px fallback since the measuring script wasn't
// something we'd captured in the static HTML/CSS extraction. A real
// measurement means this stays correct even as the header's height changes
// (e.g. the search bar toggling open adds ~44px), rather than drifting out
// of sync with a guessed constant.
export default function HeaderStack({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    };
    setHeight();

    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "sticky", top: 0, zIndex: 100 }}>
      {children}
    </div>
  );
}
