export default function Architecture() {
  const layers = [
    {
      label: "STRATEGY",
      name: "LAYER 1 — STRATEGIC CONTROL",
      bg: "rgba(99,102,241,0.12)",
      border: "rgba(99,102,241,0.35)",
      labelColor: "#818CF8",
      nameColor: "#818CF8",
      cardBorder: "rgba(99,102,241,0.3)",
      components: [
        { title: "Chief Strategy Agent",      desc: "Revenue & EBITDA alignment" },
        { title: "Business Context Engine",   desc: "ERP, inventory, pricing, margin" },
        { title: "Commercial Priority Layer", desc: "Seasonal & strategic weighting" },
      ],
    },
    {
      label: "EXECUTION",
      name: "LAYER 2 — EXECUTION INTELLIGENCE",
      bg: "rgba(129,140,248,0.08)",
      border: "rgba(129,140,248,0.3)",
      labelColor: "#A5B4FC",
      nameColor: "#A5B4FC",
      cardBorder: "rgba(129,140,248,0.25)",
      components: [
        { title: "Creative Intelligence Lab", desc: "Platform-native content & copy" },
        { title: "Execution Agent",           desc: "Deploy, pace, sequence campaigns" },
        { title: "Engagement Agent",          desc: "Interactions & conversion signals" },
        { title: "Channel Orchestrator",      desc: "Cross-platform sequencing" },
      ],
    },
    {
      label: "FINANCIAL",
      name: "LAYER 3 — FINANCIAL & OPTIMIZATION",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.3)",
      labelColor: "#34D399",
      nameColor: "#34D399",
      cardBorder: "rgba(52,211,153,0.25)",
      components: [
        { title: "Quant Ad Spend Agent",      desc: "CPA / ROAS / marginal return" },
        { title: "Revenue Forensic Agent",    desc: "Multi-touch attribution" },
        { title: "Growth Optimization Agent", desc: "Scale winners, kill waste" },
        { title: "LTV Correlation Engine",    desc: "Lifetime value mapping" },
      ],
    },
    {
      label: "GOVERNED",
      name: "LAYER 4 — GOVERNANCE & RISK",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.3)",
      labelColor: "#C4B5FD",
      nameColor: "#C4B5FD",
      cardBorder: "rgba(167,139,250,0.25)",
      components: [
        { title: "Compliance Sentry",       desc: "Brand + legal + sector rules" },
        { title: "Governance Engine",       desc: "Confidence scoring + approvals" },
        { title: "Audit Log System",        desc: "Full decision traceability" },
        { title: "Override & Intervention", desc: "Human-in-command controls" },
      ],
    },
    {
      label: "SIMULATE",
      name: "LAYER 5 — SIMULATION",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.3)",
      labelColor: "#FCD34D",
      nameColor: "#FCD34D",
      cardBorder: "rgba(245,158,11,0.25)",
      components: [
        { title: "Synthetic Audience Engine",   desc: "Predict response before spend" },
        { title: "Creative Scenario Modelling", desc: "Test before budget is committed" },
        { title: "Pre-Spend Waste Reduction",   desc: "Eliminate cost upstream" },
      ],
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#0f1b2e" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="inline-flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            <span className="w-4 h-px bg-cyan-400 inline-block" />
            Agentic Intelligence Architecture
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
            A layered system, not a collection of AI helpers
          </h2>
          <p className="text-white/40 max-w-lg mx-auto text-sm leading-relaxed">
            Five intelligence layers operating in concert — each purpose-built,
            each governed, each working as a closed loop that connects creative,
            channel, spend, and revenue in real time.
          </p>
        </div>

        {/* Layers */}
        <div className="flex flex-col gap-0">
          {layers.map((layer, li) => (
            <div key={layer.label}>

              {/* Dotted connector */}
              {li > 0 && (
                <div className="flex items-center" style={{ paddingLeft: 32 }}>
                  <div style={{ width: 32, flexShrink: 0 }} />
                  <div className="flex-1 flex justify-center py-1">
                    <div style={{ width: 1, height: 18, borderLeft: `2px dashed ${layer.border}` }} />
                  </div>
                </div>
              )}

              {/* Row */}
              <div className="flex items-stretch">

                {/* Vertical label — sits outside the tinted box */}
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 32 }}
                >
                  <span
                    className="text-[8px] font-black tracking-widest uppercase whitespace-nowrap select-none"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      color: layer.labelColor,
                      letterSpacing: "0.2em",
                    }}
                  >
                    {layer.label}
                  </span>
                </div>

                {/* Tinted layer box */}
                <div
                  className="flex-1 rounded-2xl"
                  style={{
                    background: layer.bg,
                    border: `1px solid ${layer.border}`,
                    padding: "14px 16px",
                  }}
                >
                  {/* Inner row: layer name LEFT | cards RIGHT */}
                  <div className="flex items-center gap-4">

                    {/* Layer name — fixed width left column */}
                    <div style={{ width: 210, flexShrink: 0 }}>
                      <p
                        className="text-[9px] font-bold tracking-widest uppercase leading-tight"
                        style={{ color: layer.nameColor, letterSpacing: "0.12em" }}
                      >
                        {layer.name}
                      </p>
                    </div>

                    {/* Cards — fill remaining space */}
                    <div className="flex flex-1 gap-2.5">
                      {layer.components.map((c) => (
                        <div
                          key={c.title}
                          className="flex-1 rounded-xl px-3.5 py-3"
                          style={{
                            background: "rgba(10,18,32,0.6)",
                            border: `1px solid ${layer.cardBorder}`,
                            minWidth: 0,
                          }}
                        >
                          <p className="font-bold text-[12px] mb-1 leading-snug" style={{ color: "#C8D8E8" }}>
                            {c.title}
                          </p>
                          <p className="text-[11px] leading-snug" style={{ color: "#6E8BA0" }}>
                            {c.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}