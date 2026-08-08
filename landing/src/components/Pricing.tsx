"use client";
import { useEffect, useRef, useState } from "react";

const PLANS = [
  {
    tier: "FREE TIER",
    tierSub: null,
    name: "Vertex Starter",
    price: { monthly: "0", annual: "0" },
    priceNote: { monthly: "Always free", annual: "Always free" },
    description:
      "Connect channels, understand your governance posture, and see where ZoikoVertex reduces risk before your team commits.",
    cta: "Start free",
    ctaIcon: "play",
    highlighted: false,
    stats: [
      { value: "2", label: "users" },
      { value: "2", label: "profiles" },
      { value: "1", label: "brand" },
    ],
    includedLabel: "INCLUDED",
    included: [
      "Command Center (limited)",
      "Analytics snapshot",
      "AI recommendations — read-only",
      "Basic activity log",
      "Email support + help center",
    ],
    notIncludedLabel: "NOT INCLUDED",
    notIncluded: [
      "Live publishing or execution",
      "Approvals or workflows",
      "API access",
    ],
    footer: "No live execution authority on this plan.",
  },
  {
    tier: "FIRST PAID TIER",
    tierSub: null,
    name: "Vertex Growth",
    price: { monthly: "299", annual: "299" },
    priceNote: { monthly: null, annual: null },
    description:
      "Run governed campaigns with AI agents, approvals, publishing, and audit-ready execution for one brand team.",
    cta: "Start 14-day trial",
    ctaIcon: "clock",
    highlighted: false,
    stats: [
      { value: "7", label: "users" },
      { value: "8", label: "profiles" },
      { value: "1", label: "brand" },
      { value: "12mo", label: "history" },
    ],
    includedLabel: "EXECUTION",
    included: [
      "Content Studio + publishing",
      "5 AI agents — standard governed",
      "Review Queue + two-step approvals",
      "Immutable audit trail + export",
      "Basic Brand Library",
      "Analytics & ROI — standard",
      "Priority email support",
    ],
    notIncludedLabel: "NOT INCLUDED",
    notIncluded: [
      "Multi-brand portfolio",
      "Crisis Console",
      "SSO / SCIM",
    ],
    footer: "Single brand workspace only. No multi-entity governance.",
  },
  {
    tier: "RECOMMENDED",
    tierSub: "COMMERCIAL CENTER",
    name: "Vertex Scale",
    price: { monthly: "799", annual: "799" },
    priceNote: { monthly: null, annual: null },
    description:
      "Coordinate multi-brand teams with advanced approvals, full Brand Library, governed agents, and cross-brand performance intelligence.",
    cta: "Book strategy call",
    ctaIcon: "calendar",
    highlighted: true,
    stats: [
      { value: "20", label: "users" },
      { value: "25", label: "profiles" },
      { value: "5", label: "brands" },
      { value: "24mo", label: "history" },
    ],
    includedLabel: "EVERYTHING IN GROWTH, PLUS",
    included: [
      "5 AI agents — advanced multi-brand",
      "Advanced multi-stage approvals",
      "Multi-key approval + SoD enforcement",
      "Full Brand Library — standards & rules",
      "Crisis Console (standard activation)",
      "Advanced evidence packaging",
      "Cross-brand Analytics & ROI",
      "Named Customer Success Manager",
      "Quarterly governance review",
    ],
    notIncludedLabel: null,
    notIncluded: [],
    footer: "No legal hold or custom SLA unless separately contracted.",
  },
  {
    tier: "PROCUREMENT-READY",
    tierSub: null,
    name: "Vertex Corporate",
    price: { monthly: "Custom", annual: "Custom" },
    priceNote: { monthly: "Annual or multi-year contract.", annual: "Annual or multi-year contract." },
    description:
      "Deploy across corporate brands, regulated workflows, advanced security, evidence-grade auditability, and custom governance architecture.",
    cta: "Request corporate brief",
    ctaIcon: "doc",
    highlighted: false,
    stats: [
      { value: "Custom", label: "" },
      { value: "Custom", label: "" },
      { value: "Custom", label: "" },
      { value: "Custom", label: "" },
    ],
    includedLabel: "EVERYTHING IN SCALE, PLUS",
    included: [
      "Three-key approval protocol",
      "Evidence Vault + legal hold",
      "Chain-of-custody + watermarked exports",
      "Custom AI governance configuration",
      "Crisis Console — full dual-authorization",
      "SSO/SAML + SCIM provisioning",
      "DPA + security whitepaper",
      "Named AE + TAM + agreed SLA",
    ],
    notIncludedLabel: null,
    notIncluded: [],
    footer: "Security and legal review required. BYOK subject to approval.",
  },
];

