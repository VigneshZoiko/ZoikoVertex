"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Calculator, Calendar, Download } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoBusinessCaseCtaSection() {
  return (
    <section
      className="relative w-full min-h-[520px] md:min-h-[600px] flex items-center justify-center py-20 px-6 font-sans text-white overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/images/roi-engine/cta.png')` }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="relative z-10 max-w-3xl mx-auto text-center space-y-8"
      >
        {/* Eyebrow Label */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2"
        >
          <span className="h-px w-6 bg-[#20E7F2]" />
          <span className="text-xs font-mono tracking-widest text-[#20E7F2] uppercase">
            ROI ENGINE · ZOIKOVERTEX
          </span>
          <span className="h-px w-6 bg-[#20E7F2]" />
        </motion.div>

        {/* Main Heading */}
        <motion.h2
          variants={itemVariants}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none"
        >
          Build your ZoikoVertex <br className="hidden sm:inline" />
          <span className="text-[#20E7F2]">business case.</span>
        </motion.h2>

        {/* Subtitle Description */}
        <motion.p
          variants={itemVariants}
          className="text-xs sm:text-sm lg:text-base leading-relaxed text-[#FFFFFF6B] max-w-lg mx-auto font-normal"
        >
          Prove the value of governed agentic execution across productivity,
          speed, approval efficiency, governance evidence, and executive
          oversight — before procurement asks for justification.
        </motion.p>

        {/* Action Buttons Row */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          {/* Primary Cyan CTA 1 */}
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#0b121e] font-semibold text-xs sm:text-sm hover:bg-[#1cd4de] transition-colors shadow-lg shadow-[#20E7F2]/20">
            <Calculator className="w-4 h-4" />
            Calculate ROI
          </button>

          {/* Primary Cyan CTA 2 */}
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#0b121e] font-semibold text-xs sm:text-sm hover:bg-[#1cd4de] transition-colors shadow-lg shadow-[#20E7F2]/20">
            <Calendar className="w-4 h-4" />
            Book ROI walkthrough
          </button>

          {/* Secondary Outline CTA */}
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-medium text-xs sm:text-sm hover:bg-white/10 transition-colors backdrop-blur-sm">
            <Download className="w-4 h-4 text-[#ffffff80]" />
            Download sample report
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
