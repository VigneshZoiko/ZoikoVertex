"use client";

import { useEffect, useRef, useState } from "react";

// ── Scroll-triggered animation hook ──────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── Icons ─────────────────────────────────────────────────────────────────
const StrategyIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1.2" />
    <rect x="14" y="3" width="7" height="7" rx="1.2" />
    <rect x="3" y="14" width="7" height="7" rx="1.2" />
    <rect x="14" y="14" width="7" height="7" rx="1.2" />
  </svg>
);

const ContentIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const PublishingIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const EngagementIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const RevenueIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────
const agents = [
  {
    icon: <StrategyIcon />,
    title: "Strategy Agent",
    description: "Campaign planning, channel prioritization, and performance recommendations aligned to Brand Library rules.",
    restriction: "Cannot bypass Brand Library or approval gates",
    log: "Logs: recommendation, confidence score, policy version",
  },
  {
    icon: <ContentIcon />,
    title: "Content Agent",
    description: "Content briefs, draft generation, variant creation, and Brand Library compliance checking before content enters the Review Queue.",
    restriction: "Cannot publish without approval chain completion",
    log: "Logs: draft event, brand check result, queue entry",
  },
  {
    icon: <PublishingIcon />,
    title: "Publishing Agent",
    description: "Scheduling, timing optimization, and cross-channel sequencing for approved content only.",
    restriction: "Cannot schedule unapproved content",
    log: "Logs: schedule event, authorization reference, timestamp",
  },
  {
    icon: <EngagementIcon />,
    title: "Engagement Agent",
    description: "Response drafting, routing suggestions, sentiment assessment, and escalation signals for the Inbox queue.",
    restriction: "Cannot respond without authorization on sensitive items",
    log: "Logs: routing decision, sentiment flag, escalation trigger",
  },
  {
    icon: <RevenueIcon />,
    title: "Revenue Attribution",
    description: "Performance attribution, ROI evidence generation, and cross-channel revenue intelligence reporting.",
    restriction: "Cannot alter audit records or fabricate evidence",
    log: "Logs: attribution model, data sources, evidence object",
  },
];

// ── Component ─────────────────────────────────────────────────────────────
export default function AIAgentsSection() {
  const { ref: headerRef, inView: headerInView } = useInView(0.2);
  const { ref: cardsRef, inView: cardsInView } = useInView(0.1);
  const { ref: quoteRef, inView: quoteInView } = useInView(0.3);

  return (
    <section className="bg-[#0C1422] w-full py-4 px-6 overflow-hidden">

      {/* ── Header ── */}
      <div
        ref={headerRef}
        className="flex flex-col items-center text-center mb-14 max-w-5xl mx-auto"
        style={{
          opacity: headerInView ? 1 : 0,
          transform: headerInView ? "translateY(0px)" : "translateY(48px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-8">
          <span className="w-5 h-[1.5px] bg-teal-400 inline-block" />
          <span className="text-teal-400 text-[11px] font-semibold tracking-[0.22em] uppercase">
            AI Agents
          </span>
        </div>
        <h2 className="text-white font-black text-[40px] md:text-[3.2rem] leading-[1.15] max-w-3xl mb-6 tracking-tight">
          AI agents that operate inside your rules — not outside them.
        </h2>
        <p className="text-[#8b9cb3] text-[15px] max-w-[660px] leading-relaxed">
          Every agent has defined capabilities, defined bypass restrictions, and complete action
          logging. Final authority is always role-bound and human-in-the-loop.
        </p>
      </div>

      {/* ── Agent Cards — each card staggered ── */}
      <div
        ref={cardsRef}
        className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 mb-8"
      >
        {agents.map((agent, i) => (
          <div
            key={agent.title}
            className={`flex flex-col gap-4 px-6 py-2 group cursor-default
              ${i !== agents.length - 1 ? "border-r border-[#ffffff12]" : ""}
            `}
            style={{
              opacity: cardsInView ? 1 : 0,
              transform: cardsInView ? "translateY(0px)" : "translateY(56px)",
              transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
            }}
          >
            {/* Icon — lift on hover */}
            <div
              className="border border-[#ffffff18] rounded-xl w-[52px] h-[52px] flex items-center justify-center text-teal-400
                transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:border-[#ffffff30]"
            >
              {agent.icon}
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-[15px] transition-colors duration-200 group-hover:text-teal-300">
              {agent.title}
            </h3>

            {/* Description */}
            <p className="text-[#7a8fa8] text-[13px] leading-relaxed flex-1 transition-colors duration-200 group-hover:text-[#9aafc4]">
              {agent.description}
            </p>

            {/* Tags */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[11.5px] px-3 py-2 rounded-md text-[#F59E0B] bg-[#F59E0B12] leading-snug border border-[#F59E0B2E]
                transition-colors duration-200 group-hover:bg-[#F59E0B1F] group-hover:border-[#F59E0B44]">
                {agent.restriction}
              </span>
              <span className="text-[11.5px] px-3 py-2 rounded-md text-[#22C55E] bg-[#22C55E12] leading-snug border border-[#22C55E2E]
                transition-colors duration-200 group-hover:bg-[#22C55E1F] group-hover:border-[#22C55E44]">
                {agent.log}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quote ── */}
      <div
        ref={quoteRef}
        className="max-w-[1200px] mx-auto border border-[#C9A84C33] rounded-2xl px-8 py-6 bg-[#C9A84C1A]
          transition-all duration-300 ease-out hover:border-[#C9A84C55] hover:bg-[#C9A84C22]"
        style={{
          opacity: quoteInView ? 1 : 0,
          transform: quoteInView ? "translateY(0px)" : "translateY(40px)",
          transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s, background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <p className="text-[#F5E6C0] text-[15px] leading-relaxed font-medium">
          &ldquo;AI can recommend, draft, route, and assist execution. Final authority remains
          role-bound and policy-scoped. No agent action bypasses the governance layer.&rdquo;
        </p>
      </div>

    </section>
  );
}