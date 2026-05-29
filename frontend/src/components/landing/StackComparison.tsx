"use client";
import { useEffect, useRef, useState } from "react";

const ROWS = [
  { capability: "Autonomous capital allocation", zoiko: "check", traditional: "cross" },
  { capability: "Inventory & margin integration", zoiko: "check", traditional: "cross" },
  { capability: "Multi-touch ROI attribution", zoiko: "check", traditional: "partial" },
  { capability: "Pre-publication compliance review", zoiko: "check", traditional: "cross" },
  { capability: "Governed autonomy with audit logs", zoiko: "check", traditional: "cross" },
  { capability: "Executive profit-impact dashboard", zoiko: "check", traditional: "cross" },
  { capability: "Synthetic audience simulation", zoiko: "check", traditional: "cross" },
  { capability: "Business context integration (ERP/inventory)", zoiko: "check", traditional: "cross" },
  { capability: "Phased autonomy rollout model", zoiko: "check", traditional: "cross" },
  { capability: "Contribution margin reporting", zoiko: "check", traditional: "cross" },
];

function ZoikoCheck() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(34,211,238,0.12)",
          border: "1.5px solid rgba(34,211,238,0.4)",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  );
}

function TraditionalCross() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid rgba(255,255,255,0.12)",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    </div>
  );
}

function PartialBadge() {
  return (
    <div className="flex items-center justify-center">
      <span
        className="text-xs font-bold px-3 py-1 rounded-full"
        style={{
          color: "#f59e0b",
          background: "rgba(245,158,11,0.15)",
          border: "1px solid rgba(245,158,11,0.35)",
        }}
      >
        Partial
      </span>
    </div>
  );
}

export default function StackComparison() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#03050F] py-20 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-5 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-cyan-400 inline-block" />
            COMPETITIVE ADVANTAGE
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Why current stacks fall short
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
            Tools execute tasks. ZoikoVertex manages outcomes. The
            difference is measurable in capital efficiency and executive
            confidence.
          </p>
        </div>

        {/* Table */}
        <div
          className={`border border-white/10 rounded-2xl overflow-hidden transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >

          {/* Header row */}
          <div className="grid grid-cols-3" style={{ background: "rgba(255,255,255,0.03)" }}>

            {/* Capability header */}
            <div className="px-5 py-4">
              <span className="text-white/25 text-xs font-bold tracking-widest uppercase">
                CAPABILITY
              </span>
            </div>

            {/* ZoikoVertex header — cyan bg, ALL 4 borders */}
            <div
              className="px-4 py-4 flex items-center justify-center"
              style={{
                background: "rgba(34,211,238,0.1)",
                borderLeft: "1px solid rgba(34,211,238,0.3)",
                borderRight: "1px solid rgba(34,211,238,0.3)",
                borderTop: "1px solid rgba(34,211,238,0.3)",
                borderBottom: "1px solid rgba(34,211,238,0.3)",
              }}
            >
              <span
                className="text-xs font-black tracking-widest uppercase"
                style={{ color: "#22d3ee" }}
              >
                ZOIKOVERTEX
              </span>
            </div>

            {/* Traditional header */}
            <div className="px-4 py-4 flex items-center justify-center">
              <span className="text-white/25 text-xs font-bold tracking-widest uppercase text-center">
                TRADITIONAL PLATFORMS
              </span>
            </div>
          </div>

          {/* Data rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.capability}
              className={`grid grid-cols-3 border-t border-white/5
                hover:bg-white/[0.015] transition-colors duration-200
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${250 + i * 50}ms` }}
            >
              {/* Capability */}
              <div className="px-5 py-4 flex items-center">
                <span className="text-white/55 text-sm">
                  {row.capability}
                </span>
              </div>

              {/* ZoikoVertex cell — left + right border continues */}
              <div
                className="py-4 flex items-center justify-center"
                style={{
                  background: "rgba(34,211,238,0.03)",
                  borderLeft: "1px solid rgba(34,211,238,0.2)",
                  borderRight: "1px solid rgba(34,211,238,0.2)",
                }}
              >
                <ZoikoCheck />
              </div>

              {/* Traditional */}
              <div className="py-4 flex items-center justify-center">
                {row.traditional === "cross" && <TraditionalCross />}
                {row.traditional === "partial" && <PartialBadge />}
              </div>
            </div>
          ))}

          {/* Bottom border closure for center column */}
          <div className="grid grid-cols-3">
            <div className="py-1" />
            <div
              className="py-1"
              style={{
                borderLeft: "1px solid rgba(34,211,238,0.2)",
                borderRight: "1px solid rgba(34,211,238,0.2)",
                borderBottom: "1px solid rgba(34,211,238,0.2)",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }}
            />
            <div className="py-1" />
          </div>

        </div>
      </div>
    </section>
  );
}