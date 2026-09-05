"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PLANS_HEADER = [
  { name: "VERTEX STARTER", highlighted: false },
  { name: "VERTEX GROWTH", highlighted: false },
  { name: "VERTEX SCALE", highlighted: false },
  { name: "VERTEX CORPORATE", highlighted: false },
];

const SECTIONS = [
  {
    label: "WORKSPACE & USERS",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    rows: [
      { label: "Users included", values: ["2", "7", "20", "Custom"], highlight: [false, false, true, true] },
      { label: "Social profiles", values: ["2 limited", "8", "25", "Custom"], highlight: [false, false, true, true] },
      { label: "Brands / workspaces", values: ["1", "1", "Up to 5", "Custom"], highlight: [false, false, true, true] },
      { label: "Data retention", values: ["30 days", "12 months", "24 months", "Custom"], highlight: [false, false, false, true] },
    ],
  },
  {
    label: "AI AGENTS",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
    rows: [
      { label: "AI agents included", values: ["Preview only", "5 standard", "5 advanced", "5 custom"], highlight: [false, false, true, true] },
      { label: "Human-in-the-loop controls", values: ["check", "check", "check", "check"], highlight: [false, false, false, false] },
      { label: "Autonomy controls", values: ["cross", "Standard", "Advanced", "Custom policy"], highlight: [false, false, true, true] },
      { label: "Agent action logging", values: ["cross", "check", "check", "check"], highlight: [false, false, false, false] },
    ],
  },
  {
    label: "CONTENT & PUBLISHING",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    rows: [
      { label: "Content Studio", values: ["cross", "check", "check", "check"], highlight: [false, false, false, false] },
      { label: "Publishing Calendar", values: ["Preview", "check", "check", "check"], highlight: [false, false, false, false] },
      { label: "Brand Library", values: ["cross", "Basic", "Full", "Multi-entity"], highlight: [false, false, true, true] },
      { label: "Inbox / Engagement", values: ["Preview", "Standard", "Advanced routing", "Crisis-aware"], highlight: [false, false, true, true] },
    ],
  },
  {
    label: "GOVERNANCE & APPROVALS",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    rows: [
      { label: "Review Queue + Validation Desk", values: ["cross", "check", "check", "check"], highlight: [false, false, false, false] },
      { label: "Approval workflows", values: ["cross", "Standard", "Advanced / multi-key", "Three-key"], highlight: [false, false, true, true] },
      { label: "Separation of duties", values: ["cross", "cross", "check", "check"], highlight: [false, false, false, false] },
      { label: "Crisis Console", values: ["cross", "cross", "Standard", "Full dual-auth"], highlight: [false, false, true, true] },
      { label: "Policy Center + versioning", values: ["cross", "check", "check", "check"], highlight: [false, false, false, false] },
    ],
  },
  {
    label: "EVIDENCE & AUDIT",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    rows: [
      { label: "Audit trail", values: ["Activity log", "Immutable", "Advanced packaging", "Evidence Vault"], highlight: [false, false, true, true] },
      { label: "Evidence exports", values: ["cross", "check", "Watermarked", "Chain-of-custody"], highlight: [false, false, true, true] },
      { label: "Legal hold", values: ["cross", "cross", "cross", "check"], highlight: [false, false, false, false] },
      { label: "Analytics & ROI", values: ["Snapshot", "Standard", "Cross-brand", "Board-grade"], highlight: [false, false, true, true] },
    ],
  },
  {
    label: "SECURITY & ACCESS",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    rows: [
      { label: "RBAC + ABAC", values: ["Basic", "check", "check", "check"], highlight: [false, false, false, false] },
      { label: "SSO / SAML", values: ["cross", "cross", "Add-on", "check"], highlight: [false, false, false, false] },
      { label: "SCIM provisioning", values: ["cross", "cross", "cross", "check"], highlight: [false, false, false, false] },
      { label: "DPA + security whitepaper", values: ["cross", "cross", "cross", "check"], highlight: [false, false, false, false] },
    ],
  },
  {
    label: "SUPPORT",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    rows: [
      { label: "Support channel", values: ["Email + help center", "Priority email", "Named CSM + QBR", "TAM + AE + SLA"], highlight: [false, false, true, true] },
      { label: "Onboarding", values: ["Self-serve", "Guided resources", "Onboarding session", "Implementation lead"], highlight: [false, false, true, true] },
      { label: "Contract motion", values: ["Free", "Monthly or annual", "Annual preferred", "Annual / multi-year"], highlight: [false, false, false, true] },
    ],
  },
];

