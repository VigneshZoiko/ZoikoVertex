"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Database,
  Scale,
  SlidersHorizontal,
  Diamond,
  Clock,
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

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface FeatureItem {
  id: string;
  title: string;
  icon: React.ElementType;
  isFilledDiamond?: boolean;
}

const features: FeatureItem[] = [
  {
    id: "evidence-layer",
    title: "Evidence Layer",
    icon: Database,
  },
  {
    id: "decision-ledger",
    title: "Decision Ledger",
    icon: Scale,
  },
  {
    id: "approval-controls",
    title: "Approval Controls",
    icon: SlidersHorizontal,
  },
  {
    id: "audit-trail",
    title: "Audit Trail",
    icon: Diamond,
    isFilledDiamond: true,
  },
  {
    id: "responsible-ai",
    title: "Responsible AI",
    icon: Diamond,
  },
  {
    id: "data-retention",
    title: "Data Retention",
    icon: Clock,
  },
];

export default function ProofInEveryDemoSection() {
  return (
    <section className="relative min-h-[480px] w-full bg-[#040812] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C59B6C]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Sub-heading */}
        <div className="flex items-center gap-3 mb-5">
          <span className="w-5 h-[2px] bg-[#C59B6C]"></span>
          <span className="text-[11px] font-mono font-semibold tracking-[0.25em] text-[#C59B6C] uppercase">
            PROOF IN EVERY DEMO
          </span>
        </div>

        {/* Main Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.02em] text-white mb-5 leading-tight">
          Governance you can see, not just claim.
        </h2>

        {/* Body Paragraph */}
        <p className="text-[#98A2B3] text-xs sm:text-sm font-normal max-w-xl mb-14 leading-relaxed">
          Every demo runs on synthetic data and shows the controls enterprise{" "}
          <br className="hidden sm:inline" />
          reviewers ask about.
        </p>

        {/* Features Row Container */}
        <motion.div
          className="w-full rounded-2xl border border-[#1A2635] bg-[#070E18]/60 backdrop-blur-md grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-[#1A2635] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className="group relative flex flex-col items-center justify-center py-8 px-4 hover:bg-[#0C1726]/80 transition-all duration-300 cursor-pointer"
              >
                {/* Icon Container */}
                <div className="mb-4 text-[#C59B6C] transition-transform duration-300 group-hover:scale-110">
                  <Icon
                    className={`w-5 h-5 ${
                      item.isFilledDiamond ? "fill-[#C59B6C]" : "stroke-[1.75]"
                    }`}
                  />
                </div>

                {/* Title */}
                <span className="text-xs font-semibold text-slate-200 tracking-tight group-hover:text-[#C59B6C] transition-colors">
                  {item.title}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
