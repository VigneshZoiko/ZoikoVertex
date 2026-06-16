export default function Accountability() {
  const bullets = [
    "ROI per campaign, channel, and platform",
    "Cost per acquisition and contribution margin impact",
    "Lifetime value correlation and revenue path",
    "Wasted spend identified, recovered, and reported",
    "Budget reallocation effect on profit, not just spend",
    "Revenue path from touchpoint to cash event",
  ];

  const metrics = [
    { label: "Campaign ROI",            value: "2.3× → 3.7×",    badge: "#14532d", text: "#4ade80" },
    { label: "Cost per acquisition",    value: "-26% reduction",  badge: "#451a03", text: "#fb923c" },
    { label: "Wasted spend recovered",  value: "$6,400 / 48h",   badge: "#1e1b4b", text: "#818cf8" },
    { label: "Budget reallocated",      value: "$18,200 auto",   badge: "#164e63", text: "#22d3ee" },
    { label: "Daily profit impact",     value: "+14.0%",          badge: "#14532d", text: "#4ade80" },
    { label: "Attribution confidence",  value: "Multi-touch ✓",  badge: "#1e2a4a", text: "#c7d2fe" },
  ];

  return (
    <section style={{ background: "#1F2E55" }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — ROI Engine
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Audit-grade financial accountability
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            ZoikoVertex is designed to satisfy the core finance question: is
            marketing generating profit, or only activity? The ROI engine
            reconciles spend to contribution margin in a language CFOs and
            boards can verify.
          </p>
          <ul className="space-y-3 mb-10">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-white/70 text-sm">
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#20e7f2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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
            style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #6366f1" }}
          >
            <p className="text-sm text-white/60 leading-relaxed italic">
              <span className="font-bold text-white/80 not-italic">Economic inevitability:</span>{" "}
              If ZoikoVertex improves marketing efficiency by even 15%, it pays for itself multiple times over —
              making non-adoption financially irrational in performance-sensitive organizations.
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1A2A5E 0%, #121E42 100%)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "16px", boxShadow: "0 24px 60px 0 rgba(0,0,0,0.45)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="font-bold text-white text-sm">Campaign Performance Dashboard</p>
            <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Live
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#1E2F55" }}>
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between px-6 py-4">
                <span className="text-white/70 text-sm">{m.label}</span>
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: m.badge, color: m.text }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
