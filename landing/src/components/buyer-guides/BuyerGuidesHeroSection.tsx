"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

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

const badges = [
  "Governed autonomy",
  "Approval control",
  "Audit trails",
  "Evidence vault",
  "Integrations",
];

export default function BuyerGuidesHeroSection() {
  return (
    <section className="relative min-h-[640px] w-full bg-gradient-to-r from-[#050A17] to-[#08101F] text-white px-6 py-20 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-cyan-950/20 blur-[180px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1280px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Content Column */}
        <div className="lg:col-span-7 flex flex-col items-start">
          {/* Eyebrow Label */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              BUYER GUIDES FOR GOVERNED AGENTIC AI
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-[52px] max-w-120 font-bold tracking-tight text-white mb-6 leading-[1.1]"
          >
            Buy agentic AI with <br />
            governance, ROI, and <span className="text-[#00E5FF]">executive</span> <br />
            <span className="text-[#00E5FF]">confidence.</span>
          </motion.h1>

          {/* Subtitle Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-[#C3CCD6] text-xs sm:text-sm md:text-base font-normal leading-relaxed max-w-120 mb-10"
          >
            Practical guides for evaluating AI workflow orchestration, approval
            workflows, auditability, governance controls, integrations, and
            business-case ROI before you select an enterprise platform.
          </motion.p>

          {/* Call to Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-12"
          >
            <button className="px-7 py-4 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#00cce6] transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98] w-full sm:w-auto">
              Download the Enterprise Buyer Guide
            </button>

            <button className="px-7 py-4 rounded-xl bg-[#070E18] text-slate-200 border border-slate-800 font-semibold text-xs sm:text-sm hover:bg-[#0A1422] hover:border-slate-700 transition-all duration-200 active:scale-[0.98] w-full sm:w-auto">
              Request a Guided Evaluation
            </button>
          </motion.div>

          {/* Footer Badges */}
          <motion.div
            variants={itemVariants}
            className="w-full pt-6 border-t border-slate-800/80"
          >
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-500 uppercase block mb-3">
              BUILT FOR EXECUTIVE VISIBILITY &amp; ENTERPRISE PROCUREMENT
            </span>
            <div className="flex flex-wrap items-center gap-2 max-w-xl">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-lg bg-[#070E18]/80 border border-slate-800/80 text-slate-400 text-xs font-medium"
                >
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Illustration Column */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 flex items-center justify-center relative"
        >
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/12] rounded-2xl overflow-hidden backdrop-blur-md flex items-center justify-center p-4">
            <Image
              src="/images/buyer-guides/hero.png"
              alt="Governed Agentic AI Buyer Guides Illustration"
              fill
              className="object-contain p-4"
              priority
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
