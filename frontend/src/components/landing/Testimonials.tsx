export default function Testimonials() {
  const quotes = [
    {
      quote:
        "For the first time, I can see exactly what marketing is doing to contribution margin — not just impressions and clicks. ZoikoVertex made marketing a real line item I can defend to the board.",
      name: "David Warwick",
      role: "CFO, Meridian Commerce Group",
      initials: "DW",
      color: "#6366f1",
    },
    {
      quote:
        "We operate in a regulated sector. The compliance controls and pre-publication review gave us the confidence to scale agentic execution at a pace our legal team could actually support.",
      name: "Simone Adler",
      role: "CMO, Orbis Financial",
      initials: "SA",
      color: "#7c3aed",
    },
    {
      quote:
        "The system identified a 31% CPA gap between channels and reallocated budget automatically. We saw the profit impact on a Monday morning dashboard. That's not marketing — that's infrastructure.",
      name: "Raj Krishnamurthy",
      role: "CEO, TerraScale Retail",
      initials: "RK",
      color: "#4f46e5",
    },
  ];

  const Stars = () => (
    <div className="flex gap-1 mb-5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  return (
    <section className="py-24 px-6" style={{ background: "#080d1a" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — Executive Validation
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5">
            What enterprise leaders say
          </h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            From CFOs who needed financial accountability to CMOs who needed
            scale — ZoikoVertex changes how leadership thinks about marketing.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Stars />
              <p className="text-white/70 text-sm leading-relaxed mb-8 flex-1 text-center">
                &ldquo;{q.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black"
                  style={{ background: q.color }}
                >
                  {q.initials}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{q.name}</p>
                  <p className="text-white/40 text-xs">{q.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
