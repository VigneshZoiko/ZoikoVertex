"use client";

import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface FeaturedCardItem {
  id: string;
  category: string;
  status: string;
  title: string;
  description: string;
  benefits: string;
  modules: string;
  primaryLinkText: string;
  primaryLinkHref: string;
  secondaryLinkText: string;
  secondaryLinkHref: string;
}

const featuredData: FeaturedCardItem[] = [
  {
    id: "featured-1",
    category: "Auditability",
    status: "Released",
    title: "New Evidence Vault controls for sealed AI outputs",
    description:
      "Stronger, tamper-evident proof for every governed output — defensible in security and procurement review.",
    benefits: "GOVERNANCE LEAD • SECURITY",
    modules: "Evidence Layer, Audit Trail",
    primaryLinkText: "Read update",
    primaryLinkHref: "#",
    secondaryLinkText: "View docs",
    secondaryLinkHref: "#",
  },
  {
    id: "featured-2",
    category: "Approvals",
    status: "Released",
    title: "Approval SLA escalation rules",
    description:
      "Faster approvals with automatic escalation — fewer stalled campaigns, no loss of accountability.",
    benefits: "ADMIN • APPROVER",
    modules: "Approval Workflows",
    primaryLinkText: "Read update",
    primaryLinkHref: "#",
    secondaryLinkText: "Watch demo",
    secondaryLinkHref: "#",
  },
  {
    id: "featured-3",
    category: "Responsible AI",
    status: "Released",
    title: "Configurable autonomy thresholds for governed agents",
    description:
      "Lower risk by bounding how far agents act before a human checkpoint is required.",
    benefits: "GOVERNANCE • EXECUTIVE",
    modules: "Agentic Architecture",
    primaryLinkText: "Read update",
    primaryLinkHref: "#",
    secondaryLinkText: "Contact sales",
    secondaryLinkHref: "#",
  },
];

export default function FeaturedUpdatesSection() {
  return (
    <section className="relative min-h-[750px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="mb-12 max-w-2xl text-left">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              FEATURED UPDATES
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            The releases that move the needle.
          </h2>

          {/* Subtitle / Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
            Editorially selected &mdash; the changes most likely to raise buyer
            confidence or accelerate customer adoption.
          </p>
        </div>

        {/* 3 Featured Cards Grid */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {featuredData.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-[#7AA0BE24] hover:border-slate-700 hover:bg-[#0C1524] transition-all duration-300 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] min-h-[380px]"
            >
              {/* Top Featured Badge */}
              <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-[#E8B768] text-slate-950 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow-md">
                <span>★</span> FEATURED
              </div>

              <div>
                {/* Category & Status Badges */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg border border-[#0A8FA64D] text-[#0A8FA6] tracking-[1px] text-[11px] font-mono font-semibold">
                    {item.category}
                  </span>
                  <span className="px-3 py-1 rounded-lg tracking-[1px] border border-[#3FD6A04D] text-[#3FD6A0] text-[11px] font-mono font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {item.status}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-3 tracking-tight group-hover:text-white transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-sm max-w-80 text-[#C3CCD6] font-normal leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div>
                {/* Metadata / Tags */}
                <div className="border-t border-slate-800/60 pt-4 mb-6 space-y-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-[#0A8FA6] uppercase tracking-[1px] font-semibold">
                      BENEFITS &bull; {item.benefits}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5F6D7E] tracking-[1px]">
                      Modules &bull;
                      {item.modules}
                    </span>
                  </div>
                </div>

                {/* Action Links */}
                <div className="flex items-center gap-4 text-xs font-mono font-semibold">
                  <a
                    href={item.primaryLinkHref}
                    className="inline-flex items-center gap-1 tracking-[1px] text-[#20E7F2] hover:text-cyan-300 transition-colors group/link"
                  >
                    <span>{item.primaryLinkText}</span>
                    <span className="group-hover/link:translate-x-0.5 transition-transform">
                      &rarr;
                    </span>
                  </a>

                  <a
                    href={item.secondaryLinkHref}
                    className="inline-flex items-center gap-1 tracking-[1px] text-[#20E7F2] hover:text-slate-200 transition-colors group/link"
                  >
                    <span>{item.secondaryLinkText}</span>
                    <span className="group-hover/link:translate-x-0.5 transition-transform">
                      &rarr;
                    </span>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
