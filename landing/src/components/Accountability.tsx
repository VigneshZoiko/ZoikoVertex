const BULLETS = [
  "ROI per campaign, channel, and platform",
  "Cost per acquisition and contribution margin impact",
  "Lifetime value correlation and revenue path",
  "Wasted spend identified, recovered, and reported",
  "Budget reallocation effect on profit, not just spend",
  "Revenue path from touchpoint to cash event",
];

const METRICS = [
  { label: "Campaign ROI",           value: "2.3× → 3.7×",   color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)" },
  { label: "Cost per acquisition",   value: "-26% reduction", color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)" },
  { label: "Wasted spend recovered", value: "$6,400 / 48h",   color: "#20E7F2", bg: "rgba(32,231,242,0.08)",  border: "rgba(32,231,242,0.2)" },
  { label: "Budget reallocated",     value: "$18,200 auto",   color: "#20E7F2", bg: "rgba(32,231,242,0.08)",  border: "rgba(32,231,242,0.2)" },
  { label: "Daily profit impact",    value: "+14.0%",         color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)" },
  { label: "Attribution confidence", value: "Multi-touch ✓",  color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)" },
];

export default function Accountability() {
  return (
    <section style={{ background: "#152238", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

        {/* Left */}
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#20E7F2",
            marginBottom: 20,
          }}>
            <span style={{ width: 24, height: 1, background: "#20E7F2", display: "inline-block" }} />
            ROI Engine
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}>
            Audit-grade financial accountability
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#5E7A92",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 28,
          }}>
            ZoikoVertex is designed to satisfy the core finance question: is marketing generating profit, or only activity? The ROI engine reconciles spend to contribution margin in a language CFOs and boards can verify.
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {BULLETS.map((b) => (
              <li key={b} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#A9B8C7",
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {b}
              </li>
            ))}
          </ul>
          <div style={{
            padding: "16px 20px",
            borderLeft: "3px solid #20E7F2",
            background: "rgba(32,231,242,0.04)",
            borderRadius: "0 8px 8px 0",
          }}>
            <p style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              color: "#5E7A92",
              fontSize: 13,
              lineHeight: 1.6,
              fontStyle: "italic",
            }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontStyle: "normal" }}>Economic inevitability: </span>
              If ZoikoVertex improves marketing efficiency by even 15%, it pays for itself multiple times over — making non-adoption financially irrational in performance-sensitive organizations.
            </p>
          </div>
        </div>

        {/* Right — dashboard card */}
        <div style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(32,231,242,0.12)",
          background: "#152238",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "rgba(32,231,242,0.04)",
            borderBottom: "1px solid rgba(32,231,242,0.08)",
          }}>
            <span style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
            }}>
              Campaign Performance Dashboard
            </span>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "#34D399",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
              Live
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {METRICS.map((m, i) => (
              <div key={m.label} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: i < METRICS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  color: "#5E7A92",
                  fontSize: 13,
                }}>
                  {m.label}
                </span>
                <span style={{
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: m.color,
                  background: m.bg,
                  border: `1px solid ${m.border}`,
                  borderRadius: 999,
                  padding: "4px 12px",
                }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
