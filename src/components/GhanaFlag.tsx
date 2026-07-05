export default function GhanaFlag({ size = 24 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 5, overflow: "hidden", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#006B3F", flex: 1 }} />
      <div style={{ background: "#D4A017", flex: 1, position: "relative" }}>
        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "#000", fontSize: 8, lineHeight: 1 }}>★</span>
      </div>
      <div style={{ background: "#CE1126", flex: 1 }} />
    </div>
  );
}
