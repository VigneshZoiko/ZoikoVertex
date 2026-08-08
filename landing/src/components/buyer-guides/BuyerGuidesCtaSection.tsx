"use client";

import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

export default function BuyerGuidesCtaSection() {
  return (
    <section className="relative min-h-[500px] w-full bg-[#08101F] text-white px-6 py-24 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-cyan-950/20 blur-[180px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1000px] w-full  z-10 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow Label */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            ZOIKOVERTEX BUYER GUIDES
          </span>
          <span className="w-4 h-[2px] bg-cyan-400"></span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-[52px] font-bold tracking-tight text-white mb-6 leading-[1.12] max-w-xl">
          Turn research into enterprise buying confidence.
        </h2>

        {/* Subtitle / Description */}
        <p className="text-slate-400 text-xs sm:text-sm md:text-base font-normal leading-relaxed mb-10 max-w-xl">
          Educate your committee, prove the ROI, pass procurement &mdash; then
          talk to our team when you&apos;re ready.
        </p>

        {/* CTA Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {/* Primary Cyan Button */}
          <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#20E7F2] to-[#00C8F0] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#00cce6] transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98] cursor-pointer">
            Download the Enterprise Buyer Guide
          </button>

          {/* Secondary Amber Button */}
          <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#E8B768] to-[#C8954A] text-slate-950 font-bold text-xs sm:text-sm hover:bg-amber-400 transition-all duration-200 shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98] cursor-pointer">
            Run ROI &amp; Governance Audit
          </button>

          {/* Outline Dark Button */}
          <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#070E18]/80 border border-slate-800 text-slate-200 font-bold text-xs sm:text-sm hover:bg-[#131C2B] hover:border-slate-700 transition-all duration-200 active:scale-[0.98] cursor-pointer">
            Request a Guided Evaluation
          </button>
        </div>
      </motion.div>
    </section>
  );
}
