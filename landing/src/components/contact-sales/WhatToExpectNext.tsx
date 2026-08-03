"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default function WhatToExpectNext() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#050B14] text-white py-20 px-6 sm:px-12 md:px-16 lg:px-24 min-h-screen flex flex-col justify-center font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase">
              AFTER YOU SUBMIT
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
            What to expect next.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl font-normal">
            No queue, no generic auto-reply — just the next concrete step.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start" // items-start prevents cards from stretching to the same height
        >
          {/* Card 1: Reviewed, then routed */}
          <motion.div
            variants={itemVariants}
            className="bg-[#0A1526] border border-[#25395C] rounded-lg p-7 flex flex-col justify-between hover:border-[#334155] transition-colors duration-300 md:col-span-1"
          >
            <div>
              <h3 className="text-lg font-medium text-white mb-6">
                Reviewed, then routed
              </h3>

              <div className="space-y-6">
                {/* Item 1 */}
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-[#2DD4BF] mt-1 shrink-0" />
                  <p className="text-[#94A3B8] text-sm leading-relaxed">
                    A specialist reviews your request and matches it to the right team — sales, governance, or value engineering.
                  </p>
                </div>

                <div className="h-[1px] bg-[#1E293B]/60 w-full" />

                {/* Item 2 */}
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-[#2DD4BF] mt-1 shrink-0" />
                  <p className="text-[#94A3B8] text-sm leading-relaxed">
                    High-priority requests (1,000+ employees, 0–30 day timeline) get a calendar link on the confirmation screen.
                  </p>
                </div>

                <div className="h-[1px] bg-[#1E293B]/60 w-full" />

                {/* Item 3 */}
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-[#2DD4BF] mt-1 shrink-0" />
                  <p className="text-[#94A3B8] text-sm leading-relaxed">
                    Everyone else hears back with a proposed time within one business day.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Governed from first contact */}
          <motion.div
            variants={itemVariants}
            className="bg-[#0A1526] border border-[#25395C] rounded-lg p-7 flex flex-col justify-between hover:border-[#334155] transition-colors duration-300 md:col-span-1"
          >
            <div>
              <h3 className="text-lg font-medium text-white mb-6">
                Governed from first contact
              </h3>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1.5 border border-[#1E293B] bg-[#070B12]/40 rounded text-[11px] font-mono tracking-wider text-[#CBD5E1] uppercase">
                  SOC 2 TYPE II
                </span>
                <span className="px-3 py-1.5 border border-[#1E293B] bg-[#070B12]/40 rounded text-[11px] font-mono tracking-wider text-[#CBD5E1] uppercase">
                  ISO 27001
                </span>
                <span className="px-3 py-1.5 border border-[#1E293B] bg-[#070B12]/40 rounded text-[11px] font-mono tracking-wider text-[#CBD5E1] uppercase">
                  GDPR
                </span>
                <span className="px-3 py-1.5 border border-[#1E293B] bg-[#070B12]/40 rounded text-[11px] font-mono tracking-wider text-[#CBD5E1] uppercase">
                  AUDIT-READY
                </span>
                <span className="px-3 py-1.5 border border-[#1E293B] bg-[#070B12]/40 rounded text-[11px] font-mono tracking-wider text-[#CBD5E1] uppercase">
                  RESPONSIBLE AI
                </span>
              </div>

              {/* Warning Text */}
              <div className="flex items-start gap-2.5 pt-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  Do not submit passwords, access tokens, or regulated personal data through the form above.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Prefer to read first? */}
          <motion.div
            variants={itemVariants}
            className="bg-[#0A1526] border border-[#25395C] rounded-lg p-7 flex flex-col justify-between hover:border-[#334155] transition-colors duration-300 md:col-span-1"
          >
            <div>
              <h3 className="text-lg font-medium text-white mb-6">
                Prefer to read first?
              </h3>

              <div className="space-y-4">
                {/* Link 1 */}
                <div className="pb-4 border-b border-[#1E293B]/60">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors duration-200 text-sm group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] group-hover:scale-125 transition-transform" />
                    <span className="underline underline-offset-4 decoration-[#334155] group-hover:decoration-white">
                      Compliance & Governance
                    </span>
                  </a>
                </div>

                {/* Link 2 */}
                <div className="pb-4 border-b border-[#1E293B]/60">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors duration-200 text-sm group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] group-hover:scale-125 transition-transform" />
                    <span className="underline underline-offset-4 decoration-[#334155] group-hover:decoration-white">
                      Data Processing Addendum
                    </span>
                  </a>
                </div>

                {/* Link 3 */}
                <div className="pt-1">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors duration-200 text-sm group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] group-hover:scale-125 transition-transform" />
                    <span className="underline underline-offset-4 decoration-[#334155] group-hover:decoration-white">
                      Security whitepaper
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}