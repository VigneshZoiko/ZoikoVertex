export default function Architecture() {
  const layers = [
    {
      label: "STRATEGY",
      name: "LAYER 1 — STRATEGIC CONTROL",
      bg: "#eef0fb",
      border: "#d4d8f5",
      labelColor: "#6366f1",
      nameColor: "#818cf8",
      cardBorder: "#e0e3f7",
      components: [
        { title: "Chief Strategy Agent",      desc: "Revenue & EBITDA alignment" },
        { title: "Business Context Engine",   desc: "ERP, inventory, pricing, margin" },
        { title: "Commercial Priority Layer", desc: "Seasonal & strategic weighting" },
      ],
    },
    {
      label: "EXECUTION",
      name: "LAYER 2 — EXECUTION INTELLIGENCE",
      bg: "#f0edfb",
      border: "#ddd6f5",
      labelColor: "#7c3aed",
      nameColor: "#a78bfa",
      cardBorder: "#e8e3f7",
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
      bg: "#eaf8f6",
      border: "#b2e8e2",
      labelColor: "#0d9488",
      nameColor: "#2dd4bf",
      cardBorder: "#c8eeea",
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
      bg: "#eeebfb",
      border: "#cfc8f0",
      labelColor: "#5b21b6",
      nameColor: "#8b5cf6",
      cardBorder: "#ddd8f5",
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
      bg: "#e8f8f2",
      border: "#a7e8d0",
      labelColor: "#059669",
      nameColor: "#34d399",
      cardBorder: "#b8e8d4",
      components: [
        { title: "Synthetic Audience Engine",   desc: "Predict response before spend" },
        { title: "Creative Scenario Modelling", desc: "Test before budget is committed" },
        { title: "Pre-Spend Waste Reduction",   desc: "Eliminate cost upstream" },
      ],
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#f8f8fc" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="inline-flex items-center gap-2 text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            <span className="w-4 h-px bg-indigo-400 inline-block" />
            Agentic Intelligence Architecture
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-5 leading-tight">
            A layered system, not a collection of AI helpers
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
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
                          className="flex-1 bg-white rounded-xl px-3.5 py-3"
                          style={{
                            border: `1px solid ${layer.cardBorder}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            minWidth: 0,
                          }}
                        >
                          <p className="text-gray-900 font-bold text-[12px] mb-1 leading-snug">
                            {c.title}
                          </p>
                          <p className="text-gray-400 text-[11px] leading-snug">
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