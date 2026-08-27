"use client";

import React from "react";
import Image from "next/image";
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

const graphicVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
  },
} as const;

export default function ROIAuditHeroSection() {
  return (
    <section className="relative min-h-[540px] w-full bg-[#030711] text-white px-6 py-16 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-900/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-[500px] h-[300px] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Hero Content */}
        <div className="lg:col-span-6 flex flex-col items-start">
          {/* Eyebrow Label */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              ROI &amp; GOVERNANCE AUDIT · AGENTIC EXECUTION
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-white mb-6 leading-[1.12]"
          >
            Calculate the ROI of <br />
            <span className="text-cyan-400">
              governed agentic <br />
              execution.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mb-8 font-normal"
          >
            Estimate time savings, approval velocity, risk reduction, governance
            maturity, and evidence readiness before deploying autonomous AI
            workflows across your enterprise.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4"
          >
            <button className="px-6 py-3.5 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98]">
              Run ROI &amp; Governance Audit
            </button>
            <button className="px-6 py-3.5 rounded-xl border border-slate-800/90 bg-[#070E18]/80 text-slate-200 font-semibold text-xs hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-200 active:scale-[0.98] backdrop-blur-sm">
              Book Enterprise Demo
            </button>
          </motion.div>
        </div>

        {/* Right Graphic Panel */}
        <motion.div
          className="lg:col-span-6 w-full flex justify-center lg:justify-end"
          variants={graphicVariants}
        >
          <div className="relative w-full max-w-[560px] rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
            <Image
              src="/images/roi-governance-audit/hero.png"
              alt="ROI Governance Audit Illustration"
              width={516}
              height={389}
              className="w-full h-auto object-cover block"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
