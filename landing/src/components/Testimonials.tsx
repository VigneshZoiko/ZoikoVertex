const QUOTES = [
  {
    quote: "For the first time, I can see exactly what marketing is doing to contribution margin — not just impressions and clicks. ZoikoVertex made marketing a real line item I can defend to the board.",
    name: "David Warwick",
    role: "CFO, Meridian Commerce Group",
    initials: "DW",
    accent: "#20E7F2",
  },
  {
    quote: "We operate in a regulated sector. The compliance controls and pre-publication review gave us the confidence to scale agentic execution at a pace our legal team could actually support.",
    name: "Simone Adler",
    role: "CMO, Orbis Financial",
    initials: "SA",
    accent: "#818CF8",
  },
  {
    quote: "The system identified a 31% CPA gap between channels and reallocated budget automatically. We saw the profit impact on a Monday morning dashboard. That's not marketing — that's infrastructure.",
    name: "Raj Krishnamurthy",
    role: "CEO, TerraScale Retail",
    initials: "RK",
    accent: "#34D399",
  },
];

function Stars() {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section style={{ background: "#152238", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#20E7F2",
            marginBottom: 16,
          }}>
            <span style={{ width: 24, height: 1, background: "#20E7F2", display: "inline-block" }} />
            Executive Validation
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#FFFFFF",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            What enterprise leaders say
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#5E7A92",
            fontSize: 14,
            maxWidth: 440,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            From CFOs who needed financial accountability to CMOs who needed scale — ZoikoVertex changes how leadership thinks about marketing.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {QUOTES.map((q, i) => (
            <div key={i} style={{
              borderRadius: 16,
              padding: "28px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              flexDirection: "column",
            }}>
              <Stars />
              <p style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#A9B8C7",
                fontSize: 13,
                lineHeight: 1.7,
                flex: 1,
                marginBottom: 24,
              }}>
                &ldquo;{q.quote}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `${q.accent}20`,
                  border: `1px solid ${q.accent}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                  fontSize: 12,
                  fontWeight: 800,
                  color: q.accent,
                }}>
                  {q.initials}
                </div>
                <div>
                  <p style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    marginBottom: 2,
                  }}>
                    {q.name}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 11,
                    color: "#5E7A92",
                  }}>
                    {q.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
