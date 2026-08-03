"use client";

import React from "react";
import { motion } from "framer-motion";

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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

export default function ProveItCallToActionSection() {
  return (
    <section className="relative min-h-[460px] w-full bg-[#08101F] bg-radial from-[#20E7F224] to-[#20E7F200] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Subtle Radial Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-950/20 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[960px] w-full z-10 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top Eyebrow Tag */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 mb-5"
        >
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            2026 OVERVIEW DEMO LIBRARY
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h2
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
        >
          Prove it before the sales <br className="hidden sm:inline" />
          call.
        </motion.h2>

        {/* Subtitle / Description */}
        <motion.p
          variants={itemVariants}
          className="text-slate-400 text-xs sm:text-sm font-normal max-w-xl mb-10 leading-relaxed"
        >
          Self-educate, qualify your need, understand the governance advantage —{" "}
          <br className="hidden md:inline" />
          then book a live demo or run an ROI &amp; Governance Audit.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 w-full"
        >
          {/* Primary Cyan CTA */}
          <button className="px-6 py-3.5 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98]">
            Book a Live Enterprise Demo
          </button>

          {/* Secondary Gold CTA */}
          <button className="px-6 py-3.5 rounded-xl bg-[#D4A359] text-slate-950 font-bold text-xs hover:bg-[#E2B46C] transition-all duration-200 shadow-[0_0_20px_rgba(212,163,89,0.25)] active:scale-[0.98]">
            Request ROI &amp; Governance Audit
          </button>

          {/* Outline CTA */}
          <button className="px-6 py-3.5 rounded-xl border border-[#7AA0BE42] text-slate-200 font-semibold text-xs hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-200 active:scale-[0.98] backdrop-blur-sm">
            Browse Product Demos
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
