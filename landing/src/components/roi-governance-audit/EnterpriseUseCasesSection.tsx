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

interface UseCaseCard {
  id: string;
  category: string;
  title: string;
  description: string;
}

const useCases: UseCaseCard[] = [
  {
    id: "retail",
    category: "RETAIL",
    title: "High-volume retail campaigns",
    description:
      "Sustain campaign throughput across seasons without losing approval discipline.",
  },
  {
    id: "regulated",
    category: "REGULATED",
    title: "Regulated marketing claims",
    description:
      "Route sensitive claims to the right clinical, legal, and policy reviewers before publication.",
  },
  {
    id: "multi-brand",
    category: "MULTI-BRAND",
    title: "Multi-brand operations",
    description:
      "Standardize governed workflows across brands, business units, and markets.",
  },
  {
    id: "global",
    category: "GLOBAL",
    title: "Global approval chains",
    description:
      "Coordinate multi-stakeholder sign-off across regions and time zones with full audit.",
  },
  {
    id: "agency",
    category: "AGENCY",
    title: "Agency governance",
    description:
      "Extend controls and evidence to external partners without ceding oversight.",
  },
  {
    id: "scale",
    category: "SCALE",
    title: "Agentic execution at scale",
    description:
      "Deploy autonomous workflows with human accountability wired into every action.",
  },
];

export default function EnterpriseUseCasesSection() {
  return (
    <section className="relative min-h-[500px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-amber-500/80"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-400 uppercase">
            ENTERPRISE USE CASES
          </span>
        </div>

        {/* Main Section Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight text-white mb-14 leading-[1.15]">
          Where governed execution pays off.
        </h2>

        {/* 6 Cards Grid */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {useCases.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              className="group relative flex flex-col justify-start p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0A1422] transition-all duration-300 cursor-pointer backdrop-blur-sm min-h-[170px]"
            >
              {/* Category Tag */}
              <div className="text-[10px] font-mono font-bold text-amber-500/90 mb-3 tracking-[0.18em] uppercase">
                {card.category}
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
