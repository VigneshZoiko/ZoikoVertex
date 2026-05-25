"use client";
import { useEffect, useRef, useState } from "react";

const GOVERNANCE = [
  {
    number: "01",
    badge: "Basic AI Control",
    title: "Visibility & Diagnostics",
    description:
      "Teams testing governed AI that need visibility, lightweight approvals, and a readiness diagnostic view before committing to full production workflows.",
    borderColor: "#20E7F2",
    badgeColor: "#22d3ee",
    badgeBg: "#20E7F20F",
    badgeBorder: "#20E7F22E",
  },
  {
    number: "02",
    badge: "Operational Governance",
    title: "Active Campaign & Content Governance",
    description:
      "Teams needing standard agents, approval routing, campaign workflow, brand controls, and performance reporting for a single brand workspace.",
    borderColor: "#22C55E",
    badgeColor: "#22C55E",
    badgeBg: "#22C55E1A",
    badgeBorder: "#22C55E33",
  },
  {
    number: "03",
    badge: "Multi-Brand Governance",
    title: "Cross-Brand & Multi-Region Operations",
    description:
      "Organizations with multiple brands, departments, regions, agencies, or approval chains needing advanced routing and coordinated brand governance.",
    borderColor: "#F59E0B",
    badgeColor: "#F59E0B",
    badgeBg: "#F59E0B1A",
    badgeBorder: "#F59E0B33",
  },
  {
    number: "04",
    badge: "Regulated Governance",
    title: "High-Assurance & Regulated Operations",
    description:
      "Organizations requiring advanced oversight, legal hold, sector packs, SSO, data controls, custom onboarding, and procurement-grade documentation.",
    borderColor: "#8B5CF6",
    badgeColor: "#8B5CF6",
    badgeBg: "#8B5CF61A",
    badgeBorder: "#8B5CF633",
  },
];

export default function SolutionGovernance() {
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
    <section className="bg-[#080812] py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            GOVERNANCE BY NEED
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Governance is not one-size-fits-all.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            Identify the right governance depth for your team&apos;s complexity, risk level, and
            operational scale — without enterprise vs. business ambiguity.
          </p>
        </div>

        {/* 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-white/10 rounded-2xl overflow-hidden">
          {GOVERNANCE.map((item, i) => (
            <div
              key={item.number}
              className={`relative flex flex-col gap-5 p-7 bg-transparent
                transition-all duration-500 ease-out group cursor-default
                hover:bg-white/[0.02]
                ${i < 3 ? "border-r border-white/10" : ""}
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 120}ms` }}
            >
              {/* Colored top border line */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] transition-opacity duration-300"
                style={{ background: item.borderColor }}
              />

              {/* Large number */}
              <span
                className="text-6xl font-black leading-none select-none transition-colors duration-300"
                style={{ color: "rgba(255,255,255,0.07)" }}
              >
                {item.number}
              </span>

              {/* Badge */}
              <span
                className="self-start text-xs font-bold px-3 py-1 rounded-full border font-mono tracking-wide"
                style={{
                  color: item.badgeColor,
                  background: item.badgeBg,
                  borderColor: item.badgeBorder,
                }}
              >
                {item.badge}
              </span>

              {/* Title */}
              <h3 className="text-white text-base font-black leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-white/35 text-xs leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}