"use client";
import { useEffect, useRef, useState } from "react";

const TRUST_CARDS = [
  {
    badge: "SOC 2 · ISO 27001",
    badgeColor: "#00C8F0",
    badgeBg: "#00C8F01F",
    badgeBorder: "#00C8F033",
    title: "Zero-Trust Security",
    description:
      "SOC 2 Type II readiness, ISO 27001 alignment. Every access event authenticated, logged, and auditable under zero-trust identity architecture.",
  },
  {
    badge: "GDPR · PII SAFE",
    badgeColor: "#6EE7B7",
    badgeBg: "#10B9811F",
    badgeBorder: "#10B98140",
    title: "Regional Data Governance",
    description:
      "GDPR compliance with PII segregation and regional data residency controls. No data crosses jurisdictional boundaries without policy authorization.",
  },
  {
    badge: "AUDIT-READY",
    badgeColor: "#A5B4FC",
    badgeBg: "#6366F11F",
    badgeBorder: "#6366F140",
    title: "Immutable Decision Lineage",
    description:
      "Every decision carries a traceable origin, confidence path, approval record, and execution timestamp. Queryable for legal review or board escalation.",
  },
  {
    badge: "KPI-GATED",
    badgeColor: "#A5B4FC",
    badgeBg: "#6366F11F",
    badgeBorder: "#6366F140",
    title: "Pilot-First Deployment",
    description:
      "Phased from Insight to Assisted to Autonomous. Every phase expansion is KPI-gated. No organization adopts full autonomy without documented evidence.",
  },
];

export default function AboutTrust() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#050A17] py-20 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header — 2 col */}
        <div
          className={`grid lg:grid-cols-2 gap-10 items-start mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-2 border border-[#6366F140] bg-[#6366F11F] rounded-full px-3 py-1 mb-5">
              <span className="text-[#A5B4FC] text-xs">✦</span>
              <span className="text-[#A5B4FC] text-xs font-semibold tracking-widest uppercase">
                Security & Trust
              </span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Built to survive<br />procurement scrutiny
            </h2>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            Security, compliance, and auditability are architectural properties of
            ZoikoVertex — not optional add-ons reviewed after purchase. This is
            compliance embedded in execution.
          </p>
        </div>

        {/* 4 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_CARDS.map((card, i) => (
            <div
              key={card.title}
              className={`border border-[#1E2F55] rounded-2xl p-5 bg-[#0E1B35] flex flex-col gap-4
                hover:border-white/15 hover:bg-[#0d0d1f] hover:-translate-y-1
                transition-all duration-300 ease-out cursor-default
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Badge */}
              <span
                className="self-start text-xs font-medium px-2.5 py-1 rounded-md border tracking-widest font-mono"
                style={{
                  color: card.badgeColor,
                  background: card.badgeBg,
                  borderColor: card.badgeBorder,
                }}
              >
                {card.badge}
              </span>

              {/* Title */}
              <h3 className="text-white text-sm font-black leading-snug">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-white/35 text-xs leading-relaxed flex-1">
                {card.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}