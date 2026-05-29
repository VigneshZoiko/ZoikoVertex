import Link from "next/link";

export default function Industries() {
  const tabs = [
    {
      label: "Enterprise Retail",
      title: "Governed growth from SKU to sale",
      desc: "ZoikoVertex integrates inventory, pricing, and margin data so campaigns automatically redirect spend away from low-stock or low-margin SKUs toward highest-return product categories in real time.",
      cta: "See Enterprise Retail Demo â†’",
      points: [
        "Automatically pauses promotions when stock falls below defined thresholds",
        "Budget follows margin, not just volume â€” higher-margin SKUs get prioritised spend",
        "System detects seasonal windows and triggers campaigns without manual scheduling",
        "Every campaign traced to contribution margin, not just revenue",
      ],
    },
    {
      label: "FinTech",
      title: "Compliant marketing in regulated markets",
      desc: "ZoikoVertex applies FCA, SEC, and jurisdiction-specific compliance rules at the agent level â€” every piece of content reviewed before publication, every decision logged.",
      cta: "See FinTech Demo â†’",
      points: [
        "Pre-publication compliance review against FCA and sector-specific advertising rules",
        "Full audit trail for every campaign action â€” board and regulator ready",
        "Jurisdiction-aware targeting â€” different rules enforced per market automatically",
        "Evidence vault for legal review and dispute resolution",
      ],
    },
    {
      label: "Healthcare",
      title: "Safe, evidence-based marketing at scale",
      desc: "ZoikoVertex enforces medical advertising standards, claim verification, and patient safety rules across every agent action â€” zero tolerance for non-compliant content.",
      cta: "See Healthcare Demo â†’",
      points: [
        "Claim verification against approved medical language before every publication",
        "HIPAA-aware data handling and audience targeting protocols",
        "Multi-stage approval for clinical and regulatory sign-off",
        "Full traceability from campaign intent to patient-facing output",
      ],
    },
    {
      label: "B2B SaaS",
      title: "Pipeline-aligned demand generation",
      desc: "ZoikoVertex connects marketing spend to pipeline stages, ICP fit, and revenue contribution â€” ensuring budget flows to the segments and channels that close.",
      cta: "See B2B SaaS Demo â†’",
      points: [
        "Budget allocation tied to pipeline stage conversion rates, not impressions",
        "ICP scoring integrated into campaign targeting decisions",
        "ABM coordination across content, paid, and outbound channels",
        "Revenue attribution back to specific marketing touchpoints and spend decisions",
      ],
    },
    {
      label: "Logistics",
      title: "Demand-driven marketing for complex networks",
      desc: "ZoikoVertex adapts campaign spend in real time to route demand toward available capacity, seasonal peaks, and high-margin service lines.",
      cta: "See Logistics Demo â†’",
      points: [
        "Campaigns automatically redirect toward high-capacity lanes and service types",
        "Seasonal demand signals trigger campaign activation without manual input",
        "Margin-aware spend â€” budget prioritised by contribution, not volume",
        "Full audit trail for marketing decisions across complex multi-region networks",
      ],
    },
    {
      label: "Telecom",
      title: "Churn reduction and ARPU optimisation",
      desc: "ZoikoVertex identifies at-risk segments, coordinates retention campaigns, and optimises upsell spend across channels â€” all governed and tracked to revenue impact.",
      cta: "See Telecom Demo â†’",
      points: [
        "Predictive churn signals trigger governed retention campaigns automatically",
        "Upsell and cross-sell spend prioritised by ARPU contribution and LTV",
        "Multi-channel coordination across digital, in-app, and direct channels",
        "Every retention action logged and traceable to revenue outcome",
      ],
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            â€” Industries & Use Cases
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Built for enterprise realities
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
            ZoikoVertex is not a generic AI tool. It is configured for the
            commercial and regulatory realities of specific industries â€” with
            vertical-specific logic built in.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                i === 0
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">
              {tabs[0].title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              {tabs[0].desc}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {tabs[0].cta}
            </Link>
          </div>
          <div className="space-y-5">
            {tabs[0].points.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="#6366f1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
