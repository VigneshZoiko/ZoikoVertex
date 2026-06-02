export default function Accountability() {
  const bullets = [
    "ROI per campaign, channel, and platform",
    "Cost per acquisition and contribution margin impact",
    "Lifetime value correlation and revenue path",
    "Wasted spend identified, recovered, and reported",
    "Budget reallocation effect on profit, not just spend",
    "Revenue path from touchpoint to a sale event",
  ];

  const metrics = [
    {
      label: "Campaign ROI",
      value: "2.3× → 3.7×",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Cost per acquisition",
      value: "-26% reduction",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Wasted spend recovered",
      value: "$6,400 / 48h",
      badge: "#ede9fe",
      text: "#6d28d9",
    },
    {
      label: "Budget reallocated",
      value: "$18,200 auto",
      badge: "#ede9fe",
      text: "#6d28d9",
    },
    {
      label: "Daily profit impact",
      value: "+14.0%",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Attribution confidence",
      value: "Multi-touch ✓",
      badge: "#dcfce7",
      text: "#15803d",
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <p className="text-cyan-500 text-xs font-bold tracking-widest uppercase mb-4">
            — ROI Engine
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-5">
            Audit-grade financial accountability
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            ZoikoVertex is designed to satisfy the core finance question: is
            marketing generating profit, or only activity? The ROI engine
            reconciles spend to contribution margin in a language CFOs and
            boards can verify.
          </p>
          <ul className="space-y-3 mb-10">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-gray-600 text-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          <div
            className="rounded-xl p-5"
            style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}
          >
            <p className="text-sm text-teal-800 leading-relaxed">
              <span className="font-bold">Economic instability:</span>{" "}
              ZoikoVertex improves marketing efficiency by over 35%. It pays for
              itself multiple times over — making low-adoption financially
              irrational in performance-sensitive organisations.
            </p>
          </div>
        </div>
        <div className="rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <p
              className="font-bold text-gray-900 text-sm inline-flex items-center"
              style={{
                borderBottom: "0.8px solid #F1F5F9",
                paddingBottom: "14.8px",
                paddingRight: "193.403px",
              }}
            >
              Campaign Performance Dashboard
            </p>
          </div>
          <div>
            {metrics.map((m) => (
              <div key={m.label} className="px-4 py-2">
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "#f8f8f8" }}
                >
                  <span className="text-gray-500 text-sm">{m.label}</span>
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: m.badge, color: m.text }}
                  >
                    {m.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
