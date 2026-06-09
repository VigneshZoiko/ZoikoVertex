"use client";
import { useEffect, useRef, useState } from "react";

const TOP_CARDS = [
  {
    title: "Governance Model Documentation",
    description:
      "Full governance architecture overview — decision authority, approval chains, confidence scoring methodology, and policy enforcement framework.",
    cta: "Access Trust Center →",
    accentColor: "#20E7F2",
    iconBg: "#20E7F21A",
    iconBorder: "#20E7F21A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Audit Architecture & Evidence Packaging",
    description:
      "Immutable audit trail specification, chain-of-custody protocol, Evidence Vault architecture, and legal hold procedures documentation.",
    cta: "Access Trust Center →",
    accentColor: "#20E7F2",
    iconBg: "#20E7F21A",
    iconBorder: "#20E7F21A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    title: "Security & Access Control Documentation",
    description:
      "SOC 2 Type II summary, SSO/SAML/SCIM spec, BYOK architecture brief, penetration test summary, and security whitepaper.",
    cta: "Access Trust Center →",
    accentColor: "#20E7F2",
    iconBg: "#20E7F21A",
    iconBorder: "#20E7F21A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
];

const BOTTOM_CARDS = [
  {
    title: "Privacy & Data Handling Framework",
    description:
      "GDPR compliance architecture, data residency options, DPA template, data retention schedules, and AI training data policy.",
    cta: "Access Trust Center →",
    accentColor: "#C9A84C",
    iconBg: "#C9A84C1A",
    iconBorder: "#C9A84C1A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    title: "Procurement & Compliance Pack",
    description:
      "Vendor security questionnaire responses, enterprise contract templates, SLA specifications, and insurance/indemnification documentation.",
    cta: "Access Trust Center →",
    accentColor: "#C9A84C",
    iconBg: "#C9A84C1A",
    iconBorder: "#C9A84C1A",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

export default function ResourcesTrustLibrary() {
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

  const Card = ({
    card,
    index,
    delay,
  }: {
    card: typeof TOP_CARDS[0];
    index: number;
    delay: number;
  }) => (
    <div
      className={`relative border border-white/10 rounded-2xl p-7 bg-[#20E7F20A] flex flex-col gap-5
        hover:border-white/20 hover:bg-[#0d0d20] hover:-translate-y-1 cursor-default
        transition-all duration-500 ease-out overflow-hidden
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Left accent border */}
      <div
        className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
        style={{ background: card.accentColor }}
      />

      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center border"
        style={{ background: card.iconBg, borderColor: card.iconBorder }}
      >
        {card.icon}
      </div>

      {/* Title */}
      <h3 className="text-white text-lg font-black leading-snug">
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-white/40 text-sm leading-relaxed flex-1">
        {card.description}
      </p>

      {/* CTA */}
      <button
        className="self-start text-sm font-semibold transition-opacity duration-300 hover:opacity-70"
        style={{ color: card.accentColor }}
      >
        {card.cta}
      </button>
    </div>
  );

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
            GOVERNANCE & TRUST LIBRARY
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            The Trust Foundation for Enterprise AI
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            Everything your legal, security, and procurement teams need to
            evaluate, deploy, and audit ZoikoVertex in regulated environments.
          </p>
        </div>

        {/* Top 3 cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {TOP_CARDS.map((card, i) => (
            <Card key={card.title} card={card} index={i} delay={150 + i * 100} />
          ))}
        </div>

        {/* Bottom 2 cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {BOTTOM_CARDS.map((card, i) => (
            <Card key={card.title} card={card} index={i} delay={450 + i * 100} />
          ))}
        </div>

        {/* CTA Button */}
        <div
          className={`flex justify-center transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "650ms" }}
        >
          <button className="flex items-center gap-3 bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-black px-10 py-4 rounded-xl transition-colors duration-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Access Full Trust Center
          </button>
        </div>

      </div>
    </section>
  );
}