"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 },
  },
} as const;

export default function ExecutiveOverviewSection() {
  const tags = ["Governance", "Productivity", "ROI", "Compliance", "Speed"];

  return (
    <section className="relative w-full bg-[#0B1524] text-white px-6 py-16 md:px-16 lg:px-24 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#0A1A2A]/20 blur-[150px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Area */}
        <div className="max-w-3xl mb-16 lg:mb-20">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-5 h-[2px] bg-[#C59B6C]"></span>
            <span className="text-[11px] font-mono font-semibold tracking-[0.25em] text-[#C59B6C] uppercase">
              FEATURED · EXECUTIVE OVERVIEW
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-[40px] sm:text-[48px] lg:text-[56px] font-bold tracking-[-0.03em] text-white leading-[1.05] mb-6"
          >
            Five minutes to the whole story.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-[#98A2B3] max-w-xl text-sm sm:text-base leading-[1.6] max-w-2xl font-normal"
          >
            The fastest way to understand how governed AI execution turns into
            measurable enterprise outcomes.
          </motion.p>
        </div>

        {/* Console Card */}
        <motion.div
          className="relative rounded-3xl border border-[#1A2635] bg-gradient-to-b from-[#111D2E] to-[#0B1524]  p-6 md:p-8 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.6)] backdrop-blur-sm"
          variants={cardVariants}
        >
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
            {/* Video Preview Side */}
            <div className="relative aspect-[1.5] w-full rounded-2xl bg-[#050A17] bg-radial from-[#20E7F21F] to-[#20E7F200] border border-[#1A2635] flex items-center justify-center p-6 overflow-hidden group cursor-pointer">
              {/* Internal Glow */}
              <div className="absolute inset-0 bg-radial from-[#134358]/20 via-transparent to-transparent opacity-80" />

              {/* Play Button */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-[#00E5FF]/20 border-2 border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_40px_rgba(0,229,255,0.25)] transition-transform duration-300 group-hover:scale-105">
                <div className="w-[60px] h-[60px] rounded-full bg-[#00E5FF] flex items-center justify-center text-[#050A12] shadow-inner pl-1">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              </div>

              {/* Synthetic Data Label */}
              <div className="absolute bottom-5 left-6 px-3 py-1.5 rounded-md border border-[#C59B6C]/30 text-[11px] font-mono text-[#C59B6C]/90 bg-[#16120E]/50">
                Synthetic data
              </div>

              {/* Time Label */}
              <div className="absolute bottom-5 right-6 text-[11px] font-mono text-[#667085]">
                5:00
              </div>
            </div>

            {/* Content & Controls Side */}
            <div className="flex flex-col lg:pt-2">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[11px] font-mono font-semibold tracking-[0.25em] text-[#C59B6C] uppercase">
                  ZOIKOVERTEX EXECUTIVE OVERVIEW
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-5 leading-tight">
                Governed AI execution, from agent to evidence.
              </h2>

              <p className="text-[#98A2B3] text-sm sm:text-[15px] leading-[1.6] mb-8 font-normal max-w-md">
                See agents act within policy, approvals captured with evidence,
                ROI and risk surfaced to leadership — the governed execution
                advantage in one pass.
              </p>

              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-2.5 mb-10">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3 py-1.5 rounded-[6px] border text-[11px] font-mono font-medium tracking-tight ${
                      tag === "Governance"
                        ? "border-[#C59B6C]/30 text-[#C59B6C] bg-[#16120E]"
                        : "border-[#1A2635] text-[#00E5FF] bg-[#0A1A2A]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-auto">
                <button className="px-7 py-3 rounded-xl bg-[#00E5FF] text-[#050A12] font-bold text-sm hover:bg-[#00D0E6] transition-all duration-200 shadow-[0_4px_30px_rgba(0,229,255,0.3)] hover:shadow-[0_6px_35px_rgba(0,229,255,0.4)]">
                  Watch overview
                </button>
                <button className="px-7 py-3 rounded-xl border border-[#1A2635] text-white font-semibold text-sm hover:bg-[#142131] hover:border-[#2C3F54] transition-all duration-200">
                  Book a live demo
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
