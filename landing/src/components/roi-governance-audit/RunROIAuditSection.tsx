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
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
  },
} as const;

export default function RunROIAuditSection() {
  return (
    <section className="relative min-h-[600px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-950/20 blur-[170px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10 flex flex-col items-start"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow Label */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 mb-4"
        >
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            INTERACTIVE DIAGNOSTIC · 6 STEPS
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h2
          variants={itemVariants}
          className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-white mb-5 leading-[1.12]"
        >
          Run the ROI &amp; Governance Audit.
        </motion.h2>

        {/* Subtitle / Paragraph */}
        <motion.p
          variants={itemVariants}
          className="text-[#8B97A6] text-sm leading-relaxed max-w-xl mb-12 font-normal"
        >
          An executive diagnostic, not a form. Answer five short input sets and
          watch your business case build in real time. Nothing is submitted
          until you choose to generate the report.
        </motion.p>

        {/* Main Illustration Image Box */}
        <motion.div
          className="w-full flex justify-center"
          variants={graphicVariants}
        >
          <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <Image
              src="/images/roi-governance-audit/roi.png"
              alt="Interactive Diagnostic - Run the ROI & Governance Audit Illustration"
              width={1132}
              height={570}
              className="w-full h-auto object-cover block"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
