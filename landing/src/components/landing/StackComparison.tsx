export default function StackComparison() {
  const rows = [
    { feature: "Autonomous capital allocation",             us: true, them: false },
    { feature: "Inventory & margin integration",            us: true, them: false },
    { feature: "Multi-touch ROI attribution",               us: true, them: "Partial" },
    { feature: "Pre-publication compliance review",         us: true, them: false },
    { feature: "Governed autonomy with audit logs",         us: true, them: false },
    { feature: "Executive profit-impact dashboard",         us: true, them: false },
    { feature: "Synthetic audience simulation",             us: true, them: false },
    { feature: "Business context integration (ERP/inventory)", us: true, them: false },
    { feature: "Phased autonomy rollout model",             us: true, them: false },
    { feature: "Contribution margin reporting",             us: true, them: false },
  ];

  const CheckIcon = () => (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full"
      style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 8l4.5 4.5L14 3" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );

  const CrossIcon = () => (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );

  return (
    <section style={{ background: "#0a0d14" }} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
            — Competitive Advantage
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Why current stacks fall short
          </h2>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Tools execute tasks. ZoikoVertex manages outcomes. The difference is
            measurable in capital efficiency and executive confidence.
          </p>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="grid grid-cols-3 px-8 py-4"
            style={{ background: "#1a2235", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
              Capability
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-center text-cyan-400">
              ZoikoVertex
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-center text-white/40">
              Traditional Platforms
            </span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.feature}
              className="grid grid-cols-3 px-8 py-4"
              style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
            >
              <span className="text-white/60 text-sm">{r.feature}</span>
              <span className="flex justify-center"><CheckIcon /></span>
              <span className="flex justify-center">
                {r.them === false ? (
                  <CrossIcon />
                ) : (
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}
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
