"use client";

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
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

// ── Crisis Console Icons ──────────────────────────────────────────────────
const AlertTriangle = () => (
  <svg width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
  </svg>
);
const PauseIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);
const TagIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5"/>
  </svg>
);
const HandoffIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="1.8" viewBox="0 0 24 24">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────
const auditEvents = [
  {
    dot: "#22C55E",
    user: "Sarah K.",
    badge: "Approver",
    badgeColor: "text-[#F5E6C0] bg-[#C9A84C1A] border border-[#C9A84C33]",
    action: "Authorized content for publishing — Campaign ID 8821",
    tags: [
      { label: "Policy v2.4", color: "text-[#20E7F2] bg-[#20E7F20F] border border-[#20E7F22E]" },
      { label: "Evidence: AE-0041", color: "text-[#22C55E] bg-[#22C55E12] border border-[#22C55E2E]" },
      { label: "Brand: UK", color: "text-[#94A3B8] bg-[#94A3B812] border border-[#94A3B825]" },
    ],
    time: "09:41 UTC",
  },
  {
    dot: "#F59E0B",
    user: "James P.",
    badge: "Validator",
    badgeColor: "text-[#F5E6C0] bg-[#C9A84C1A] border border-[#C9A84C33]",
    action: "Completed validation — Brand Library check passed, 0 violations",
    tags: [
      { label: "Policy v2.4", color: "text-[#20E7F2] bg-[#20E7F20F] border border-[#20E7F22E]" },
      { label: "AE-0040", color: "text-[#22C55E] bg-[#22C55E12] border border-[#22C55E2E]" },
    ],
    time: "09:38 UTC",
  },
  {
    dot: "#94A3B8",
    user: "Content Agent",
    badge: "Service Account",
    badgeColor: "text-[#F5E6C0] bg-[#C9A84C1A] border border-[#C9A84C33]",
    action: "Generated draft — non-human identity · 3 variants created",
    tags: [
      { label: "Policy v2.4", color: "text-[#20E7F2] bg-[#20E7F20F] border border-[#20E7F22E]" },
      { label: "Workspace: EU-Brand", color: "text-[#94A3B8] bg-[#94A3B812] border border-[#94A3B825]" },
    ],
    time: "09:32 UTC",
  },
  {
    dot: "#22C55E",
    user: "Maya R.",
    badge: "Campaign Mgr",
    badgeColor: "text-[#F5E6C0] bg-[#C9A84C1A] border border-[#C9A84C33]",
    action: "Created campaign brief — submitted to Content Studio",
    tags: [
      { label: "Campaign: Q3-Launch", color: "text-[#60A5FA] bg-[#60A5FA12] border border-[#60A5FA25]" },
      { label: "AE-0038", color: "text-[#22C55E] bg-[#22C55E12] border border-[#22C55E2E]" },
    ],
    time: "09:21 UTC",
  },
];

const crisisActions = [
  { icon: <PauseIcon />, iconBg: "bg-[#F59E0B15] border border-[#F59E0B25]", label: "Pause all publishing across all channels." },
  { icon: <RefreshIcon />, iconBg: "bg-[#60A5FA15] border border-[#60A5FA25]", label: "Activate crisis engagement routing" },
  { icon: <TagIcon />, iconBg: "bg-[#A78BFA15] border border-[#A78BFA25]", label: "Tag and annotate affected content" },
  { icon: <HandoffIcon />, iconBg: "bg-[#34D39915] border border-[#34D39925]", label: "Post-incident review and handoff workflow" },
];

const plans = [
  {
    name: "Starter",
    desc: "Basic activity log only. No evidence export, no production audit trail.",
    tags: [{ label: "Activity log", color: "text-[#FFFFFF80] bg-[#FFFFFF0E] border border-[#FFFFFF1A]" }],
  },
  {
    name: "Growth",
    desc: "Standard immutable audit trail with export controls for one brand workspace.",
    tags: [{ label: "Immutable audit", color: "text-[#20E7F2] bg-[#20E7F20F] border border-[#20E7F238]" }],
  },
  {
    name: "Scale",
    desc: "Advanced evidence packaging, watermarked exports, and policy-version traceability across multiple brands.",
    tags: [
      { label: "Advanced packaging", color: "text-[#20E7F2] bg-[#20E7F20F] border border-[#20E7F238]" },
      { label: "Watermarked", color: "text-[#22C55E] bg-[#22C55E12] border border-[#22C55E38]" },
    ],
  },
  {
    name: "Corporate",
    desc: "Evidence Vault, legal hold, chain-of-custody exports, privileged access logging, and read-event logging for sensitive records.",
    tags: [
      { label: "Evidence Vault", color: "text-[#C9A84C] bg-[#C9A84C0F] border border-[#C9A84C38]" },
      { label: "Legal hold", color: "text-[#C9A84C] bg-[#C9A84C0F] border border-[#C9A84C38]" },
    ],
  },
];

