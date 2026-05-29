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

const plans = [
  {
    price: "FREE",
    name: "Starter",
    desc: "Explore governed AI readiness. Connect limited channels and understand your governance posture before committing.",
    cta: "Start Free",
    featured: false,
  },
  {
    price: "$299/MO · ANNUAL",
    name: "Growth",
    desc: "Run governed campaigns with AI-assisted execution — approvals, publishing, engagement, and audit-ready operation for one brand team.",
    cta: "Start Trial",
    featured: false,
  },
  {
    price: "$799/MO · ANNUAL",
    name: "Scale",
    desc: "Coordinate multi-team, multi-brand operations with advanced approvals, full Brand Library, Crisis Console, and cross-brand intelligence.",
    cta: "Book Strategy Call",
    featured: true,
  },
  {
    price: "CUSTOM",
    name: "Corporate",
    desc: "Enterprise-grade governance, Evidence Vault, custom integrations, advanced ABAC, SSO/SCIM, and dedicated implementation support.",
    cta: "Request Corporate Brief",
    featured: false,
  },
];

export default function PricingSection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: cardsRef, inView: cardsInView } = useInView(0.1);

  return (
    <section className="bg-[#080E1A] w-full px-6 py-20 overflow-hidden">
      <div className="max-w-[1200] mx-auto">

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
            <span className="w-5 h-[1.5px] bg-teal-400 inline-block" />
            <span className="text-teal-400 text-[11px] font-semibold tracking-[0.22em] uppercase">
              Access Paths
            </span>
          </div>
          <h2 className="text-white font-black text-[2.6rem] md:text-[3.2rem] leading-[1.1] tracking-tight max-w-2xl">
            Start where you are. Scale when you&apos;re ready.
          </h2>
        </div>

        {/* ── Pricing Cards ── */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl p-6 transition-all duration-300 group cursor-default
                ${plan.featured
                  ? "border-2 border-teal-400 bg-[#0f1e2e]"
                  : "border border-[#ffffff12] bg-[#0f1824] hover:border-[#ffffff20] hover:bg-[#111d2e]"
                }
              `}
              style={{
                opacity: cardsInView ? 1 : 0,
                transform: cardsInView ? "translateY(0px)" : "translateY(44px)",
                transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
              }}
            >
              {/* Price label */}
              <p className={`text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-2
                ${plan.featured ? "text-[#20E7F2]" : "text-[#4B5563]"}`}>
                {plan.price}
              </p>

              {/* Plan name */}
              <h3 className="text-white font-black text-[1.5rem] leading-tight mb-4 tracking-tight">
                {plan.name}
              </h3>

              {/* Description */}
              <p className="text-[#7a8fa8] text-[13px] leading-relaxed flex-1 mb-8">
                {plan.desc}
              </p>

              {/* CTA Button */}
              {plan.featured ? (
                <button className="w-full bg-[#20E7F2] hover:bg-teal-300 text-[#0C1422] font-bold text-[14px] py-3 rounded-xl transition-colors duration-200">
                  {plan.cta}
                </button>
              ) : (
                <button className="w-full border border-[#ffffff18] hover:border-[#ffffff30] hover:bg-[#ffffff06] text-white font-semibold text-[14px] py-3 rounded-xl transition-all duration-200">
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}