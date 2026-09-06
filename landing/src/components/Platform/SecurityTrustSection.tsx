"use client";

import { useRouter } from "next/navigation";
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
const LockIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const AuditIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
    <line x1="9" y1="17" x2="12" y2="17" strokeLinecap="round" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth="2" />
  </svg>
);
const ShieldCtaIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#FFFFFFE0" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────
const cards = [
  {
    icon: <LockIcon />,
    title: "Role-Based Access Control",
    desc: "RBAC plus ABAC scope enforcement. Visibility does not equal authority. Workspace Owner access to Audit & Evidence is read-only, logged, and watermarked.",
    tag: "RBAC + ABAC",
  },
  {
    icon: <AuditIcon />,
    title: "Immutable Audit Events",
    desc: "Every decision, action, read, and override creates an immutable audit record. Records cannot be edited, deleted, or back-dated. Legal hold available on Corporate plans.",
    tag: "Designed for SOC 2 readiness",
  },
  {
    icon: <ShieldIcon />,
    title: "Data Protection",
    desc: "GDPR-compatible data handling. Regional data residency options available. DPA, sub-processor list, and security whitepaper available for Corporate plans.",
    tag: "GDPR-compatible",
  },
  {
    icon: <AlertIcon />,
    title: "Crisis & Incident Readiness",
    desc: "Crisis Console with dual authorization, time-boxed access, and post-incident review. Service Account activity always rendered with non-human identity badge.",
    tag: "Controlled break-glass",
  },
];

export default function SecurityTrustSection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: cardsRef, inView: cardsInView } = useInView(0.1);
  const { ref: ctaRef, inView: ctaInView } = useInView(0.2);
  const router = useRouter();

  return (
    <section className="bg-[#0C1422] w-full px-6 py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div
          ref={headRef}
          className="flex flex-col items-center text-center mb-14"
          style={{
            opacity: headInView ? 1 : 0,
            transform: headInView ? "translateY(0px)" : "translateY(48px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-5 h-[1.5px] bg-[#C9A84C] inline-block" />
            <span className="text-[#C9A84C] text-[11px] font-semibold tracking-[0.22em] uppercase">
              Security &amp; Trust
            </span>
          </div>
          <h2 className="text-white font-black text-[2.6rem] md:text-[3.2rem] leading-[1.1] tracking-tight max-w-3xl">
            Built for procurement and security review.
          </h2>
        </div>

        {/* ── Cards ── */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="border border-[#ffffff10] rounded-2xl p-6 flex flex-col gap-4 group cursor-default
                hover:border-[#ffffff1e] hover:bg-[#ffffff02] transition-all duration-300"
              style={{
                opacity: cardsInView ? 1 : 0,
                transform: cardsInView ? "translateY(0px)" : "translateY(44px)",
                transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
              }}
            >
              {/* Icon box — border only, no bg */}
              <div className="border border-[#ffffff18] rounded-xl w-[52px] h-[52px] flex items-center justify-center
                transition-all duration-300 group-hover:border-[#C9A84C44] group-hover:-translate-y-0.5">
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-[15px] leading-snug group-hover:text-[#F5E6C0] transition-colors duration-200">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-[#FFFFFF80] text-[13px] leading-relaxed flex-1 group-hover:text-[#9aafc4] transition-colors duration-200">
                {card.desc}
              </p>

              {/* Monospace tag */}
              <span className="self-start text-[11px] font-mono text-[#F5E6C0] cursor-text border border-[#C9A84C33] rounded-md px-3 py-1.5 mt-1
                group-hover:border-[#C9A84C33] group-hover:text-[#C9A84C] transition-all duration-200">
                {card.tag}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA Banner ── */}
        <div
          ref={ctaRef}
          className="max-w-[400px] mx-auto border border-[#ffffff10] rounded-2xl flex items-center gap-5 px-6 py-5 cursor-pointer
            hover:border-[#ffffff1e] hover:bg-[#ffffff02] transition-all duration-300 group"
          style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? "translateY(0px)" : "translateY(36px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          {/* Icon box */}
          <div className=" border border-[#FFFFFF1A] rounded-xl w-[52px] h-[52px] flex items-center justify-center shrink-0
            group-hover:border-[#C9A84C44] transition-all duration-300">
            <ShieldCtaIcon />
          </div>

          {/* Label */}
          <button onClick={()=>router.push("/security")} className="text-[#FFFFFFE0] cursor-pointer font-semibold text-[15px] group-hover:text-[#F5E6C0] transition-colors duration-200">
            Review Security &amp; Governance
          </button>
        </div>

      </div>
    </section>
  );
}