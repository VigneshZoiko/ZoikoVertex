"use client";
import { useEffect, useRef, useState } from "react";

const STAKEHOLDERS = [
  {
    role: "CMO / MARKETING LEADER",
    title: "Output pressure, ROI scrutiny, board reporting",
    quote: '"AI at scale means I own every mistake my team makes — and I need to explain it."',
    answer:
      "A governed operating layer that increases campaign velocity while preserving control, brand standards, and ROI evidence. Every approval is logged; every decision is traceable.",
    cta: "Request Executive Demo →",
    iconColor: "#20E7F2",
    iconBg: "#20E7F20F",
    iconBorder: "#20E7F22E",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    role: "DIGITAL MARKETING DIRECTOR",
    title: "Toolchain fragmentation, attribution gaps",
    quote: '"Six tools, approvals in email, and still no clear attribution. There has to be a better system."',
    answer:
      "One unified workflow from strategy through publishing to revenue intelligence — with approval workflows that replace email chains and an audit trail that connects decisions to outcomes.",
    cta: "Explore Workflow →",
    iconColor: "#22C55E",
    iconBg: "#22C55E1A",
    iconBorder: "#22C55E33",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    role: "HEAD OF BRAND / BRAND STEWARD",
    title: "Brand drift, regional inconsistency",
    quote: '"Agencies are generating content that doesn\'t match our standards and I only find out after it\'s live."',
    answer:
      "Versioned Brand Library standards, Brand Library-enforced content checks before review, controlled approval paths, and brand integrity scorecards for every asset and campaign.",
    cta: "Explore Brand Control →",
    iconColor: "#F59E0B",
    iconBg: "#F59E0B1A",
    iconBorder: "#F59E0B33",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    ),
  },
  {
    role: "COMPLIANCE / LEGAL / RISK",
    title: "AI adoption without defensible oversight",
    quote: '"I can\'t approve an AI tool I can\'t audit. How do I defend adoption to regulators or the board?"',
    answer:
      "Policy-bound agents, approval gates, validation surfaces, an immutable audit trail, and exportable Evidence Vault documentation — so compliance can verify every decision before and after it happens.",
    cta: "Explore Governance →",
    iconColor: "#EF4444",
    iconBg: "#EF444414",
    iconBorder: "#EF444433",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    role: "CIO / CTO / SECURITY",
    title: "Identity, audit, data governance",
    quote: '"Another AI tool operating outside our identity, security, and data governance. We\'ve been here before."',
    answer:
      "Role-scoped RBAC + ABAC, SSO/SAML/SCIM path, MFA, audit log streaming, and separation between security administration and identity management. Trust Center documentation available.",
    cta: "Review Trust Layer →",
    iconColor: "#FFFFFF85",
    iconBg: "#FFFFFF0E",
    iconBorder: "#FFFFFF1A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF85" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
  {
    role: "AGENCY LEADER",
    title: "Multi-client governance and delivery",
    quote: '"We need AI speed across clients without creating governance chaos or losing proof of work."',
    answer:
      "Client-scoped workspaces, External Collaborator roles, per-client Brand Libraries, approval chain tracking, and client-ready reporting — so you move fast and still have documented proof for every account.",
    cta: "Explore Agency Fit →",
    iconColor: "#8B5CF6",
    iconBg: "#8B5CF61A",
    iconBorder: "#8B5CF633",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
  },
];

export default function SolutionOutcomes() {
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
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            ROLE-BASED OUTCOMES
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4 max-w-3xl mx-auto">
            Every stakeholder sees their version of the answer.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
            Different roles carry different anxieties. ZoikoVertex answers each one in
            the language that matters to them.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {STAKEHOLDERS.map((s, i) => (
            <div
              key={s.title}
              className={`group border border-[#FFFFFF1A] rounded-2xl p-5 bg-[#0C1422] flex flex-col gap-4
                hover:border-white/20 hover:bg-[#0d0d20] hover:-translate-y-1
                transition-all duration-500 ease-out cursor-default
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Role label + icon */}
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: s.iconBg,
                    border: `1px solid ${s.iconBorder}`,
                    color: s.iconColor,
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <p
                    className="text-xs font-bold text-[#20E7F2] tracking-widest uppercase mb-1 font-medium font-jetbrains"
                  
                  >
                    {s.role}
                  </p>
                  <h3 className="text-white text-sm font-black leading-snug">
                    {s.title}
                  </h3>
                </div>
              </div>

              {/* Quote */}
              <div className="rounded-xl p-3 bg-[#FFFFFF0E] border-l-2 border-solid border-[#20E7F22E]">
                <p className="text-white/30 text-xs leading-relaxed italic">
                  {s.quote}
                </p>
              </div>

              {/* Answer */}
              <p className="text-white/50 text-xs leading-relaxed flex-1">
                {s.answer}
              </p>

              {/* CTA */}
              <button
                className="text-xs font-semibold text-left transition-colors duration-300 hover:opacity-80"
                style={{ color: s.iconColor }}
              >
                {s.cta}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}