"use client";
import { useEffect, useRef, useState } from "react";

export interface ShareData { url: string; title: string; text: string; }

// Persistent across every screen (rendered once, fixed-position, as a
// sibling near the root of page.tsx rather than inside any one panel) —
// deliberately takes a FUNCTION, not static values, so it always reads
// the current screen's real state at the moment of tapping rather than
// whatever was true when the button first mounted.
export default function ShareButton({ getShareData }: { getShareData: () => ShareData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  async function handleTap() {
    const data = getShareData();
    // Native share sheet where available (most mobile browsers) — includes
    // WhatsApp automatically if installed, plus whatever else the device
    // offers. Falls back to the manual menu on desktop browsers that don't
    // implement it.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // User cancelled the native sheet, or it failed — fall through to
        // the manual menu rather than doing nothing.
      }
    }
    setMenuOpen((v) => !v);
  }

  async function copyLink() {
    const { url } = getShareData();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — no fallback needed, the URL is still
      // visible/selectable in the popover's own text if we ever add that.
    }
  }

  function openIntent(kind: "whatsapp" | "facebook" | "x") {
    const { url, text } = getShareData();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const intents = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    };
    window.open(intents[kind], "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  return (
    <div style={{ position: "fixed", right: 18, bottom: 92, zIndex: 200 }} ref={menuRef}>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 0,
            background: "#111a2c",
            border: "1px solid #253048",
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 180,
          }}
        >
          <button style={shareMenuItemStyle} onClick={() => openIntent("whatsapp")}>🟢 WhatsApp</button>
          <button style={shareMenuItemStyle} onClick={() => openIntent("facebook")}>🔵 Facebook</button>
          <button style={shareMenuItemStyle} onClick={() => openIntent("x")}>⚫ X</button>
          <button style={shareMenuItemStyle} onClick={copyLink}>{copied ? "✅ Copied!" : "🔗 Copy link"}</button>
        </div>
      )}
      <button
        onClick={handleTap}
        aria-label="Share"
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--gold, #f2c94c)",
          color: "#080C14",
          border: "none",
          fontSize: 22,
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        📤
      </button>
    </div>
  );
}

const shareMenuItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#e6eaf2",
  fontSize: 14,
  padding: "9px 10px",
  textAlign: "left",
  borderRadius: 7,
  cursor: "pointer",
};
