export default function PainPoints() {
  const chaos = [
    "Marketing spend distributed across platforms with no unified campaigns or decision system",
    "Campaigns continue running when margins are weak or strategic priorities have shifted",
    "Teams optimise for engagement and impressions rather than contribution margin and profit",
    "Attribution remains inconsistent — finance teams distrust marketing-reported ROI",
    "Legal has flagged claimed topics, copyright exposure, or jurisdiction restriction concerns",
    "Leadership lacks a single operating view of what marketing is doing to revenue and cost efficiency",
  ];

  const governed = [
    "Capital allocation engine that moves budget to the highest-return opportunities automatically",
    "Business context integration — inventory, pricing, margin signal directly into campaign decisions",
    "Decisions governed by revenue, contribution margin, and marketing efficiency — not vanity metrics",
    "Multi-touch attribution reconciled to finance — ROI every CFO can defend to the board",
    "Pre-publication compliance review — brand-safe, legally defensible, sector-aware before every post",
    "Executive Command Centre — profit impact, actions taken, approvals pending, in one view",
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#F5F7FA" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            <span className="w-4 h-px bg-indigo-400 inline-block" />
            The Executive Problem
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-5 leading-tight">
            What most businesses are actually struggling with
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
            ZoikoVertex is designed to solve the board-level problem behind
            marketing: how to turn digital growth into a governed,
            capital-efficient, provable operating function.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div
            className="rounded-2xl p-7 bg-white"
            style={{ border: "1px solid #FECACA" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <circle cx="12" cy="16" r="0.5" fill="#EF4444" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-sm">
                Current state: fragmented chaos
              </p>
            </div>
            <ul className="space-y-3.5">
              {chaos.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-gray-500 text-sm leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0 mt-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl p-7 bg-white"
            style={{ border: "1px solid #A7F3D0" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-sm">
                ZoikoVertex: governed operating system
              </p>
            </div>
            <ul className="space-y-3.5">
              {governed.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-gray-500 text-sm leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 flex-shrink-0 mt-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
