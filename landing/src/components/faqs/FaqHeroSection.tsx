"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

const featurePills = [
  "Governed AI workflows",
  "Human approvals",
  "Audit-ready evidence",
  "Enterprise integrations",
  "Privacy-aware retention",
] as const;

export default function FaqHeroSection() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative w-full bg-[#030711] text-white px-6 py-24 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-cyan-950/20 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-teal-900/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-[1000px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <span className="w-4 h-[2px] bg-cyan-400"></span>
          <span className="text-[11px] font-mono font-semibold tracking-[0.25em] text-cyan-400 uppercase">
            FAQS &bull; ENTERPRISE AI GOVERNANCE QUESTIONS
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-[56px] max-w-180 font-bold tracking-tight text-white mb-6 leading-[1.12] max-w-4xl"
        >
          Questions about governed agentic AI, approvals, auditability, and ROI
          &mdash; answered.
        </motion.h1>

        {/* Subtitle / Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#B9C2D0] text-xs sm:text-sm font-normal leading-relaxed max-w-120 mb-10"
        >
          How ZoikoVertex works, what it stores, how governance is enforced, how
          teams approve AI-assisted work, how evidence is retained, and how
          enterprise buyers evaluate ROI.
        </motion.p>

        {/* Search Input Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-[620px] mb-8"
        >
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#6B7B93] group-focus-within:text-cyan-400 transition-colors">
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, feature, integration, compliance question, or role..."
              className="w-full bg-[#0A1526] border border-[#25395C] rounded-full pl-12 pr-6 py-3.5 text-xs sm:text-sm text-[#6B7B93] placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all backdrop-blur-md shadow-[0_10px_25px_rgba(0,0,0,0.3)]"
            />
          </div>
        </motion.div>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-14"
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00E5FF] text-slate-950 font-mono font-bold text-xs tracking-[1px] hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-[0.98]"
          >
            <span>Book a Demo</span>
            <span>&rarr;</span>
          </a>
        </motion.div>

        {/* Divider and Feature Tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-full pt-8 border-t border-slate-800/60 flex flex-col items-center"
        >
          <div className="flex flex-wrap justify-center items-center max-w-2xl tracking-[1px] gap-x-6 gap-y-3 text-xs font-mono text-slate-400">
            {featurePills.map((pill, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="hover:text-slate-200 transition-colors cursor-default">
                  {pill}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
