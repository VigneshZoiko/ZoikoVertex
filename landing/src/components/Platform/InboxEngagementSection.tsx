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
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" fill="none" stroke="#F97316" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
  </svg>
);

// Platform icons for inbox items
const FbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#60A5FA">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
  </svg>
);
const LiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#60A5FA">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const IgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="1.8">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="#F472B6" stroke="none" />
  </svg>
);
const TkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#A78BFA">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z" />
  </svg>
);

const routeItems = [
  {
    icon: <CheckIcon />,
    title: "Standard response",
    desc: "Routine items handled within SLA by assigned team members.",
  },
  {
    icon: <EyeIcon />,
    title: "Manager review",
    desc: "Sensitive interactions escalated before any response is sent.",
  },
  {
    icon: <ShieldIcon />,
    title: "Compliance review",
    desc: "High-risk content routed to Compliance Officer before engagement.",
  },
  {
    icon: <AlertIcon />,
    title: "Crisis route",
    desc: "Crisis-flagged items bypass standard routing, enter Crisis Console.",
  },
];

const inboxItems = [
  {
    platform: <FbIcon />,
    handle: "@brandmentions",
    source: "Facebook",
    preview: "Can you confirm your refund policy for...",
    badge: "Standard",
    badgeColor: "text-[#94A3B8] bg-[#1E293B] border border-[#334155]",
    time: "2m",
  },
  {
    platform: <LiIcon />,
    handle: "@exec_comment",
    source: "LinkedIn",
    preview: "Regarding your AI governance claim, I...",
    badge: "Review",
    badgeColor: "text-[#F59E0B] bg-[#F59E0B15] border border-[#F59E0B30]",
    time: "8m",
  },
  {
    platform: <IgIcon />,
    handle: "@user_complaint",
    source: "Instagram",
    preview: "This is completely unacceptable and...",
    badge: "Crisis",
    badgeColor: "text-[#EF4444] bg-[#EF444415] border border-[#EF444430]",
    time: "12m",
  },
  {
    platform: <TkIcon />,
    handle: "@user_question",
    source: "TikTok",
    preview: "Does this work for regulated industries?",
    badge: "Standard",
    badgeColor: "text-[#94A3B8] bg-[#1E293B] border border-[#334155]",
    time: "18m",
  },
];

export default function InboxEngagementSection() {
  const { ref: leftRef, inView: leftInView } = useInView(0.15);
  const { ref: rightRef, inView: rightInView } = useInView(0.15);

  return (
    <section className="bg-[#080E1A] w-full px-6 py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* ── Left ── */}
        <div
          ref={leftRef}
          style={{
            opacity: leftInView ? 1 : 0,
            transform: leftInView ? "translateY(0px)" : "translateY(52px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-5 h-[1.5px] bg-teal-400 inline-block" />
            <span className="text-[#20E7F2] text-[11px] font-semibold tracking-[0.2em] uppercase">Inbox</span>
            <span className="text-[#20E7F2] text-[11px] font-semibold tracking-[0.2em]">/</span>
            <span className="text-[#20E7F2] text-[11px] font-semibold tracking-[0.2em] uppercase">Engagement</span>
          </div>

          {/* Heading */}
          <h2 className="text-white font-black text-[2.4rem] md:text-[2.8rem] leading-[1.1] tracking-tight mb-6">
            One governed inbox for comments, DMs, mentions, and escalations.
          </h2>

          {/* Subtext */}
          <p className="text-[#8b9cb3] text-[15px] leading-relaxed mb-10">
            Faster response, lower brand risk, and cleaner accountability — across every connected channel.
          </p>

          {/* Route Items */}
          <div className="flex flex-col gap-3">
            {routeItems.map((item, i) => (
              <div
                key={item.title}
                className="border border-[#ffffff10] rounded-xl px-5 py-4 flex items-start gap-4
                  hover:border-[#ffffff20] hover:bg-[#ffffff04] transition-all duration-300 cursor-default group"
                style={{
                  opacity: leftInView ? 1 : 0,
                  transform: leftInView ? "translateY(0px)" : "translateY(32px)",
                  transition: `opacity 0.6s ease ${0.1 + i * 0.1}s, transform 0.6s ease ${0.1 + i * 0.1}s`,
                }}
              >
                <div className="mt-0.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-[14px] mb-0.5 group-hover:text-teal-300 transition-colors duration-200">
                    {item.title}
                  </p>
                  <p className="text-[#7a8fa8] text-[13px] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Inbox Panel ── */}
        <div
          ref={rightRef}
          style={{
            opacity: rightInView ? 1 : 0,
            transform: rightInView ? "translateY(0px)" : "translateY(52px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          <div className="border border-[#ffffff12] rounded-2xl overflow-hidden bg-[#0f1824]">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ffffff0e]">
              <span className="text-white font-semibold text-[14px]">Inbox / Engagement</span>
              <span className="text-[#22C55E] text-[11px] font-semibold bg-[#22C55E15] border border-[#22C55E30] px-3 py-1 rounded-full">
                24 unread
              </span>
            </div>

            {/* Inbox Rows */}
            <div className="flex flex-col">
              {inboxItems.map((item, i) => (
                <div
                  key={item.handle}
                  className="flex items-center gap-4 px-5 py-4 border-b border-[#ffffff08] last:border-b-0
                    hover:bg-[#ffffff04] transition-colors duration-200 cursor-pointer group"
                  style={{
                    opacity: rightInView ? 1 : 0,
                    transform: rightInView ? "translateY(0px)" : "translateY(24px)",
                    transition: `opacity 0.5s ease ${0.2 + i * 0.08}s, transform 0.5s ease ${0.2 + i * 0.08}s`,
                  }}
                >
                  {/* Platform icon box */}
                  <div className="border border-[#ffffff12] rounded-lg w-9 h-9 flex items-center justify-center shrink-0
                    group-hover:border-[#ffffff22] transition-colors duration-200">
                    {item.platform}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-semibold truncate">
                      {item.handle}
                      <span className="text-[#4B5563] font-normal"> · {item.source}</span>
                    </p>
                    <p className="text-[#7a8fa8] text-[12px] truncate mt-0.5">{item.preview}</p>
                  </div>

                  {/* Badge + time */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <span className="text-[#4B5563] text-[11px]">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}