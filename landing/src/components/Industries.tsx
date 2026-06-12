"use client";
import Link from "next/link";
import { useState } from "react";

const TABS = [
  {
    label: "Enterprise Retail",
    title: "Governed growth from SKU to sale",
    desc: "ZoikoVertex integrates inventory, pricing, and margin data so campaigns automatically redirect spend away from low-stock or low-margin SKUs toward highest-return product categories in real time.",
    cta: "See Enterprise Retail Demo →",
    href: "/signup",
    points: [
      "Automatically pauses promotions when stock falls below defined thresholds",
      "Budget follows margin, not just volume — higher-margin SKUs get prioritised spend",
      "System detects seasonal windows and triggers campaigns without manual scheduling",
      "Every campaign traced to contribution margin, not just revenue",
    ],
  },
  {
    label: "FinTech",
    title: "Compliant marketing in regulated markets",
    desc: "ZoikoVertex applies FCA, SEC, and jurisdiction-specific compliance rules at the agent level — every piece of content reviewed before publication, every decision logged.",
    cta: "See FinTech Demo →",
    href: "/signup",
    points: [
      "Pre-publication compliance review against FCA and sector-specific advertising rules",
      "Full audit trail for every campaign action — board and regulator ready",
      "Jurisdiction-aware targeting — different rules enforced per market automatically",
      "Evidence vault for legal review and dispute resolution",
    ],
  },
  {
    label: "Healthcare",
    title: "Safe, evidence-based marketing at scale",
    desc: "ZoikoVertex enforces medical advertising standards, claim verification, and patient safety rules across every agent action — zero tolerance for non-compliant content.",
    cta: "See Healthcare Demo →",
    href: "/signup",
    points: [
      "Claim verification against approved medical language before every publication",
      "HIPAA-aware data handling and audience targeting protocols",
      "Multi-stage approval for clinical and regulatory sign-off",
      "Full traceability from campaign intent to patient-facing output",
    ],
  },
  {
    label: "B2B SaaS",
    title: "Pipeline-aligned demand generation",
    desc: "ZoikoVertex connects marketing spend to pipeline stages, ICP fit, and revenue contribution — ensuring budget flows to the segments and channels that close.",
    cta: "See B2B SaaS Demo →",
    href: "/signup",
    points: [
      "Budget allocation tied to pipeline stage conversion rates, not impressions",
      "ICP scoring integrated into campaign targeting decisions",
      "ABM coordination across content, paid, and outbound channels",
      "Revenue attribution back to specific marketing touchpoints and spend decisions",
    ],
  },
  {
    label: "Logistics",
    title: "Demand-driven marketing for complex networks",
    desc: "ZoikoVertex adapts campaign spend in real time to route demand toward available capacity, seasonal peaks, and high-margin service lines.",
    cta: "See Logistics Demo →",
    href: "/signup",
    points: [
      "Campaigns automatically redirect toward high-capacity lanes and service types",
      "Seasonal demand signals trigger campaign activation without manual input",
      "Margin-aware spend — budget prioritised by contribution, not volume",
      "Full audit trail for marketing decisions across complex multi-region networks",
    ],
  },
  {
    label: "Telecom",
    title: "Churn reduction and ARPU optimisation",
    desc: "ZoikoVertex identifies at-risk segments, coordinates retention campaigns, and optimises upsell spend across channels — all governed and tracked to revenue impact.",
    cta: "See Telecom Demo →",
    href: "/signup",
    points: [
      "Predictive churn signals trigger governed retention campaigns automatically",
      "Upsell and cross-sell spend prioritised by ARPU contribution and LTV",
      "Multi-channel coordination across digital, in-app, and direct channels",
      "Every retention action logged and traceable to revenue outcome",
    ],
  },
];

export default function Industries() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section style={{ background: "#F5F7FA", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
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
            Industries & Use Cases
          </div>
          <h2 style={{
            fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 900,
            color: "#0A1628",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}>
            Built for enterprise realities
          </h2>
          <p style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            color: "#64748B",
            fontSize: 14,
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            ZoikoVertex is not a generic AI tool. It is configured for the commercial and regulatory realities of specific industries — with vertical-specific logic built in.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 48 }}>
          {TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: 999,
                border: `1px solid ${i === active ? "#6366F1" : "#E2E8F0"}`,
                background: i === active ? "#EEF2FF" : "#FFFFFF",
                color: i === active ? "#6366F1" : "#64748B",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start",
          background: "#FFFFFF", borderRadius: 16, padding: "40px",
          border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div>
            <h3 style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "#0A1628",
              marginBottom: 16,
              letterSpacing: "-0.01em",
            }}>
              {tab.title}
            </h3>
            <p style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              color: "#64748B",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 24,
            }}>
              {tab.desc}
            </p>
            <Link href={tab.href} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#6366F1",
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
            }}>
              {tab.cta}
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tab.points.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 22, height: 22,
                  borderRadius: "50%",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 1,
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  color: "#475569",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}>
                  {p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
