export default function Stats() {
  const stats = [
    { number: "26", suffix: "%", label: "Average CPA reduction" },
    { number: "72", suffix: "h", label: "Time to first insight" },
    { number: "3.7", suffix: "×", label: "Campaign ROI uplift" },
    { number: "30", suffix: "d", label: "Measurable ROI evidence" },
  ];

  return (
    <section style={{ background: "#F5F7FA", padding: "80px 24px" }} id="features">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#6366F1",
            marginBottom: 16,
          }}>
            <span style={{ width: 24, height: 1, background: "#6366F1", display: "inline-block" }} />
            Proof in Practice
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            fontWeight: 900,
            color: "#0A1628",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Numbers that move the board
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#64748B",
            fontSize: 14,
            maxWidth: 440,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            Not abstract intelligence. Measurable performance movement, reduced waste, and improved capital efficiency — reportable to finance.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          overflow: "hidden",
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              padding: "36px 32px",
              borderRight: i < stats.length - 1 ? "1px solid #E2E8F0" : "none",
            }}>
              <p style={{
                fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                fontSize: "2.8rem",
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 8,
              }}>
                <span style={{ color: "#6366F1" }}>{s.number}</span>
                <span style={{ color: "#0A1628" }}>{s.suffix}</span>
              </p>
              <p style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.4,
              }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
