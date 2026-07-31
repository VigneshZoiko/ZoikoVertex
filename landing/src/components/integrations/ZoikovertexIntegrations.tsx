"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const buttonGroupVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function ZoikovertexIntegrations() {
  return (
    <section
     className="relative w-full bg-[#08101F] bg-radial from-[#20E7F224] to-[#20E7F200] text-[#8E9B9E] font-sans antialiased px-6 py-20 md:px-12 md:py-32 lg:px-16 lg:py-40 flex items-center justify-center overflow-hidden">
      <div className="max-w-[900px] w-full text-center space-y-8 z-10">
        {/* Header Block */}
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
        >
          {/* Subheading Badge */}
          <div className="flex items-center justify-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block -translate-y-[1px]" />
            <span>ZOIKOVERTEX INTEGRATIONS</span>
          </div>

          {/* Main Hero Title */}
          <h1 className="text-[36px] leading-[1.12] sm:text-[48px] md:text-[56px] font-bold text-white tracking-[-0.03em] max-w-3xl mx-auto">
            Bring your execution stack into a governed AI workflow layer.
          </h1>

          {/* Subtitle Paragraph */}
          <p className="text-[14px] sm:text-[15px] leading-[1.6] text-slate-400 font-normal max-w-2xl mx-auto pt-1">
            Connect your marketing, social, CRM, content, data, and governance
            systems through controlled, auditable, AI-powered execution
            infrastructure.
          </p>
        </motion.div>

        {/* CTA Buttons Row */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          initial="hidden"
          animate="visible"
          variants={buttonGroupVariants}
        >
          {/* Primary Cyan Button */}
          <motion.a
            href="#"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#00F3FF] text-[#03060C] font-semibold text-[13px] tracking-tight hover:bg-[#33F6FF] shadow-[0_0_25px_rgba(0,243,255,0.25)] transition-all text-center"
          >
            Book Integration Demo
          </motion.a>

          {/* Secondary Gold/Amber Button */}
          <motion.a
            href="#"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#D9A755] text-[#03060C] font-semibold text-[13px] tracking-tight hover:bg-[#E5B667] transition-all text-center"
          >
            Get Stack Assessment
          </motion.a>

          {/* Dark Bordered Button */}
          <motion.a
            href="#"
            whileHover={{
              scale: 1.02,
              borderColor: "rgba(255, 255, 255, 0.25)",
            }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-6 py-3 rounded-lg border border-[#7AA0BE42] text-white font-medium text-[13px] tracking-tight hover:bg-[#0E1726] transition-all text-center"
          >
            View API Documentation
          </motion.a>
        </motion.div>
      </div>

      {/* Subtle Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#00F3FF]/[0.025] blur-[100px] pointer-events-none rounded-full" />
    </section>
  );
}