function Cell({ value, highlight }: { value: string; highlight: boolean }) {
  if (value === "check") return (
    <div className="flex justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  );
  if (value === "cross") return (
    <div className="flex justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>
  );
  return (
    <p className={`text-xs text-center leading-snug ${highlight ? "text-cyan-400 font-bold" : "text-white/40"}`}>
      {value}
    </p>
  );
}

export default function PricingComparison() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.02 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#080E1A] py-16 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Top link */}
        <div className={`text-center mb-10 transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
          <button className="text-white/40 text-sm flex items-center gap-2 mx-auto hover:text-white/70 transition-colors">
            Compare all features
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </button>
        </div>

        {/* Heading */}
        <h2 className={`text-center text-3xl font-black text-white tracking-widest uppercase mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "100ms" }}>
          Compare All Plan Features
        </h2>

        {/* Plan headers — OUTSIDE table, no border */}
        <div
          className={`grid grid-cols-5 mb-4 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "150ms" }}
        >
          <div /> {/* empty first col */}
          {PLANS_HEADER.map((plan) => (
            <div key={plan.name} className="px-3 text-center">
              <p className="text-cyan-400 text-xs font-medium tracking-widest uppercase mb-3">
                {plan.name}
              </p>
              <button onClick={()=>router.push("https://getzoikovertex.com/signup")} className="w-full cursor-pointer bg-cyan-400 hover:bg-cyan-300 text-[#03050F] text-xs font-semibold py-2.5 rounded-[4] transition-colors duration-300">
                GET STARTED
              </button>
            </div>
          ))}
        </div>

        {/* Table — rounded border, only row bottom borders inside */}
        <div
          className={`border border-white/10 rounded-2xl overflow-hidden transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {/* FEATURES label row */}
          <div className="grid grid-cols-5 border-b border-white/5 bg-[#0a0a18]">
            <div className="px-5 py-3">
              <span className="text-white/20 text-xs font-medium tracking-widest uppercase">FEATURES</span>
            </div>
            <div className="col-span-4" />
          </div>

          {/* Sections */}
          {SECTIONS.map((section, si) => (
            <div key={section.label}>

              {/* Section header row */}
              <div className="grid grid-cols-5 bg-[#172035] border-b border-white/5">
                <div className="col-span-5 px-5 py-2.5 flex items-center gap-2">
                  <span className="text-[#C9A84C]">{section.icon}</span>
                  <span className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase">
                    {section.label}
                  </span>
                </div>
              </div>

              {/* Data rows */}
              {section.rows.map((row, ri) => {
                const isLast = si === SECTIONS.length - 1 && ri === section.rows.length - 1;
                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-5 hover:bg-white/[0.015] transition-colors duration-150
                      ${!isLast ? "border-b border-white/5" : ""}`}
                  >
                    {/* Feature name — no right border */}
                    <div className="px-5 py-3.5 flex items-center">
                      <span className="text-white/55 text-xs">{row.label}</span>
                    </div>

                    {/* 4 value cells — no left/right borders */}
                    {row.values.map((val, vi) => (
                      <div key={vi} className="px-3 py-3.5 flex items-center justify-center">
                        <Cell value={val} highlight={row.highlight[vi]} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}