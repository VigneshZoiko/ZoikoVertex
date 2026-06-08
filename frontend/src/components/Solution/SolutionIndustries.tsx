"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const INDUSTRIES = [
  {
    badge: "Regulated",
    badgeColor: "#fb7185",
    badgeBg: "rgba(251,113,133,0.15)",
    image: "/images/industries/financial.png",
    title: "Financial Services",
    description:
      "Marketing approvals, financial promotions, claims control, board reporting, and region-specific review workflows. Configurable support for financial-promotion review workflows.",
    tags: ["Claims control", "Approval evidence", "Board reporting"],
    tagColor: "#fb7185",
    tagBg: "rgba(251,113,133,0.08)",
    tagBorder: "rgba(251,113,133,0.2)",
  },
  {
    badge: "Pharma",
    badgeColor: "#4ade80",
    badgeBg: "rgba(74,222,128,0.15)",
    image: "/images/industries/pharma.png",
    title: "Pharmaceutical & Healthcare",
    description:
      "Medical and healthcare-adjacent teams with stricter claim-review and approval needs. MLR-style review workflows for healthcare marketing operations.",
    tags: ["MLR-style review", "Claim validation", "Exception log"],
    tagColor: "#4ade80",
    tagBg: "rgba(74,222,128,0.08)",
    tagBorder: "rgba(74,222,128,0.2)",
  },
  {
    badge: "Public",
    badgeColor: "#38bdf8",
    badgeBg: "rgba(56,189,248,0.15)",
    image: "/images/industries/public.png",
    title: "Public Sector & Civic",
    description:
      "Public communications, stakeholder engagement, campaign approval, content traceability, and crisis messaging with full evidence architecture.",
    tags: ["Audit trail", "Crisis routing", "Accessibility"],
    tagColor: "#38bdf8",
    tagBg: "rgba(56,189,248,0.08)",
    tagBorder: "rgba(56,189,248,0.2)",
  },
  {
    badge: "Growth",
    badgeColor: "#22d3ee",
    badgeBg: "rgba(34,211,238,0.15)",
    image: "/images/industries/tech.png",
    title: "Technology & SaaS",
    description:
      "Product launches, thought leadership, paid/organic campaign coordination, partner marketing, and ROI reporting at scale with governed AI execution.",
    tags: ["AI velocity", "ROI evidence", "Integrations"],
    tagColor: "#22d3ee",
    tagBg: "rgba(34,211,238,0.08)",
    tagBorder: "rgba(34,211,238,0.2)",
  },
  {
    badge: "Multi",
    badgeColor: "#facc15",
    badgeBg: "rgba(250,204,21,0.15)",
    image: "/images/industries/retail.png",
    title: "Consumer Brands & Retail",
    description:
      "Multi-channel campaigns, creator content, brand voice control, region-specific content, and promotions — with approval discipline and evidence at every step.",
    tags: ["Brand consistency", "Multi-region", "Creator governance"],
    tagColor: "#facc15",
    tagBg: "rgba(250,204,21,0.08)",
    tagBorder: "rgba(250,204,21,0.2)",
  },
  {
    badge: "Agency",
    badgeColor: "#a78bfa",
    badgeBg: "rgba(167,139,250,0.15)",
    image: "/images/industries/agency.png",
    title: "Agencies & Consultancies",
    description:
      "Multi-client operations, external approvals, content calendars, evidence capture, and client-ready reporting with repeatable delivery governance across every account.",
    tags: ["Client workspaces", "Proof of work", "Scalable delivery"],
    tagColor: "#a78bfa",
    tagBg: "rgba(167,139,250,0.08)",
    tagBorder: "rgba(167,139,250,0.2)",
  },
];

export default function SolutionIndustries() {
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
    <section className="bg-[#0C1422] py-24 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-semi-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            INDUSTRIES
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Built for complex operating environments.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            ZoikoVertex is configured for the sectors where governance, brand, and
            compliance requirements are highest.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {INDUSTRIES.map((item, i) => (
            <div
              key={item.title}
              className={`group border border-[#FFFFFF1A] rounded-2xl overflow-hidden bg-[#111D2E]
                hover:border-white/20 hover:-translate-y-1 cursor-default
                transition-all duration-500 ease-out flex flex-col
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a18] via-[#0a0a18]/20 to-transparent" />

                {/* Badge */}
                <div
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold"
                //   style={{
                //     color: item.badgeColor,
                //     background: item.badgeBg,
                //     border: `1px solid ${item.badgeColor}30`,
                //   }}
                >
                  {/* {item.badge} */}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="text-white text-base font-black">
                  {item.title}
                </h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-[50px] border font-medium"
                      style={{
                        color: item.tagColor,
                        background: item.tagBg,
                        borderColor: item.tagBorder,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}