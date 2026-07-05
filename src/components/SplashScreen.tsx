"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_DURATION_MS = 2200;
const FADE_DURATION_MS = 400;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), SPLASH_DURATION_MS);
    const doneTimer = setTimeout(onDone, SPLASH_DURATION_MS + FADE_DURATION_MS);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#080C14",
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_DURATION_MS}ms ease`,
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      <div
        style={{
          animation: "splash-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Image src="/splash-seal.png" alt="Kokromoti" width={180} height={180} priority className="splash-icon" />
      </div>
      <div
        style={{
          marginTop: 20, fontFamily: "'Rajdhani', sans-serif", fontSize: "12px",
          letterSpacing: "3px", color: "#5C6E8A", textTransform: "uppercase",
          animation: "splash-fade-in 0.8s ease 0.3s both",
        }}
      >
        Election Intelligence
      </div>
      <style>{`
        @keyframes splash-pop {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
