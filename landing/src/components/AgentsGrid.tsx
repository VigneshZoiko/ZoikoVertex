const AGENTS = [
  {
    layer: "Strategic Control Layer",
    name: "Chief Strategy Agent",
    desc: "ZoikoVertex continuously monitors EBITDA targets, budget envelopes, and business context to automatically shift capital allocation toward highest-return marketing activity.",
    link: "Revenue & ROI Management →",
    accent: "#0891B2",
    bg: "#E0F7FF",
  },
  {
    layer: "Financial & Optimisation Layer",
    name: "Quantitative Ad Spend Agent",
    desc: "Analyses CPA, ROAS, and marginal return across every channel in real time. Reallocates budget within policy boundaries — no manual intervention required.",
    link: "Full bid optimisation →",
    accent: "#6366F1",
    bg: "#EDE9FE",
  },
  {
    layer: "Financial & Optimisation Layer",
    name: "Revenue Forensic Agent",
    desc: "Multi-touch attribution that reconciles marketing performance to actual revenue. Gives finance teams a single version of ROI truth — defensible, board-ready, and audit-traceable.",
    link: "Multi-touch attribution →",
    accent: "#0891B2",
    bg: "#E0F7FF",
  },
  {
    layer: "Governance & Risk Layer",
    name: "Compliance Sentry",
    desc: "Reviews all outputs against brand rules, legal requirements, and sector-specific controls. Nothing publishes without passing compliance review. Pre-authorises agent actions.",
    link: "Pre-authorise agent actions →",
    accent: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    layer: "Simulation Layer",
    name: "Synthetic Audience Engine",
    desc: "Predicts likely audience response before spend is committed. Test creative and targeting hypotheses against synthetic audiences — eliminate waste before it happens.",
    link: "Test spend before committing →",
    accent: "#0D9488",
    bg: "#CCFBF1",
  },
  {
    layer: "Execution Intelligence Layer",
    name: "Growth Optimisation Agent",
    desc: "Identifies inefficiency across your channels and creatives. Scales what works. Kills what doesn't. Tied directly to contribution margin, not vanity metrics.",
    link: "Continuous output optimisation →",
    accent: "#0891B2",
    bg: "#E0F7FF",
  },
];

export default function AgentsGrid() {
  return (
    <section style={{ background: "#FFFFFF", padding: "96px 24px" }} id="agents">
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
            The Full Agent Operating System
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#0A1628",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Every agent. Every capability.
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#64748B",
            fontSize: 14,
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            ZoikoVertex agents work together — every function of your business coordinated for the first time, constituting a full Marketing Operating System.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {AGENTS.map((a) => (
            <div key={a.name} style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "28px",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: a.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a.accent} strokeWidth="1.8">
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <p style={{
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: a.accent,
                marginBottom: 8,
              }}>
                {a.layer}
              </p>
              <h3 style={{
                fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                fontSize: 15,
                fontWeight: 800,
                color: "#0A1628",
                marginBottom: 10,
                lineHeight: 1.2,
              }}>
                {a.name}
              </h3>
              <p style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.65,
                flex: 1,
              }}>
                {a.desc}
              </p>
              <a href="#" style={{
                marginTop: 18,
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: a.accent,
                textDecoration: "none",
              }}>
                {a.link}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
