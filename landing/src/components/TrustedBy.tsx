export default function TrustedBy() {
  const logos = [
    "Meridian Commerce",
    "Orbis Financial",
    "TerraScale Retail",
    "Apex Logistics",
    "Northgate FinTech",
    "VantaHealth",
  ];

  return (
    <section style={{
      background: "#0f1b2e",
      padding: "28px 24px",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 32 }}>
        <span style={{
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "#3A5068",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          Trusted by enterprise leaders
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          {logos.map((logo) => (
            <span key={logo} style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}>
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
