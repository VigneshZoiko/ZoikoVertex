export default function StackComparison() {
  const rows = [
    { feature: "Autonomous capital allocation", us: true, them: false },
    { feature: "Inventory & margin integration", us: true, them: false },
    { feature: "Multi-touch ROI attribution", us: true, them: "Partial" },
    { feature: "Pre-publication compliance review", us: true, them: false },
    { feature: "Governed autonomy with audit logs", us: true, them: false },
    { feature: "Executive profit-impact dashboard", us: true, them: false },
    { feature: "Synthetic audience simulation", us: true, them: false },
    {
      feature: "Business context integration (ERP/inventory)",
      us: true,
      them: false,
    },
    { feature: "Phased autonomy rollout model", us: true, them: false },
    { feature: "Contribution margin reporting", us: true, them: false },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            â€” Competitive Advantage
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Why current stacks fall short
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Tools execute tasks. ZoikoVertex manages outcomes. The difference is
            measurable in capital efficiency and executive confidence.
          </p>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
        >
          <div
            className="grid grid-cols-3 px-8 py-4 border-b"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
              Capability
            </span>
            <span
              className="text-xs font-bold tracking-widest uppercase text-center"
              style={{ color: "#6366f1" }}
            >
              ZoikoVertex
            </span>
            <span className="text-xs font-bold tracking-widest uppercase text-center text-gray-400">
              Traditional Platforms
            </span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.feature}
              className={`grid grid-cols-3 px-8 py-4 ${i < rows.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "#E2E8F0" }}
            >
              <span className="text-gray-500 text-sm">{r.feature}</span>
              <span className="text-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="inline-block"
                >
                  <path
                    d="M2 8l4.5 4.5L14 3"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-center">
                {r.them === false ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="inline-block"
                  >
                    <path
                      d="M1 1l10 10M11 1L1 11"
                      stroke="#CBD5E1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#f97316" }}
                  >
                    {r.them}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
