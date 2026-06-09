import Image from "next/image";

const COMPARISONS = [
  {
    tool: "Tools explain what happened",
    zoiko: "ZoikoVertex determines what should happen next and acts on it",
  },
  {
    tool: "Tools optimize activity",
    zoiko: "ZoikoVertex optimizes revenue, contribution margin, and marketing efficiency",
  },
  {
    tool: "Tools require humans to decide",
    zoiko: "ZoikoVertex makes and governs capital decisions continuously, within your policy",
  },
];

export default function FeatureBlock() {
  return (
    <section style={{ background: "#FFFFFF", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start" }}>
        <div>
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
            marginBottom: 20,
          }}>
            <span style={{ width: 24, height: 1, background: "#6366F1", display: "inline-block" }} />
            Category Definition
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#0A1628",
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}>
            Tools execute tasks.<br />Systems manage outcomes.
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.75,
            marginBottom: 32,
          }}>
            Traditional platforms like Hootsuite and Sprout Social help teams schedule, publish, and report. They do not allocate capital, optimize profit, enforce financial accountability, or align execution with enterprise operating realities.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {COMPARISONS.map((c, i) => (
              <div key={i} style={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                padding: "16px 18px",
                background: "#FAFBFC",
              }}>
                <p style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  color: "#94A3B8",
                  marginBottom: 6,
                  textDecoration: "line-through",
                }}>
                  {c.tool}
                </p>
                <p style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: "#6366F1", fontWeight: 700 }}>→ </span>{c.zoiko}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden" }}>
          <Image
            src="/images/home-category.webp"
            alt="Category definition"
            width={600}
            height={400}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </div>
    </section>
  );
}
