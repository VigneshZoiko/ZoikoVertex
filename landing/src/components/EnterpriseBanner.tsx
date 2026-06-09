const FEATURES = [
  {
    title: "Advertising rule enforcement",
    desc: "Every agent action is checked against platform-specific advertising rules, brand tone standards, and sector compliance requirements before execution.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Jurisdiction-aware multi-market control",
    desc: "ZoikoVertex applies the correct regulatory framework per market — automatically. Different rules for different regions, enforced at the agent level.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    title: "Confidence scoring on every decision",
    desc: "Agents only act autonomously when confidence thresholds are met. Lower-confidence decisions are routed to human review before any action is taken.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    title: "Full audit logs and action histories",
    desc: "Every agent decision, approval, and execution is logged with full traceability. Exportable for legal review, finance audit, and board reporting.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
];

const PHASES = [
  { phase: "Phase 01", mode: "Insight Mode", sub: "No autonomy", accent: "#5E7A92" },
  { phase: "Phase 02", mode: "Assistant Mode", sub: "Human approval", accent: "#818CF8" },
  { phase: "Phase 03", mode: "Autonomous Mode", sub: "Full governed exec", accent: "#20E7F2" },
];

const COMPLIANCE = ["GDPR Safe", "FCA Aligned", "HIPAA Aware", "SEC Compliant"];

export default function EnterpriseBanner() {
  return (
    <section style={{ background: "#0f1b2e", padding: "96px 24px" }} id="enterprise">
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>

        {/* Left — governance diagram */}
        <div>
          {/* Governance visual card */}
          <div style={{
            borderRadius: 16,
            border: "1px solid rgba(32,231,242,0.12)",
            background: "#152238",
            padding: "28px",
            marginBottom: 16,
          }}>
            <p style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              textAlign: "center",
              marginBottom: 4,
            }}>
              Governance Control Tower
            </p>
            <p style={{
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              fontSize: 9,
              color: "#3A5068",
              textAlign: "center",
              marginBottom: 24,
              letterSpacing: "0.06em",
            }}>
              Autonomous by default · Manual by exception
            </p>

            {/* Hub diagram */}
            <div style={{ position: "relative", height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              {/* Center */}
              <div style={{
                position: "absolute",
                zIndex: 2,
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0D2A4A, #152238)",
                border: "2px solid rgba(32,231,242,0.4)",
                boxShadow: "0 0 30px rgba(32,231,242,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}>
                <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 8.5, color: "#20E7F2", fontWeight: 700, lineHeight: 1.3 }}>Governed</span>
                <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 8.5, color: "#FFFFFF", fontWeight: 700, lineHeight: 1.3 }}>Autonomy</span>
              </div>
              {/* Orbit nodes */}
              {[
                { label: "Confidence\nScoring", angle: 0 },
                { label: "Policy\nThresholds", angle: 60 },
                { label: "Override\nControls", angle: 120 },
                { label: "Sector\nRules", angle: 180 },
                { label: "Audit\nLogs", angle: 240 },
                { label: "Approval\nWorkflows", angle: 300 },
              ].map((n) => {
                const rad = ((n.angle - 90) * Math.PI) / 180;
                const r = 80;
                const x = 50 + (r / 2) * Math.cos(rad);
                const y = 50 + (r / 2) * Math.sin(rad);
                return (
                  <div key={n.label} style={{
                    position: "absolute",
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%,-50%)",
                    zIndex: 1,
                  }}>
                    <div style={{
                      background: "rgba(32,231,242,0.08)",
                      border: "1px solid rgba(32,231,242,0.2)",
                      borderRadius: 8,
                      padding: "4px 8px",
                      textAlign: "center",
                    }}>
                      {n.label.split("\n").map((l, i) => (
                        <p key={i} style={{
                          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                          fontSize: 8,
                          fontWeight: 600,
                          color: "#A9B8C7",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                        }}>{l}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phases */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
              {PHASES.map((p) => (
                <div key={p.phase} style={{
                  borderRadius: 8,
                  padding: "10px 8px",
                  textAlign: "center",
                  background: `${p.accent}10`,
                  border: `1px solid ${p.accent}25`,
                }}>
                  <p style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, color: p.accent, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>{p.phase}</p>
                  <p style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontSize: 9.5, fontWeight: 700, color: "#FFFFFF", marginBottom: 1 }}>{p.mode}</p>
                  <p style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontSize: 8.5, color: "#5E7A92" }}>{p.sub}</p>
                </div>
              ))}
            </div>

            {/* Compliance badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {COMPLIANCE.map((b) => (
                <span key={b} style={{
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: "#5E7A92",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  letterSpacing: "0.06em",
                }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right — text + features */}
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
            Governance & Compliance
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.1,
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Full autonomy without governance is unacceptable in enterprise
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#5E7A92",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 36,
          }}>
            ZoikoVertex is designed for autonomous-but-governed controlled, audit-ready outcomes. Enterprise-safe autonomy — the governance rails, not the brake.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                borderRadius: 12,
                padding: "16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  width: 34, height: 34,
                  borderRadius: 8,
                  background: "rgba(32,231,242,0.08)",
                  border: "1px solid rgba(32,231,242,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}>
                    {f.title}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    color: "#5E7A92",
                    lineHeight: 1.6,
                  }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