export default function EvidenceCrisisSection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: leftRef, inView: leftInView } = useInView(0.1);
  const { ref: rightRef, inView: rightInView } = useInView(0.1);

  return (
    <section className="bg-[#080E1A] w-full px-6 py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div
          ref={headRef}
          className="flex flex-col items-center text-center mb-16"
          style={{
            opacity: headInView ? 1 : 0,
            transform: headInView ? "translateY(0px)" : "translateY(48px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="w-5 h-[1.5px] bg-[#C9A84C] inline-block" />
            <span className="text-[#C9A84C] text-[11px] font-semibold tracking-[0.2em] uppercase">
              Evidence &amp; Crisis Readiness
            </span>
          </div>
          <h2 className="text-white font-black text-[2.5rem] md:text-[3.2rem] leading-[1.1] tracking-tight mb-5 max-w-2xl">
            Every important action leaves evidence.
          </h2>
          <p className="text-[#8b9cb3] text-[15px] leading-relaxed max-w-[480px]">
            Immutable audit events. Watermarked exports. Legal hold on Corporate plans.
            Crisis Console with controlled break-glass access.
          </p>
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div
            ref={leftRef}
            className="flex flex-col gap-3"
            style={{
              opacity: leftInView ? 1 : 0,
              transform: leftInView ? "translateY(0px)" : "translateY(52px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-[1.5px] bg-[#C9A84C] inline-block" />
              <span className="text-[#C9A84C] text-[10px] font-semibold tracking-[0.2em] uppercase">
                Audit Event Timeline
              </span>
            </div>

            {/* Audit Rows */}
            {auditEvents.map((ev, i) => (
              <div
                key={i}
                className="bg-[#FFFFFF0E] border border-[#FFFFFF1A] rounded-xl px-4 py-3.5 group hover:border-[#ffffff18] hover:bg-[#111d2e] transition-all duration-200"
                style={{
                  opacity: leftInView ? 1 : 0,
                  transform: leftInView ? "translateY(0px)" : "translateY(28px)",
                  transition: `opacity 0.55s ease ${i * 0.09}s, transform 0.55s ease ${i * 0.09}s`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Dot */}
                    <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: ev.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white text-[13px] font-semibold">{ev.user}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${ev.badgeColor}`}>
                          {ev.badge}
                        </span>
                      </div>
                      <p className="text-[#8b9cb3] text-[12px] leading-relaxed mb-2">{ev.action}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.tags.map((tag, t) => (
                          <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${tag.color}`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[#4B5563] text-[10px] shrink-0 mt-0.5 font-mono">{ev.time}</span>
                </div>
              </div>
            ))}

            {/* Crisis Console Card */}
            <div
              className="bg-[#EF44440D] border border-[#EF44442E] rounded-xl p-5 mt-1"
              style={{
                opacity: leftInView ? 1 : 0,
                transform: leftInView ? "translateY(0px)" : "translateY(28px)",
                transition: `opacity 0.55s ease ${auditEvents.length * 0.09}s, transform 0.55s ease ${auditEvents.length * 0.09}s`,
              }}
            >
              {/* Console Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-[#EF444415] border border-[#EF444430] flex items-center justify-center shrink-0">
                  <AlertTriangle />
                </div>
                <div>
                  <p className="text-white font-semibold text-[14px]">Crisis Console</p>
                  <p className="text-[#4B5563] text-[11px]">Controlled break-glass · Dual authorization · Time-boxed</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {crisisActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-3 group cursor-default">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 ${action.iconBg}`}>
                      {action.icon}
                    </div>
                    <p className="text-[#8b9cb3] text-[13px] group-hover:text-[#9aafc4] transition-colors duration-200">
                      {action.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div
            ref={rightRef}
            className="flex flex-col gap-3"
            style={{
              opacity: rightInView ? 1 : 0,
              transform: rightInView ? "translateY(0px)" : "translateY(52px)",
              transition: "opacity 0.7s ease 0.12s, transform 0.7s ease 0.12s",
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-[1.5px] bg-teal-400 inline-block" />
              <span className="text-teal-400 text-[10px] font-semibold tracking-[0.2em] uppercase">
                Evidence by Plan
              </span>
            </div>

            {/* Plan Cards */}
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className="bg-[#0f1824] border border-[#ffffff0d] rounded-xl px-5 py-4 group hover:border-[#ffffff18] hover:bg-[#111d2e] transition-all duration-200 cursor-default"
                style={{
                  opacity: rightInView ? 1 : 0,
                  transform: rightInView ? "translateY(0px)" : "translateY(28px)",
                  transition: `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s`,
                }}
              >
                <p className="text-white font-bold text-[15px] mb-1.5 group-hover:text-teal-300 transition-colors duration-200">
                  {plan.name}
                </p>
                <p className="text-[#8b9cb3] text-[13px] leading-relaxed mb-3">{plan.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {plan.tags.map((tag, t) => (
                    <span key={t} className={`text-[11px] px-3 py-1 rounded-md font-medium ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}