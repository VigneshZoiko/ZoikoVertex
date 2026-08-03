"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, Mail } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function DataProcessingAddendumHero() {
  return (
    <section className="w-full bg-[#080E1A] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white border-b border-[#FFFFFF14]/80">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-6"
        >
          Data Processing Addendum
        </motion.h1>

        {/* Subtitle / Description */}
        <motion.p
          variants={itemVariants}
          className="text-[#FFFFFF66] font-normal leading-relaxed max-w-150 mb-12"
        >
          Enterprise data processing terms for accountable AI workflows. Review
          how ZoikoVertex structures customer data processing, subprocessors,
          security commitments, international transfer support, deletion and
          return, audit assistance, and privacy-rights cooperation for
          enterprise deployments.
        </motion.p>

        {/* Legal Metadata Strip */}
        <motion.div
          variants={itemVariants}
          className="w-full border-t border-b border-[#FFFFFF12] py-4 mb-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-xs text-[#64748B]"
        >
          {/* Document Reference */}
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider font-medium text-[#FFFFFF40] tracking-[1px]">
              DOCUMENT
            </span>
            <span className="text-[#FFFFFF8C] tracking-[1px] font-semibold">ZV-DPA-001</span>
          </div>

          <span className="hidden sm:inline text-[#FFFFFF14]">|</span>

          {/* Version */}
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider font-medium text-[#FFFFFF40] tracking-[1px]">
              VERSION
            </span>
            <span className="text-[#FFFFFF8C] tracking-[1px]">v1.0 • [TBC — legal review]</span>
          </div>

          <span className="hidden sm:inline text-[#FFFFFF14]">|</span>

          {/* Effective Date */}
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider font-medium text-[#FFFFFF40] tracking-[1px]">
              EFFECTIVE
            </span>
            <span className="text-[#FFFFFF8C] tracking-[1px]">[Date — TBC by legal]</span>
          </div>

          <span className="hidden lg:inline text-[#FFFFFF14]">|</span>

          {/* Legal Entity */}
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider font-medium text-[#FFFFFF40] tracking-[1px]">
              ENTITY
            </span>
            <span className="text-[#FFFFFF8C] tracking-[1px]">
              Zoiko Tech Inc. • Zoiko Group
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-4"
        >
          <button
            type="button"
            className="bg-[#20E7F2] hover:bg-[#1CD0DA] text-[#06090F] font-bold text-xs sm:text-sm px-10 py-3.5 rounded-full inline-flex items-center gap-2 transition-all duration-150 shadow-lg shadow-[#20E7F2]/10 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download DPA</span>
          </button>

          <button
            type="button"
            className="hover:bg-[#142036] border border-[#FFFFFF14] text-[#FFFFFF8C] font-medium text-xs sm:text-sm px-15 py-3.5 rounded-full inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-[#FFFFFF8C]" />
            <span>Contact Privacy & Security Team</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
