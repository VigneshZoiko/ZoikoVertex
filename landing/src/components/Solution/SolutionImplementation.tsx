"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    number: 1,
    category: "DISCOVERY",
    title: "Solution Fit & Scope",
    description:
      "Map team structure, brands, channels, approval paths, governance needs, and plan fit. Identify configuration requirements before implementation begins.",
    tag: "Clear scope before demo or implementation",
    tagColor: "#22d3ee",
    tagBg: "rgba(34,211,238,0.06)",
    tagBorder: "rgba(34,211,238,0.2)",
    numberColor: "#22d3ee",
  },
  {
    number: 2,
    category: "CONFIGURATION",
    title: "Workspace & Role Setup",
    description:
      "Set roles, brands, permissions, approval flows, content classes, and channel connections. The control model is visible before production use begins.",
    tag: "Control model visible before production use",
    tagColor: "#4ade80",
    tagBg: "rgba(74,222,128,0.06)",
    tagBorder: "rgba(74,222,128,0.2)",
    numberColor: "#4ade80",
  },
  {
    number: 3,
    category: "ENABLEMENT",
    title: "Agent & Governance Activation",
    description:
      "Enable agents by function and autonomy level. Define human gates, escalation rules, brand policy checks, and evidence configuration before any live use.",
    tag: "No uncontrolled AI deployment",
    tagColor: "#a78bfa",
    tagBg: "rgba(167,139,250,0.06)",
    tagBorder: "rgba(167,139,250,0.2)",
    numberColor: "#a78bfa",
  },
  {
    number: 4,
    category: "PILOT",
    title: "Controlled Pilot Workflow",
    description:
      "Run a controlled pilot with campaign or content workflow, approval evidence capture, and performance reporting. Value is proven before any broader rollout.",
    tag: "Value proven before broader rollout",
    tagColor: "#facc15",
    tagBg: "rgba(250,204,21,0.06)",
    tagBorder: "rgba(250,204,21,0.2)",
    numberColor: "#facc15",
  },
  {
    number: 5,
    category: "SCALE",
    title: "Expand & Govern Continuously",
    description:
      "Expand across brands, agencies, regions, or regulated workflows. Periodic governance reviews ensure the platform evolves with your operating requirements.",
    tag: "Continuous oversight and improvement",
    tagColor: "#38bdf8",
    tagBg: "rgba(56,189,248,0.06)",
    tagBorder: "rgba(56,189,248,0.2)",
    numberColor: "#38bdf8",
  },
];

const STATS = [
  { value: "100%", label: "APPROVAL-GATED PUBLISHING", color: "#22d3ee" },
  { value: "19+",  label: "DEFAULT ROLE TEMPLATES",    color: "#4ade80" },
  { value: "5",    label: "GOVERNED AI AGENTS",        color: "#facc15" },
  { value: "∞",   label: "IMMUTABLE AUDIT EVENTS",    color: "#22d3ee" },
];

const TRUST_ITEMS = [
  { text: "Built for security, privacy, and procurement review", color: "#22d3ee",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { text: "Documentation available via the Trust Center", color: "#a78bfa",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
  { text: "GDPR-aligned controls · Data residency options", color: "#4ade80",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
  { text: "Named AE + implementation support on Vertex Corporate", color: "#facc15",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { text: "Phased onboarding — no big-bang deployment", color: "#38bdf8",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
];

export default function SolutionImplementation() {
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
    <section className="bg-[#080812] py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            IMPLEMENTATION PATH
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            A controlled path to full governed execution.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            ZoikoVertex is designed to be adopted in stages. Legal, compliance, security, and brand
            teams have full visibility before any production use begins.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* Left — Steps */}
          <div className="flex flex-col">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className={`flex gap-4 transition-all duration-500 ease-out ${
                  visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                }`}
                style={{ transitionDelay: `${150 + i * 120}ms` }}
              >
                {/* Number + vertical line */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0"
                    style={{
                      color: step.numberColor,
                      borderColor: `${step.numberColor}40`,
                      background: `${step.numberColor}10`,
                    }}
                  >
                    {step.number}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-px flex-1 my-2"
                      style={{ background: `${step.numberColor}20` }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-8 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
                  <p
                    className="text-xs font-black tracking-widest uppercase mb-1"
                    style={{ color: step.tagColor }}
                  >
                    {step.category}
                  </p>
                  <h3 className="text-white text-base font-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-white/40 text-xs leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <span
                    className="inline-block text-xs px-3 py-1 rounded-md border font-mono"
                    style={{
                      color: step.tagColor,
                      background: step.tagBg,
                      borderColor: step.tagBorder,
                    }}
                  >
                    {step.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right — Confidence Card */}
          <div
            className={`border border-white/10 rounded-2xl p-6 bg-[#0a0a18] sticky top-24 transition-all duration-700 ease-out ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-sm font-black">
                Platform Confidence Indicators
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">Live</span>
              </div>
            </div>

            {/* Stats 2x2 — each with own color */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="border border-white/10 rounded-xl p-4 bg-[#080812] hover:border-white/20 transition-colors duration-300"
                >
                  <p
                    className="text-2xl font-black mb-1"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-white/30 text-xs font-bold tracking-widest uppercase leading-tight">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 mb-5" />

            {/* Trust items — each with own icon color */}
            <div className="flex flex-col gap-3">
              {TRUST_ITEMS.map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </span>
                  <p className="text-white/40 text-xs leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}