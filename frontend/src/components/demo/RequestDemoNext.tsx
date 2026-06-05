"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    number: "01",
    title: "Request routed",
    meta: "Immediate · by size & role",
    highlighted: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
  {
    number: "02",
    title: "AE assigned",
    meta: "≤ 4 business hours (enterprise)",
    highlighted: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF80" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Demo or briefing",
    meta: "45–90 min governed walkthrough",
    highlighted: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF80" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    number: "04",
    title: "Pilot or trial",
    meta: "Free Starter · 14-day Growth trial",
    highlighted: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF80" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
];

const PATHS = [
  {
    category: "ENTERPRISE & MID-MARKET",
    categoryColor: "#20E7F2",
    title: "Talk to Sales",
    description:
      "Named AE, governance briefing, procurement readiness, and implementation scoping — for enterprise, regulated, and multi-brand organizations.",
    showCta: true,
    cta: "Talk to Sales",
  },
  {
    category: "COMPLIANCE, LEGAL & SECURITY",
    categoryColor: "#FFFFFF3D",
    title: "Request Gov Briefing",
    description:
      "60-minute focused briefing on policy architecture, audit trail, evidence packaging, AI governance controls, and procurement documentation.",
    showCta: false,
    cta: null,
  },
  {
    category: "SMB, AGENCIES & EARLY-STAGE",
    categoryColor: "#FFFFFF3D",
    title: "Start Guided Evaluation",
    description:
      "Understand your governance gaps, see practical workflows, and decide whether Growth or Scale fits — before speaking with Sales. No credit card required.",
    showCta: false,
    cta: null,
  },
];

export default function RequestDemoNext() {
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
    <section className="bg-[#080E1A] py-20 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Section label */}
        <div
          className={`flex items-center gap-4 mb-8 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="flex-1 h-px bg-[#FFFFFF3D]" />
          <p className="text-[#FFFFFF3D] text-xs font-medium tracking-widest uppercase whitespace-nowrap">
            WHAT HAPPENS AFTER YOU SUBMIT
          </p>
          <div className="flex-1 h-px bg-[#FFFFFF3D]" />
        </div>

        {/* 4 Steps — NO gap, shared borders */}
        <div
          className={`grid grid-cols-4 border border-white/10 rounded-2xl overflow-hidden mb-5
            transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`flex flex-col gap-3 p-5 cursor-default transition-colors duration-300
                ${step.highlighted ? "bg-[#20E7F21A]" : "bg-[#0C1422] hover:bg-white/[0.02]"}
                ${i < STEPS.length - 1 ? "border-r border-white/10" : ""}
              `}
            >
              {/* Number */}
              <p className={`text-xs font-bold tracking-widest ${
                step.highlighted ? "text-cyan-400/50" : "text-white/20"
              }`}>
                {step.number}
              </p>

              {/* Icon */}
              <div className={step.highlighted ? "text-cyan-400" : "text-white/25"}>
                {step.icon}
              </div>

              {/* Title */}
              <h3 className={`text-sm font-black leading-snug ${
                step.highlighted ? "text-white" : "text-white/55"
              }`}>
                {step.title}
              </h3>

              {/* Meta */}
              <p className={`text-xs leading-relaxed ${
                step.highlighted ? "text-white/35" : "text-white/20"
              }`}>
                {step.meta}
              </p>
            </div>
          ))}
        </div>

        {/* 3 Path cards — NO gap, shared borders */}
        <div
          className={`grid grid-cols-3 border border-white/10 rounded-2xl overflow-hidden
            transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {PATHS.map((path, i) => (
            <div
              key={path.title}
              className={`flex flex-col gap-4 p-6 bg-[#0a0a18]
                hover:bg-[#0d0d1f] transition-colors duration-300 cursor-default
                ${i < PATHS.length - 1 ? "border-r border-white/10" : ""}`}
            >
              {/* Category */}
              <p
                className="text-xs font-black tracking-widest uppercase"
                style={{ color: path.categoryColor }}
              >
                {path.category}
              </p>

              {/* Title */}
              <h3 className="text-white text-xl font-black leading-snug">
                {path.title}
              </h3>

              {/* Description */}
              <p className="text-white/40 text-xs leading-relaxed flex-1">
                {path.description}
              </p>

              {/* CTA */}
              {path.showCta && (
                <button className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black py-3 rounded-xl transition-colors duration-300 mt-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {path.cta}
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}