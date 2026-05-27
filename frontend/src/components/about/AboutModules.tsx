"use client";
import { useEffect, useRef, useState } from "react";

const MODULES = [
  {
    title: "Content & Channel Execution",
    description:
      "Single authoritative execution layer across all digital channels. Every output passes through policy before deployment.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Campaign Management",
    description:
      "Governed campaign lifecycle with inventory, margin, and business context integrated directly into campaign logic.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Governance Engine",
    description:
      "Policy, approval, risk, and kill controls embedded at the infrastructure level. Non-bypassable by design.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    highlighted: true,
  },
  {
    title: "Revenue Intelligence",
    description:
      "Closed-loop attribution, leakage detection, and margin impact tracking from touchpoint to cash event.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Audience & CRM Intelligence",
    description:
      "Commercial audience signals feeding execution decisions and budget allocation logic in real time.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Decision Engine",
    description:
      "Every action scored and classified before it moves. Confidence scoring determines autonomous vs. human-reviewed execution.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Integration Layer",
    description:
      "Governed interoperability with your entire existing stack — social, CRM, ads, data warehouse, and beyond.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    highlighted: false,
  },
  {
    title: "Executive Command Center",
    description:
      "Profit impact, budget reallocations, governance alerts, and margin-aware opportunities in one governed operating view.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    highlighted: false,
  },
];

export default function AboutModules() {
  const [visible, setVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
    <section className="bg-[#0C1529] py-20 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header — 2 col */}
        <div
          className={`grid lg:grid-cols-2 gap-10 items-start mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-2 border border-[#00C8F038] bg-[#00C8F01F] rounded-full px-3 py-1 mb-5">
              <span className="text-[#00C8F0] text-xs">✦</span>
              <span className="text-[#00C8F0] text-xs font-semibold tracking-widest uppercase">
                Platform Modules
              </span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Explore the Eight<br />intelligence layers
            </h2>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            ZoikoVertex is structured as six governed layers — each with a defined
            structural role in the execution chain. Together they form the world's first
            Governed Execution Infrastructure platform.
          </p>
        </div>

        {/* 4x2 Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MODULES.map((mod, i) => {
            const isActive = mod.highlighted || hoveredIndex === i;
            return (
              <div
                key={mod.title}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`relative flex flex-col justify-between rounded-2xl p-5 cursor-default
                  transition-all duration-300 ease-out
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{
                  background: isActive ? "#0E1B35" : "#0E1B35",
                  border: isActive
                    ? "1px solid #1E2F55"
                    : "1px solid #1E2F55",
                  transitionDelay: `${150 + i * 60}ms`,
                  transform: visible
                    ? hoveredIndex === i ? "translateY(-4px)" : "translateY(0)"
                    : "translateY(32px)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                  style={{
                    background: isActive ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(34,211,238,0.2)" : "1px solid rgba(255,255,255,0.08)",
                    color: isActive ? "#22d3ee" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {mod.icon}
                </div>

                {/* Title */}
                <h3
                  className="text-sm font-black leading-snug mb-2 transition-colors duration-300"
                  style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                >
                  {mod.title}
                </h3>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed flex-1 mb-5 transition-colors duration-300"
                  style={{ color: isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)" }}
                >
                  {mod.description}
                </p>

                {/* Arrow */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isActive ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(34,211,238,0.25)" : "1px solid rgba(255,255,255,0.08)",
                    color: isActive ? "#22d3ee" : "rgba(255,255,255,0.25)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}