export default function Architecture() {
  const layers = [
    {
      label: "STRATEGY",
      name: "LAYER 1 â€” STRATEGIC CONTROL",
      bg: "#eeeeff",
      labelColor: "#6366f1",
      nameColor: "#a5b4fc",
      components: [
        { title: "Chief Strategy Agent", desc: "Revenue & EBITDA alignment" },
        {
          title: "Business Context Engine",
          desc: "ERP, inventory, pricing, margin",
        },
        {
          title: "Commercial Priority Layer",
          desc: "Queueing & priority scheduling",
        },
      ],
    },
    {
      label: "EXECUTION",
      name: "LAYER 2 â€” EXECUTION INTELLIGENCE",
      bg: "#ede9fe",
      labelColor: "#7c3aed",
      nameColor: "#c4b5fd",
      components: [
        {
          title: "Creative Intelligence Lab",
          desc: "Platform-native content & copy",
        },
        { title: "Execution Agent", desc: "Deploy, pace, sequence campaigns" },
        { title: "Engagement Agent", desc: "Interactions & knowledge capture" },
        { title: "Channel Orchestrator", desc: "Cross-platform sequencing" },
      ],
    },
    {
      label: "FINANCIAL",
      name: "LAYER 3 â€” FINANCIAL & OPTIMIZATION",
      bg: "#ccfbf1",
      labelColor: "#0d9488",
      nameColor: "#5eead4",
      components: [
        { title: "Quant Ad Spend Agent", desc: "CPA / ROAS / marginal return" },
        { title: "Revenue Forensic Agent", desc: "Multi-touch attribution" },
        {
          title: "Growth Optimisation Agent",
          desc: "True winners, kill waste",
        },
        { title: "LTV Correlation Engine", desc: "Scale winners, LTV maps" },
      ],
    },
    {
      label: "GOVERNED",
      name: "LAYER 4 â€” GOVERNANCE & RISK",
      bg: "#ddd6fe",
      labelColor: "#5b21b6",
      nameColor: "#a78bfa",
      components: [
        { title: "Compliance Sentry", desc: "Brand + legal + sector rules" },
        { title: "Governance Engine", desc: "Confidence scoring + approvals" },
        { title: "Audit Log System", desc: "Full decision traceability" },
        {
          title: "Override & Intervention",
          desc: "Freeze/de-prioritise control",
        },
      ],
    },
    {
      label: "SIMULATE",
      name: "LAYER 5 â€” SIMULATION",
      bg: "#d1fae5",
      labelColor: "#059669",
      nameColor: "#6ee7b7",
      components: [
        {
          title: "Synthetic Audience Engine",
          desc: "Predict response before spend",
        },
        {
          title: "Creative Scenario Modelling",
          desc: "Test before budget is committed",
        },
        { title: "Pre-Spend Waste Reduction", desc: "Eliminate cost upstream" },
      ],
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#f8f8fc" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">
            â€” Agentic Intelligence Architecture
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            A layered system, not a collection of AI helpers
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Five intelligence layers operating in concert â€” each purpose-built,
            each governed, each working as a closed loop that connects creative,
            channel, spend, and revenue in real time.
          </p>
        </div>
        <div className="space-y-3">
          {layers.map((layer) => (
            <div key={layer.label} className="flex items-stretch gap-4">
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <span
                  className="text-[9px] font-black tracking-widest uppercase whitespace-nowrap"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    color: layer.labelColor,
                  }}
                >
                  {layer.label}
                </span>
              </div>
              <div
                className="flex-1 rounded-2xl px-5 py-4"
                style={{ background: layer.bg }}
              >
                <p
                  className="text-[10px] font-bold tracking-widest uppercase mb-3"
                  style={{ color: layer.nameColor }}
                >
                  {layer.name}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {layer.components.map((c) => (
                    <div
                      key={c.title}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm"
                    >
                      <p className="text-gray-900 font-bold text-xs mb-1">
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
          ))}
        </div>
      </div>
    </section>
  );
}