function CtaIcon({ type }: { type: string }) {
  if (type === "play") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  );
  if (type === "clock") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
  if (type === "calendar") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  );
}

export default function Pricing() {
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
    <section className="bg-[#080E1A] py-24 px-6">
      <div ref={ref} className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className={`text-center mb-10 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Start with proof. Scale with confidence.
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
            Four deployment tiers matched to your governance maturity. Free to
            start, no credit card required.
          </p>
        </div>

        {/* Monthly-only note — annual checkout disabled until price book approval */}
        <div className={`flex items-center justify-center gap-3 mb-10 transition-all duration-700 ease-out ${visible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "150ms" }}>
          <p className="text-white/30 text-xs">Monthly pricing. Annual plans available on request.</p>
        </div>

        {/* Cards — NO gap, shared borders */}
        <div
          className={`grid grid-cols-1 md:grid-cols-4 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "250ms" }}
        >
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-5
                ${plan.highlighted
                  ? "border-2 border-[#20E7F2]  bg-[#0D1929] z-10 -mx-px"
                  : "border border-white/10 bg-[#0a0a18]"
                }
                ${!plan.highlighted && i === 0 ? "rounded-l-2xl" : ""}
                ${!plan.highlighted && i === PLANS.length - 1 ? "rounded-r-2xl" : ""}
                ${!plan.highlighted && i > 0 && !PLANS[i-1].highlighted ? "-ml-px" : ""}
              `}
            >
              {/* Tier label */}
              <div className="mb-3">
                {plan.highlighted ? (
                  <>
                    <p className="text-cyan-400 text-xs font-medium tracking-widest uppercase">{plan.tier}</p>
                    <p className="text-[#20E7F280] text-xs font-regular tracking-widest uppercase">{plan.tierSub}</p>
                  </>
                ) : (
                  <p className="text-[#FFFFFF47] text-xs font-medium tracking-widest uppercase">{plan.tier}</p>
                )}
                <h3 className="text-white text-lg font-black mt-1">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-3">
                {plan.price.monthly === "Custom" ? (
                  <>
                    <p className="text-white text-3xl font-black">Custom</p>
                    <p className="text-white/30 text-xs mt-1">{plan.priceNote.monthly}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-0.5">
                      <span className="text-white text-xs font-bold mt-1.5">$</span>
                      <span className="text-white text-4xl font-black leading-none">
                        {plan.price.monthly}
                      </span>
                      <span className="text-white/40 text-xs mt-4">/mo</span>
                    </div>
                    {plan.priceNote.monthly && (
                      <p className="text-white/30 text-xs mt-1">{plan.priceNote.monthly}</p>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-white/40 text-xs leading-relaxed mb-4">{plan.description}</p>

              {/* CTA */}
              {plan.highlighted ? (
                <button className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black py-2.5 rounded-xl transition-colors duration-300 mb-4">
                  <CtaIcon type={plan.ctaIcon} />
                  {plan.cta}
                </button>
              ) : (
                <button className="w-full flex items-center justify-center gap-2 border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-xs font-semibold py-2.5 rounded-xl transition-all duration-300 mb-4">
                  <CtaIcon type={plan.ctaIcon} />
                  {plan.cta}
                </button>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-4">
                {plan.stats.map((s, si) => (
                  <div key={si} className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${plan.highlighted ? "text-[#FFFFFF80]" : "text-[#FFFFFF80]"}`}>
                      {s.value}
                    </span>
                    {s.label && <span className="text-white/30 text-xs">{s.label}</span>}
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-white/5 mb-4" />

              {/* Included */}
              <div className="flex flex-col gap-1.5 flex-1">
                <p className="text-white/25 text-xs font-medium tracking-widest uppercase mb-2">
                  {plan.includedLabel}
                </p>
                {plan.included.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <svg className="shrink-0 mt-0.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-white/50 text-xs leading-relaxed">{f}</span>
                  </div>
                ))}

                {/* Not included */}
                {plan.notIncluded.length > 0 && (
                  <>
                    <p className="text-white/25 text-xs font-black tracking-widest uppercase mt-3 mb-2">
                      NOT INCLUDED
                    </p>
                    {plan.notIncluded.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <svg className="shrink-0 mt-0.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <span className="text-white/20 text-xs leading-relaxed line-through">{f}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <p className="text-white/15 text-xs leading-relaxed mt-4 pt-3 border-t border-white/5">
                {plan.footer}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}