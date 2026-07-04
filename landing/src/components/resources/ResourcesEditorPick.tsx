"use client";
import { useEffect, useRef, useState } from "react";

const TOP_CARDS = [
  {
    badge: "EXECUTIVE BRIEF",
    badgeColor: "#6366F1",
    badgeBg: "#6366F11A",
    badgeBorder: "#6366F140",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    title: "Governed AI Marketing Execution",
    description:
      "The strategic framework for CMOs and CFOs who need AI execution to be auditable, capital-efficient, and board-reportable.",
    tags: ["CMO", "CFO", "Governance"],
    tagColor: "#6366F1",
    tagBg: "#6366F114",
    tagBorder: "#6366F140",
    meta: "8 MIN READ · GATED",
    cta: "Read Brief →",
    ctaColor: "#6366f1",
  },
  {
    badge: "TOOLKIT",
    badgeColor: "#C9A84C",
    badgeBg: "#C9A84C1A",
    badgeBorder: "#C9A84C4D",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
    title: "AI Marketing Governance Checklist",
    description:
      "43-item governance review covering approvals, audit architecture, brand control, and AI agent authority configuration.",
    tags: ["Legal", "Compliance", "Operations"],
    tagColor: "#C9A84C",
    tagBg: "#C9A84C14",
    tagBorder: "#C9A84C4D",
    meta: "PDF · UNGATED",
    cta: "Download Toolkit ↓",
    ctaColor: "#f59e0b",
  },
  {
    badge: "GUIDE",
    badgeColor: "#20E7F2",
    badgeBg: "#20E7F21A",
    badgeBorder: "#20E7F240",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    ),
    title: "Human-in-the-Loop Approval Models",
    description:
      "How to configure authority thresholds, multi-stage approvals, and override controls for governed AI agents in enterprise campaigns.",
    tags: ["Marketing Ops", "AI Autonomy"],
    tagColor: "#20E7F2",
    tagBg: "#20E7F214",
    tagBorder: "#20E7F240",
    meta: "12 MIN READ · FREE",
    cta: "Read Guide →",
    ctaColor: "#06b6d4",
  },
];

export default function ResourcesEditorPick() {
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
    <section id="resources" className="bg-[#F8FAFC] py-24 px-6" style={{ scrollMarginTop: 80 }}>
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#6366F1] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#6366F1] inline-block" />
            EDITORS SELECTION
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-4">
            Start With Our Highest-Impact Resources
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">
            Curated for executives, compliance leaders, and marketing
            operations teams evaluating governed AI at scale.
          </p>
        </div>

        {/* Top 3 cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {TOP_CARDS.map((card, i) => (
            <div
              key={card.title}
              className={`bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col gap-4
                hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default group
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Badge + Icon row */}
              <div className="flex items-center font-medium justify-between">
                <span
                  className="text-xs font-black px-2.5 py-1 rounded border tracking-widest"
                  style={{
                    color: card.badgeColor,
                    background: card.badgeBg,
                    borderColor: card.badgeBorder,
                  }}
                >
                  {card.badge}
                </span>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: card.badgeBg }}
                >
                  {card.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-gray-900 text-lg font-black leading-snug">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-gray-500 text-sm leading-relaxed flex-1">
                {card.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-[50px] border font-medium"
                    style={{
                      color: card.tagColor,
                      background: card.tagBg,
                      borderColor: card.tagBorder, // ✅ was missing tagBorder in original
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                <span className="text-gray-400 text-xs font-medium">
                  {card.meta}
                </span>
                <button
                  className="text-xs font-bold transition-opacity duration-300 hover:opacity-70"
                  style={{ color: card.ctaColor }}
                >
                  {card.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom wide card — Field Note */}
        <div
          className={`bg-white border border-gray-200 rounded-2xl p-7 transition-all duration-700 ease-out
            hover:shadow-lg hover:-translate-y-0.5 cursor-default
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ transitionDelay: "500ms" }}
        >
          <div className="grid md:grid-cols-2 gap-6 items-center">

            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-black px-2.5 py-1 rounded border tracking-widest text-[#64748B] bg-[#64748B1A] border-[#64748B33]">
                  FIELD NOTE
                </span>
                <span className="text-[#94A3B8] text-xs font-medium tracking-wide">
                  ENTERPRISE CASE STUDY · 4 MIN READ
                </span>
              </div>
              <h3 className="text-gray-900 text-2xl font-black leading-snug mb-3">
                From Content Chaos to Governed Execution
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                How one enterprise marketing team eliminated 73% of manual compliance overhead,
                reduced time-to-publish by 4× and achieved board-reportable ROI attribution
                within 60 days of deploying ZoikoVertex.
              </p>
            </div>

            {/* Right */}
            <div className="flex flex-col items-end gap-4">
              <div className="flex flex-wrap gap-2 justify-end">
                {["Enterprise Retail", "CMO", "Ops"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-md border font-medium text-[#64748B] bg-[#64748B14] border-[#64748B33]"
                    // ✅ Fixed: added border-[#64748B33] — was missing, causing invisible border
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button className="flex items-center gap-2 border bg-[#F1F5F9] border-[#E2E8F0] text-[#070D1F] hover:bg-gray-50 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors duration-300">
                Read Field Note →
              </button>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}