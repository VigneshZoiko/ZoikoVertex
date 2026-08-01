"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Calendar,
  Layers,
  Search,
  UserCheck,
  TrendingUp,
} from "lucide-react";

interface MarketPill {
  label: string;
  marketSize: string;
}

interface JumpLink {
  label: string;
  href: string;
  icon: React.ElementType;
}

const marketPills: MarketPill[] = [
  { label: "Project tools", marketSize: "$6.8B market" },
  { label: "Workflow automation", marketSize: "$13.2B market" },
  { label: "BI & analytics", marketSize: "$29.4B market" },
  { label: "AI copilots", marketSize: "$4.1B market" },
];

const jumpLinks: JumpLink[] = [
  { label: "Benchmark matrix", href: "#benchmark-matrix", icon: LayoutGrid },
  { label: "Deep-dives", href: "#deep-dives", icon: Layers },
  { label: "Buyer selector", href: "#buyer-selector", icon: UserCheck },
  { label: "ROI audit", href: "#roi-audit", icon: TrendingUp },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
} as const;

export default function CompetitorBenchmarkHero() {
  return (
    <section className="relative w-full min-h-[85vh] bg-[#0B0F17] font-sans text-white flex flex-col justify-center overflow-hidden py-20 px-4 sm:px-8 md:px-12 lg:px-24">
      {/* Background Image Container with Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <Image
          src="/images/competeter-benchmark/hero.png"
          alt="Competitor Benchmark Background"
          fill
          priority
          className="object-cover object-center opacity-40 mix-blend-luminosity"
        />
        {/* Dark Vignette Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#090D16]/95 via-[#090D16]/80 to-[#090D16]/60" />
      </div>

      {/* Hero Content Area */}
      <motion.div
        className="relative z-10 max-w-6xl w-full mx-auto flex flex-col items-start"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-[54px] max-w-160 font-bold tracking-tight text-white leading-[1.12] mb-6 max-w-4xl"
        >
          Compare ZoikoVertex against the tools enterprises use to manage{" "}
          <span className="text-[#20E7F2]">
            AI, workflows, approvals, and execution.
          </span>
        </motion.h1>

        {/* Subtitle Body Text */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-base text-[#FFFFFF80] max-w-xl leading-relaxed mb-8 font-normal"
        >
          Most tools manage tasks, automate steps, or generate content.
          ZoikoVertex governs agentic execution from instruction to approval,
          evidence, auditability, ROI, and executive control.
        </motion.p>

        {/* Cyan Quote Box */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-2xl bg-[#20E7F20F] border border-[#20E7F2] border-l-4 border-l-[#20E7F2] rounded-lg p-4 sm:p-5 mb-8 backdrop-blur-sm"
        >
          <p className="font-mono text-xs sm:text-[13px] text-[#20E7F2] leading-relaxed">
            &quot;The comparison is not between one dashboard and another. It is
            between fragmented AI activity and governed agentic execution.&quot;
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-4 mb-12"
        >
          <a
            href="#platform"
            className="inline-flex  rounded-full items-center gap-2 bg-[#20E7F2] hover:bg-[#00BFA3] text-[#090D16] font-mono text-xs sm:text-sm font-semibold tracking-wide px-5 py-3 rounded transition-colors duration-200"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>View the platform</span>
          </a>

          <a
            href="#benchmark"
            className="inline-flex rounded-full items-center gap-2 hover:bg-[#1E293B] text-white border border-slate-700 font-mono text-xs sm:text-sm font-medium tracking-wide px-5 py-3 rounded transition-colors duration-200 backdrop-blur-sm"
          >
            <Calendar className="w-4 h-4 text-[#94A3B8]" />
            <span>Book a benchmark walkthrough</span>
          </a>
        </motion.div>

        {/* Market Category Pills */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8"
        >
          {marketPills.map((pill) => (
            <div
              key={pill.label}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 tracking-[1px] font-mono text-[11px] sm:text-xs text-[#FFFFFF42] backdrop-blur-sm"
            >
              <span>{pill.label}</span>
              <span className="text-[#64748B]">•</span>
              <span className="bg-[#FFFFFF0E] text-slate-300 px-2 py-0.5 rounded-full border border-[#FFFFFF1A]">
                {pill.marketSize}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Jump To Navigation Bar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <span className="font-mono text-[11px] tracking-[1px] uppercase text-[#FFFFFF42] font-medium mr-1">
            JUMP TO:
          </span>
          {jumpLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 bg-[#FFFFFF0E] hover:bg-[#1E293B] border border-[#FFFFFF1A] rounded-full px-3 py-1.5 font-mono text-[11px] text-[#FFFFFF85] hover:text-white transition-all duration-150 backdrop-blur-sm"
              >
                <Icon className="w-3.5 h-3.5 text-[#FFFFFF85]" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
