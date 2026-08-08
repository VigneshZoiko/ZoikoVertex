"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Cpu,
  Scale,
  FileText,
  Workflow,
  ArrowRight,
} from "lucide-react";

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

interface RoleCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  ctaText: string;
}

const roleCards: RoleCard[] = [
  {
    id: "executive",
    icon: ShieldCheck,
    title: "Executive",
    description:
      "Board-level value, risk reduction, ROI, and strategic control.",
    ctaText: "View Executive Buyer Guide",
  },
  {
    id: "marketing",
    icon: Sparkles,
    title: "Marketing",
    description:
      "Campaign velocity, brand governance, content approval, and performance accountability.",
    ctaText: "View Marketing Operations Guide",
  },
  {
    id: "it-cto",
    icon: Cpu,
    title: "IT / CTO",
    description:
      "Architecture, integrations, security, scalability, and data controls.",
    ctaText: "View Technical Evaluation Guide",
  },
  {
    id: "legal-compliance",
    icon: Scale,
    title: "Legal / Compliance",
    description:
      "AI governance, audit evidence, retention, policy controls, and approval records.",
    ctaText: "View Governance & Compliance Guide",
  },
  {
    id: "procurement",
    icon: FileText,
    title: "Procurement",
    description:
      "Vendor evaluation, security evidence, contractual readiness, and implementation risk.",
    ctaText: "View Procurement Checklist",
  },
  {
    id: "operations",
    icon: Workflow,
    title: "Operations",
    description:
      "Workflow control, ownership, SLAs, handoffs, and operational visibility.",
    ctaText: "View Workflow Maturity Guide",
  },
];

export default function StartWithYourRoleSection() {
  return (
    <section className="relative min-h-[640px] w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            START WITH YOUR ROLE
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
          Every stakeholder gets a buying path.
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-lg mb-14">
          Select your role to surface the guides, frameworks, and next steps
          built for how you evaluate.
        </p>

        {/* 6 Grid Cards */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {roleCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={cardVariants}
                className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#162235] transition-all duration-300 cursor-pointer backdrop-blur-sm min-h-[220px]"
              >
                <div>
                  {/* Top Row: Icon & Radio Circle Outline */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                      <Icon className="w-4 h-4 text-cyan-400 stroke-[2]" />
                    </div>
                    <div className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-cyan-400 transition-colors" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 font-normal leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>

                {/* Arrow & CTA Link */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-800/60">
                  <span className="text-xs font-mono font-bold text-[#20E7F2] tracking-[1px]">
                    {card.ctaText}
                  </span>
                  <span className="text-[#20E7F2] text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <ArrowRight size={15}/>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
