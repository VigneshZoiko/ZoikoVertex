"use client";

import React, { useEffect, useRef, useState } from "react";

interface Pathway {
  number: string;
  title: string;
  description: string;
  tags: string[];
  features: string[];
  bestFit: string;
  cta: string;
  href: string;
  colorScheme: {
    text: string;
    bg: string;
    border: string;
  };
  icon: React.ReactNode;
}

const PATHWAYS: Pathway[] = [
  {
    number: "PATHWAY 01",
    title: "Growth & Campaign Teams",
    description:
      "For teams that need faster campaign planning, content production, publishing, engagement, and performance insight — without uncontrolled AI or informal approval chains.",
    tags: [
      "Campaign cadence",
      "Content volume",
      "ROI reporting",
      "Channel coordination",
    ],
    colorScheme: {
      text: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/20",
    },
    features: [
      "Strategy Agent + Content Agent for AI-assisted drafting",
      "Publishing Agent for governed, approved-only release",
      "Revenue Attribution Agent for campaign ROI evidence",
      "Standard approvals, Brand Library, and audit trail",
    ],
    bestFit: "Best fit: Growth · Scale",
    cta: "Explore Growth Solutions",
    href: "/marketing-ops",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    number: "PATHWAY 02",
    title: "Brand & Multi-Brand Operators",
    description:
      "For organizations managing multiple brands, markets, agencies, regions, products, or approval chains — where brand drift, regional inconsistency, or fragmented standards create risk.",
    tags: ["Brand drift", "Regional inconsistency", "Cross-brand approvals"],
    colorScheme: {
      text: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
    },
    features: [
      "Full Brand Library with versioned standards and claims",
      "Role scoping by brand, region, and channel",
      "Multi-brand approval paths and cross-brand attribution",
      "Evidence Vault for brand compliance documentation",
    ],
    bestFit: "Best fit: Scale · Corporate",
    cta: "Explore Brand Control",
    href: "/brand-compliance",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    number: "PATHWAY 03",
    title: "Regulated & High-Risk Teams",
    description:
      "For teams operating under advertising, financial, pharmaceutical, public-sector, or reputational risk constraints — where every claim, approval, and exception must be defensible.",
    tags: [
      "Claims control",
      "Audit gaps",
      "Exception handling",
      "Crisis controls",
    ],
    colorScheme: {
      text: "text-rose-400",
      bg: "bg-rose-400/10",
      border: "border-rose-400/20",
    },
    features: [
      "Policy Engine with regulated-content packs",
      "Validation Desk and Three-Key Approval Protocol",
      "Immutable audit trail with legal hold option",
      "Override and exception logs for every escalation",
    ],
    bestFit: "Best fit: Scale · Corporate",
    cta: "Explore Governance Solutions",
    href: "/governance",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    number: "PATHWAY 04",
    title: "Agencies & Client Service Teams",
    description:
      "For agencies and service providers managing multiple clients, approval routes, deliverables, and reporting expectations — where client governance accountability and delivery speed must coexist.",
    tags: [
      "Client approvals",
      "Scope control",
      "Performance proof",
      "Delivery speed",
    ],
    colorScheme: {
      text: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20",
    },
    features: [
      "Client-scoped workspaces with External Collaborator roles",
      "Per-client Brand Libraries and approval paths",
      "Client-ready reporting and delivery dashboards",
      "Signed approval chains as proof of work per client",
    ],
    bestFit: "Best fit: Scale · Corporate",
    cta: "Explore Agency Solutions",
    href: "/agencies",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
];

export default function SolutionPathways() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="solution" className="bg-[#080E1A] py-24 px-6 font-sans">
      <div ref={ref} className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            SOLUTION PATHWAYS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Four paths. One governance model.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg">
            Choose the operating solution that matches your team structure, risk
            level, and growth model. Every path runs on the same governed
            execution platform.
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {PATHWAYS.map((p, i) => (
            <div
              key={p.title}
              className={`border border-white/10 rounded-2xl p-6 bg-[#0a0a18] flex flex-col gap-5
                hover:border-white/20 hover:bg-[#0d0d20] transition-all duration-500 ease-out group
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 120}ms` }}
            >
              {/* Top row — icon + number + title */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110 ${p.colorScheme.bg} ${p.colorScheme.border} ${p.colorScheme.text}`}
                >
                  {p.icon}
                </div>
                <div>
                  <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-1">
                    {p.number}
                  </p>
                  <h3 className="text-white text-lg font-black leading-tight">
                    {p.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/40 text-xs leading-relaxed">
                {p.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium ${p.colorScheme.text} ${p.colorScheme.bg} ${p.colorScheme.border}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Features */}
              <div className="border border-white/5 rounded-xl p-4 bg-[#080812] flex flex-col gap-2">
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <svg
                      className={`shrink-0 mt-0.5 ${p.colorScheme.text}`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-white/50 text-xs leading-relaxed">
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer — best fit + CTA */}
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-white/25 text-xs font-medium">
                  {p.bestFit}
                </span>
                <a
                  href={p.href}
                  className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 ${p.colorScheme.text} ${p.colorScheme.border} ${p.colorScheme.bg}`}
                >
                  → {p.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
