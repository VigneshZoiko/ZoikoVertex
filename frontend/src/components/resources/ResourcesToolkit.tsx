"use client";
import { useEffect, useRef, useState } from "react";

const TOOLKITS = [
  {
    badge: "UNGATED",
    badgeColor: "#22C55E",
    badgeBg: "#22C55E1A",
    badgeBorder: "#22C55E33",
    title: "AI Marketing Governance Checklist",
    description:
      "43-item pre-deployment checklist covering approval workflows, AI autonomy thresholds, audit trail requirements, and brand control validation.",
    cta: "Download Toolkit",
    ctaIcon: "download",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  },
  {
    badge: "LIGHT GATE",
    badgeColor: "#F59E0B",
    badgeBg: "#F59E0B1A",
    badgeBorder: "#F59E0B33",
    title: "Compliance Review Toolkit for Legal Teams",
    description:
      "Legal review framework including hallucination risk assessment, jurisdictional ad compliance checklist, brand claim validation workflow, and pre-publication approval guide.",
    cta: "Download Toolkit",
    ctaIcon: "download",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
      </svg>
    ),
  },
  {
    badge: "UNGATED",
    badgeColor: "#22C55E",
    badgeBg: "#22C55E1A",
    badgeBorder: "#22C55E33",
    title: "ROI Attribution Measurement Toolkit",
    description:
      "Board-ready ROI reporting templates, multi-touch attribution methodology guide, contribution margin tracking spreadsheet, and CFO brief template.",
    cta: "Download Toolkit",
    ctaIcon: "download",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    badge: "SALES-ASSISTED",
    badgeColor: "#EF4444",
    badgeBg: "#EF44441A",
    badgeBorder: "#EF444433",
    title: "Enterprise Procurement Review Toolkit",
    description:
      "Full vendor assessment pack for IT procurement: security questionnaire, DPA, SLA template, insurance summary, and executive sign-off brief.",
    cta: "Request Toolkit",
    ctaIcon: "mail",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <path d="M8 12h8M8 8h8M8 16h5"/>
      </svg>
    ),
  },
  {
    badge: "LIGHT GATE",
    badgeColor: "#F59E0B",
    badgeBg: "#F59E0B1A",
    badgeBorder: "#F59E0B33",
    title: "AI Agent Deployment Readiness Kit",
    description:
      "Pre-launch verification checklist, channel permission matrix, brand voice configuration guide, and post-launch governance monitoring protocol.",
    cta: "Download Toolkit",
    ctaIcon: "download",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
  {
    badge: "UNGATED",
    badgeColor: "#22C55E",
    badgeBg: "#22C55E1A",
    badgeBorder: "#22C55E33",
    title: "Multi-Brand Governance Architecture Template",
    description:
      "Editable governance architecture diagram, brand isolation policy template, cross-brand approval matrix, and portfolio reporting framework.",
    cta: "Download Toolkit",
    ctaIcon: "download",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <rect x="2" y="7" width="6" height="6" rx="1"/>
        <rect x="9" y="2" width="6" height="6" rx="1"/>
        <rect x="16" y="7" width="6" height="6" rx="1"/>
        <rect x="9" y="16" width="6" height="6" rx="1"/>
        <line x1="5" y1="13" x2="12" y2="16"/>
        <line x1="19" y1="13" x2="12" y2="16"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
      </svg>
    ),
  },
];

function CtaIcon({ type }: { type: string }) {
  if (type === "mail") return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

export default function ResourcesToolkit() {
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
    <section className="bg-[#070D1F] py-24 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#C9A84C] inline-block" />
            HIGH-UTILITY ASSETS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            High-Utility Toolkits That Create Demand
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            Ready-to-deploy assets for every stage of the evaluation and
            implementation journey.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {TOOLKITS.map((card, i) => (
            <div
              key={card.title}
              className={`border border-[#C9A84C2E] rounded-2xl p-6 bg-[#C9A84C0A] flex flex-col
                hover:border-white/20 hover:bg-[#0d0d20] transition-all duration-400 ease-out cursor-default group
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 80}ms` }}
            >
              {/* Icon + Badge row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 font-medium h-11 rounded-[50px] bg-[#C9A84C1A] border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-[50px] border tracking-widest"
                  style={{
                    color: card.badgeColor,
                    background: card.badgeBg,
                    borderColor: card.badgeBorder,
                  }}
                >
                  {card.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-white text-base font-black leading-snug mb-3">
                {card.title}
              </h3>

              {/* Description — flex-1 pushes button to bottom */}
              <p className="text-white/40 text-xs leading-relaxed flex-1 mb-6">
                {card.description}
              </p>

              {/* CTA Button — always at bottom */}
              <button className="w-full flex items-center justify-center gap-2 border border-[#C9A84C66] text-[#C9A84C] hover:text-white hover:border-white/30 text-xs font-semibold py-2.5 rounded-xl transition-all duration-300 hover:bg-white/5">
                <CtaIcon type={card.ctaIcon} />
                {card.cta}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}