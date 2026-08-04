"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, Workflow, Check } from "lucide-react";

export default function MarOpsCallToActionSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  return (
    <section className="relative w-full min-h-[520px] sm:min-h-[600px] flex items-center justify-center bg-[#080C10] text-white overflow-hidden py-20 px-6 sm:px-10 lg:px-16">
      {/* Background Office Image with Dark Overlay Vignette */}
      <img
        src="/images/marketing-ops/cta.png"
        alt="Marketing operations office background"
        className="absolute inset-0 w-full h-full object-cover object-center brightness-75 contrast-125 opacity-30"
      />
      <div className="absolute inset-0 bg-[#080C10]/85 z-[1]" />
      {/* <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-transparent to-[#080C10] z-[1]" /> */}

      {/* Main Content Container */}
      <motion.div
        className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Monospace Subtitle Tag */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <span className="w-3 h-[2px] bg-[#00E5FF]" />
          <span className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-mono text-[#00E5FF]">
            MARKETING OPS TEAMS • ZOIKOVERTEX
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl sm:text-4xl lg:text-[48px] font-bold tracking-tight leading-[1.12] mb-5 text-white max-w-xl"
        >
          Govern the entire marketing operation.{" "}
          <span className="text-[#00E5FF] block sm:inline">
            Measure every outcome.
          </span>
        </motion.h2>

        {/* Subparagraph Description */}
        <motion.p
          variants={itemVariants}
          className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal max-w-120 mb-8"
        >
          ZoikoVertex gives marketing operations teams the governed AI execution
          platform that replaces coordination overhead with structured
          workflows, accountable approvals, and measurable performance.
        </motion.p>

        {/* Action / Feature Badges Group */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full"
        >
          {/* Primary CTA Button */}
          <a
            href="#request-demo"
            className="inline-flex items-center gap-2 bg-[#00E5FF] text-[#080C10] text-xs font-bold px-6 py-3 rounded-full hover:bg-[#00E5FF]/90 transition-all duration-200 shadow-lg shadow-[#00E5FF]/20"
          >
            <Calendar className="w-4 h-4 fill-[#080C10]" />
            <span>Request Demo</span>
          </a>

          {/* Secondary Outline Pill Badge 1 */}
          <button className="inline-flex items-center gap-2 hover:bg-[#FFFFFF1A] border border-white/10 px-5 py-3 rounded-full text-xs text-white font-medium backdrop-blur-sm">
            <Workflow className="w-4 h-4 text-gray-400" />
            <span>AI Workflow Orchestration</span>
          </button>

          {/* Secondary Outline Pill Badge 2 */}
          <button className="inline-flex items-center gap-2 hover:bg-[#FFFFFF1A] border border-white/10 px-5 py-3 rounded-full text-xs text-white font-medium backdrop-blur-sm">
            <Check className="w-4 h-4 text-gray-400" />
            <span>Approval Workflows</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
