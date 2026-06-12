const PHASES = [
  {
    num: "01",
    label: "PHASE 01",
    title: "Insight Mode",
    desc: "Recommendations only — no autonomous execution. See exactly what ZoikoVertex would do with your data. Insights appear within 24 hours of data connection.",
    badge: "Day 1–7",
    timeline: "Insights in 24 hours",
    accent: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
  },
  {
    num: "02",
    label: "PHASE 02",
    title: "Assisted Mode",
    desc: "Human approval required before every action. The system proposes. You decide. Optimisation signals and performance improvements appear within 72 hours.",
    badge: "Week 2–4",
    timeline: "Optimisation in 72 hours",
    accent: "#0891B2",
    bg: "#E0F7FF",
    border: "#BAE6FD",
  },
  {
    num: "03",
    label: "PHASE 03",
    title: "Autonomous Mode",
    desc: "Full governed execution within your defined policy thresholds. Confidence scoring, approval workflows, and override pathways always available. ROI evidence within 30 days.",
    badge: "Month 2+",
    timeline: "Measurable ROI in 30 days",
    accent: "#0D9488",
    bg: "#CCFBF1",
    border: "#99F6E4",
  },
];

export default function TrustModel() {
  return (
    <section style={{ background: "#F5F7FA", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#6366F1",
            marginBottom: 16,
          }}>
            <span style={{ width: 24, height: 1, background: "#6366F1", display: "inline-block" }} />
            Safe Deployment Model
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#0A1628",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Governed autonomy, phased trust
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#64748B",
            fontSize: 14,
            maxWidth: 440,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            A three-phase rollout that reduces adoption friction and lets your team build confidence before full agentic deployment. Insights in 24 hours. ROI in 30 days.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {PHASES.map((p) => (
            <div key={p.num} style={{
              borderRadius: 16,
              padding: "32px",
              background: "#FFFFFF",
              border: `1px solid ${p.border}`,
              display: "flex",
              flexDirection: "column",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: 16,
                background: p.bg,
                border: `1px solid ${p.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <span style={{
                  fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                  fontSize: "1.4rem",
                  fontWeight: 900,
                  color: p.accent,
                }}>
                  {p.num}
                </span>
              </div>
              <p style={{
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: p.accent,
                marginBottom: 10,
              }}>
                {p.label}
              </p>
              <h3 style={{
                fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#0A1628",
                marginBottom: 12,
              }}>
                {p.title}
              </h3>
              <p style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.65,
                flex: 1,
                marginBottom: 20,
              }}>
                {p.desc}
              </p>
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: p.accent,
                  background: p.bg,
                  border: `1px solid ${p.border}`,
                  borderRadius: 999,
                  padding: "4px 14px",
                }}>
                  {p.badge}
                </span>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#64748B",
                fontSize: 11,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {p.timeline}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
