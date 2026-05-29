"use client";

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Icons ─────────────────────────────────────────────────────────────────
const VoiceIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const VisualIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ApprovedIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ProhibitedIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
  </svg>
);
const DisclaimerIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const ProductIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
  </svg>
);
const RoleIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

// Workflow icons
const PenIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M12 20h9" strokeLinecap="round" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const BookIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);
const QueueIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ValidationIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────
const features = [
  { icon: <VoiceIcon />, title: "Voice Guidelines", desc: "Approved tone, language rules, and messaging frameworks applied as checks before review." },
  { icon: <VisualIcon />, title: "Visual Rules", desc: "Brand visual standards, asset usage rules, and forbidden format combinations." },
  { icon: <ApprovedIcon />, title: "Approved Claims", desc: "Pre-approved statements and performance claims available to content creators." },
  { icon: <ProhibitedIcon />, title: "Prohibited Phrases", desc: "Banned language, competitor references, and unsubstantiated superlatives." },
  { icon: <DisclaimerIcon />, title: "Disclaimers & Regional Rules", desc: "Required disclosures and jurisdiction-specific advertising rules." },
  { icon: <ProductIcon />, title: "Product Claims & Sources", desc: "Substantiated product statements and supporting evidence tracked by policy version." },
  { icon: <RoleIcon />, title: "Role Ownership", desc: "Brand Steward maintains rules. Reviewer applies. Validator checks. Approver authorizes." },
  { icon: <GlobeIcon />, title: "Multi-Region Support", desc: "Regional variants with jurisdiction-specific rules and localized requirements. Scale plan and above." },
];

const workflow = [
  { icon: <PenIcon />, label: "Draft created", sub: "Creator", highlight: false },
  { icon: <BookIcon />, label: "Brand Library check", sub: "Policy automated", highlight: true },
  { icon: <QueueIcon />, label: "Review Queue", sub: "Reviewer", highlight: false },
  { icon: <ValidationIcon />, label: "Validation Desk", sub: "Validator", highlight: false },
  { icon: <CheckCircleIcon />, label: "Approved", sub: "Approver", highlight: true },
];

export default function BrandLibrarySection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: gridRef, inView: gridInView } = useInView(0.1);
  const { ref: flowRef, inView: flowInView } = useInView(0.2);

  return (
    <section className="bg-[#0C1422] w-full px-6 py-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div
          ref={headRef}
          className="mb-14"
          style={{
            opacity: headInView ? 1 : 0,
            transform: headInView ? "translateY(0px)" : "translateY(48px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="w-5 h-[1.5px] bg-[#C9A84C] inline-block" />
            <span className="text-[#C9A84C] text-[11px] font-semibold tracking-[0.2em] uppercase">
              Brand Library &amp; Policy Layer
            </span>
          </div>
          <h2 className="text-white font-black text-[40px] md:text-[3rem] leading-[1.1] tracking-tight mb-5 max-w-1xl">
            Your brand standards become operational controls.
          </h2>
          <p className="text-[#8b9cb3] text-[15px] leading-relaxed max-w-[520px]">
            Brand Library rules are not a PDF to be ignored — they are enforced policy checks applied
            to every content draft before it enters the Review Queue.
          </p>
        </div>

        {/* ── Feature Grid — divider lines only, NO card borders ── */}
        <div ref={gridRef} className="mb-14">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {features.map((f, i) => {
              const isLastRow = i >= 4;
              const isLastCol = (i + 1) % 4 === 0;
              return (
                <div
                  key={f.title}
                  className={`flex flex-col gap-4 p-6 group cursor-default
                    ${!isLastCol ? "border-r border-[#ffffff0d]" : ""}
                    ${!isLastRow ? "border-b border-[#ffffff0d]" : ""}
                  `}
                  style={{
                    opacity: gridInView ? 1 : 0,
                    transform: gridInView ? "translateY(0px)" : "translateY(40px)",
                    transition: `opacity 0.55s ease ${i * 0.07}s, transform 0.55s ease ${i * 0.07}s`,
                  }}
                >
                  {/* Icon box — border only, no bg */}
                  <div className="border border-[#ffffff18] rounded-xl w-[52px] h-[52px] flex items-center justify-center
                    transition-all duration-300 group-hover:border-[#C9A84C55] group-hover:-translate-y-0.5">
                    {f.icon}
                  </div>
                  <h3 className="text-white font-bold text-[14px] leading-snug group-hover:text-[#F5E6C0] transition-colors duration-200">
                    {f.title}
                  </h3>
                  <p className="text-[#7a8fa8] text-[13px] leading-relaxed group-hover:text-[#9aafc4] transition-colors duration-200">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Workflow Strip ── */}
        <div
          ref={flowRef}
          className="grid grid-cols-5"
          style={{
            opacity: flowInView ? 1 : 0,
            transform: flowInView ? "translateY(0px)" : "translateY(40px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {workflow.map((step, i) => (
            <div
              key={step.label}
              className={`flex flex-col items-center justify-center gap-3 px-4 py-7 cursor-default group
                transition-all duration-300
                ${step.highlight
                  ? "bg-[#C9A84C0F] border border-[#ffffff18] "
                  : "hover:bg-[#ffffff04] "
                }
              `}
              style={{
                opacity: flowInView ? 1 : 0,
                transform: flowInView ? "translateY(0px)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${0.15 + i * 0.08}s, transform 0.5s ease ${0.15 + i * 0.08}s`,
              }}
            >
              {/* Icon box */}
              <div className={`rounded-xl w-[184px] h-[64px] flex items-center justify-center
                transition-all duration-300 group-hover:-translate-y-0.5
                ${step.highlight
                  ? "border border-[#C9A84C44] bg-[#0C1422]"
                  : "border border-[#ffffff14]"
                }
              `}>
                {step.icon}
              </div>
              <div className="text-center">
                <p className={`text-[13px] font-semibold ${step.highlight ? "text-white" : "text-[#94A3B8]"}`}>
                  {step.label}
                </p>
                <p className="text-[#4B5563] text-[11px] mt-0.5">{step.sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}