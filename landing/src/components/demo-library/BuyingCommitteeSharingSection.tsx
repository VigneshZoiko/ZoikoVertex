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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
  },
} as const;

export default function BuyingCommitteeSharingSection() {
  return (
    <section className="relative min-h-[420px] w-full bg-[#0B1524] text-white px-6 py-16 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Subtle Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-900/10 blur-[140px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Text Content */}
        <div className="lg:col-span-6 flex flex-col items-start">
          {/* Sub-heading Badge */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-4"
          >
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              BUYING COMMITTEE SHARING
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.15]"
          >
            Build a shortlist for your <br />
            committee.
          </motion.h2>

          {/* Body Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mb-8 font-normal"
          >
            Save the demos that make your case, then share them with
            procurement, security, and your executive sponsor — so everyone
            evaluates the same evidence.
          </motion.p>

          {/* Tip Line */}
          <motion.div
            variants={itemVariants}
            className="text-[11px] font-mono text-slate-500"
          >
            <span className="text-slate-400">Tip</span> · Use the bookmark on
            any demo card to add it here.
          </motion.div>
        </div>

        {/* Right Card Panel */}
        <motion.div className="lg:col-span-6 w-full" variants={cardVariants}>
          <div className="relative rounded-2xl border border-slate-800/80 bg-gradiant-to-r from-[#111D2E] to-[#0B1524] p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col justify-between min-h-[220px]">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-12">
              <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-slate-400 uppercase">
                YOUR DEMO SHORTLIST
              </span>
              <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                0 saved
              </span>
            </div>

            {/* Empty State Text */}
            <div className="text-center my-auto pb-10">
              <p className="text-xs font-mono text-slate-500 italic">
                No demos saved yet. Tap the bookmark on a demo to add it.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <button className="px-5 py-3 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                Email shortlist to committee
              </button>
              <button className="px-5 py-3 rounded-xl border border-slate-800 bg-[#0B1320] text-slate-200 font-semibold text-xs hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-200">
                Download demo guide
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
