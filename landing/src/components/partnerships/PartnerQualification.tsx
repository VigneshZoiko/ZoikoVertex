"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X, CheckCircle2, XCircle } from "lucide-react";

interface SignalItem {
  text: string;
}

const strongSignals: SignalItem[] = [
  { text: "Genuine enterprise delivery or market access capability" },
  { text: "Security and compliance maturity — documented posture available" },
  {
    text: "Existing enterprise customer base with relevant workflow or governance demand",
  },
  { text: "Alignment with responsible AI standards and approved messaging" },
  {
    text: "Commercial conduct that reflects enterprise trust and legal readiness",
  },
  {
    text: "For integration partners: documented API, webhook support, test environment",
  },
  {
    text: "For implementation partners: customer success team and change management capability",
  },
  {
    text: "Appetite for long-term partner investment — certification, QBRs, co-sell",
  },
];

const weakSignals: SignalItem[] = [
  { text: "Consumer, SMB-only, or micro-business focused organizations" },
  { text: "No verifiable enterprise customer base or deployment experience" },
  {
    text: "Unresolved compliance, legal, or regulatory issues in operating markets",
  },
  {
    text: "Seeking public certification, logo, or co-marketing before qualification",
  },
  { text: "Misrepresentation of ZoikoVertex as uncontrolled AI automation" },
  {
    text: "Integration partners without documented API, sandbox, or support SLA",
  },
  {
    text: "No capacity for security review, DPA execution, or compliance obligations",
  },
  {
    text: "Sanctioned jurisdictions or organizations flagged by anti-corruption screening",
  },
];

export default function PartnerQualification() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  } as const;

  const cardVariants = {
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
    <section className="w-full bg-[#0C1422] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNER QUALIFICATION
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Strong fit signals we look for. <br className="hidden sm:inline" />
            Weak signals we filter out.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            The partner program is selective. These are the criteria the
            alliances team uses to evaluate applications — before a
            qualification call, before legal review, and before any offer is
            made.
          </p>
        </motion.div>

        {/* 2-Column Side-by-Side Comparison Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Left Box: Strong Fit Signals */}
          <motion.div
            variants={cardVariants}
            className="bg-[#0C1422] border border-[#10B981]/30 rounded-2xl p-8 sm:p-10 flex flex-col relative overflow-hidden"
          >
            {/* Ambient subtle glow background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10B981]/50 to-transparent" />

            {/* Header / Title */}
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#064E3B]/40 border border-[#10B981]/50 flex items-center justify-center text-[#10B981]">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Strong fit signals
              </h3>
            </div>

            {/* List Items */}
            <ul className="space-y-4">
              {strongSignals.map((signal, idx) => (
                <li key={idx} className="flex items-start gap-3.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                    {signal.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right Box: Weak or Disqualifying Signals */}
          <motion.div
            variants={cardVariants}
            className="bg-[#0C1422] border border-[#EF4444]/30 rounded-2xl p-8 sm:p-10 flex flex-col relative overflow-hidden"
          >
            {/* Ambient subtle glow background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EF4444]/50 to-transparent" />

            {/* Header / Title */}
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#7F1D1D]/40 border border-[#EF4444]/50 flex items-center justify-center text-[#EF4444]">
                <X className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Weak or disqualifying signals
              </h3>
            </div>

            {/* List Items */}
            <ul className="space-y-4">
              {weakSignals.map((signal, idx) => (
                <li key={idx} className="flex items-start gap-3.5">
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                    {signal.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
