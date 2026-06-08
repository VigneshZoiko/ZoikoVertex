export default function Architecture() {
  const layers = [
    {
      label: "STRATEGY",
      name: "LAYER 1 — STRATEGIC CONTROL",
      bg: "rgba(99,102,241,0.06)",
      border: "rgba(99,102,241,0.2)",
      labelColor: "#6366F1",
      nameColor: "#6366F1",
      cardBorder: "rgba(99,102,241,0.2)",
      components: [
        { title: "Chief Strategy Agent",      desc: "Revenue & EBITDA alignment" },
        { title: "Business Context Engine",   desc: "ERP, inventory, pricing, margin" },
        { title: "Commercial Priority Layer", desc: "Seasonal & strategic weighting" },
      ],
    },
    {
      label: "EXECUTION",
      name: "LAYER 2 — EXECUTION INTELLIGENCE",
      bg: "rgba(99,102,241,0.04)",
      border: "rgba(99,102,241,0.15)",
      labelColor: "#6366F1",
      nameColor: "#6366F1",
      cardBorder: "rgba(99,102,241,0.15)",
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
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.2)",
      labelColor: "#059669",
      nameColor: "#059669",
      cardBorder: "rgba(16,185,129,0.2)",
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
      bg: "rgba(139,92,246,0.05)",
      border: "rgba(139,92,246,0.18)",
      labelColor: "#7C3AED",
      nameColor: "#7C3AED",
      cardBorder: "rgba(139,92,246,0.18)",
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
      bg: "rgba(217,119,6,0.05)",
      border: "rgba(217,119,6,0.18)",
      labelColor: "#B45309",
      nameColor: "#B45309",
      cardBorder: "rgba(217,119,6,0.18)",
      components: [
        { title: "Synthetic Audience Engine",   desc: "Predict response before spend" },
        { title: "Creative Scenario Modelling", desc: "Test before budget is committed" },
        { title: "Pre-Spend Waste Reduction",   desc: "Eliminate cost upstream" },
      ],
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#FFFFFF" }}>
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
            Five intelligence layers operating in concert â€” each purpose-built,
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

                {/* Vertical label */}
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
                  <div className="flex items-center gap-4">

                    {/* Layer name */}
                    <div style={{ width: 210, flexShrink: 0 }}>
                      <p
                        className="text-[9px] font-bold tracking-widest uppercase leading-tight"
                        style={{ color: layer.nameColor, letterSpacing: "0.12em" }}
                      >
                        {layer.name}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-1 gap-2.5">
                      {layer.components.map((c) => (
                        <div
                          key={c.title}
                          className="flex-1 rounded-xl px-3.5 py-3 bg-white"
                          style={{
                            border: `1px solid ${layer.cardBorder}`,
                            minWidth: 0,
                          }}
                        >
                          <p className="font-bold text-[12px] mb-1 leading-snug text-gray-800">
                            {c.title}
                          </p>
                          <p className="text-[11px] leading-snug text-gray-500">
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
