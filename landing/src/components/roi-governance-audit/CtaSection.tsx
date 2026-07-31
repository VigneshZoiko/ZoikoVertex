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

export default function CtaSection() {
  return (
    <section className="relative min-h-[580px] w-full bg-[#08101F] bg-gradient-to-b from-[#20E7F224] to-[#20E7F200] text-white px-6 py-24 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-cyan-950/20 blur-[180px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1000px] w-full z-10 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow Label */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 mb-6"
        >
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            ZOIKOVERTEX &nbsp;•&nbsp; ROI &amp; GOVERNANCE AUDIT
          </span>
          <span className="w-4 h-[2px] bg-cyan-400"></span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold tracking-tight text-white mb-6 leading-[1.1]"
        >
          Turn a product claim into a <br className="hidden sm:inline" />
          business case.
        </motion.h1>

        {/* Subtitle Paragraph */}
        <motion.p
          variants={itemVariants}
          className="text-slate-400 text-xs sm:text-sm md:text-base font-normal leading-relaxed max-w-xl mb-12"
        >
          Quantify value, expose governance gaps, and hand procurement a{" "}
          <br className="hidden sm:inline" />
          defensible packet &mdash; in minutes.
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto"
        >
          <button className="px-7 py-4 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#00cce6] transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98] w-full sm:w-auto">
            Run ROI &amp; Governance Audit
          </button>

          <button className="px-7 py-4 rounded-xl bg-[#070E18] text-slate-200 border border-slate-800 font-semibold text-xs sm:text-sm hover:bg-[#0A1422] hover:border-slate-700 transition-all duration-200 active:scale-[0.98] w-full sm:w-auto">
            Book Enterprise Demo
          </button>

          <button className="px-7 py-4 rounded-xl bg-[#D4A359] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#E2B46C] transition-all duration-200 shadow-[0_0_25px_rgba(212,163,89,0.25)] active:scale-[0.98] w-full sm:w-auto">
            Request Procurement Pack
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
