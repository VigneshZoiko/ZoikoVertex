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
    { label: "Campaign ROI",           value: "2.3× → 3.7×",   bg: "#1a3a2a", text: "#4ade80", border: "#2a5a3a" },
    { label: "Cost per acquisition",   value: "-26% reduction", bg: "#3a2a10", text: "#f59e0b", border: "#5a4020" },
    { label: "Wasted spend recovered", value: "$6,400 / 48h",   bg: "#1a2a3a", text: "#60a5fa", border: "#2a3a5a" },
    { label: "Budget reallocated",     value: "$18,200 auto",   bg: "#1a2a3a", text: "#60a5fa", border: "#2a3a5a" },
    { label: "Daily profit impact",    value: "+14.0%",         bg: "#1a3a2a", text: "#4ade80", border: "#2a5a3a" },
    { label: "Attribution confidence", value: "Multi-touch ✓",  bg: "#1a3a2a", text: "#4ade80", border: "#2a5a3a" },
  ];

  return (
    <section style={{ background: "#152238" }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

        {/* ── LEFT ── */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="w-4 h-px bg-[#20E7F2] inline-block" />
            <p className="text-[#20E7F2] text-[10px] font-bold tracking-[0.2em] uppercase">
              ROI Engine
            </p>
          </div>

          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Audit-grade financial accountability
          </h2>

          <p className="text-[#8b9cb3] text-[14px] leading-relaxed mb-8">
            ZoikoVertex is designed to satisfy the core finance question: is
            marketing generating profit, or only activity? The ROI engine
            reconciles spend to contribution margin in a language CFOs
            and boards can verify.
          </p>

          <ul className="space-y-2.5 mb-10">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[#8b9cb3] text-[13px]">
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </li>
            ))}
          </ul>

          <div
            className=" p-5"
            style={{ background: "rgba(32,231,242,0.04)", borderLeft: "3px solid #20E7F2" }}
          >
            <p className="text-[#8b9cb3] text-[13px] leading-relaxed italic">
              <span className="text-white font-bold not-italic">Economic inevitability:</span>{" "}
              If ZoikoVertex improves marketing efficiency by even 15%, it pays for itself
              multiple times over — making non-adoption financially irrational in
              performance-sensitive organizations.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Dashboard card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#152238",
            border: "1px solid rgba(32,231,242,0.12)",
            boxShadow: "0 24px 60px #00000073, 0 8px 24px #00000073",
          }}
        >
          {/* Header — distinct lighter bg */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background: "#00000040",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-white font-bold text-[14px]">
              Campaign Performance Dashboard
            </span>
            <span
              className="flex items-center gap-1.5 text-[#22C55E] text-[11px] font-semibold px-2.5 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              Live
            </span>
          </div>

          {/* Metric rows */}
          <div className="flex flex-col">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: i < metrics.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
                }}
              >
                <span className="text-[#8b9cb3] text-[13px]">{m.label}</span>
                <span
                  className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                  style={{ background: m.bg, color: m.text, border: `1px solid ${m.border}` }}
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