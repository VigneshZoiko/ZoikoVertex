"use client";

import React from "react";
import { motion } from "framer-motion";

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

const stepVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface StepItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

const steps: StepItem[] = [
  {
    id: "audit-trail",
    number: "01",
    title: "Audit Trail",
    description:
      "Immutable record of who did what, when, across every workflow.",
  },
  {
    id: "decision-ledger",
    number: "02",
    title: "Decision Ledger",
    description: "Structured log of approvals, rejections, and rationale.",
  },
  {
    id: "evidence-vault",
    number: "03",
    title: "Evidence Vault",
    description: "Retained artifacts tied to each governed decision.",
  },
  {
    id: "forensic-hub",
    number: "04",
    title: "Forensic Hub",
    description: "Investigate incidents and reconstruct any campaign history.",
  },
  {
    id: "identity-ledger",
    number: "05",
    title: "Identity Ledger",
    description: "Bind actions and agents to verified human accountability.",
  },
];

export default function EvidenceBehindEstimateSection() {
  return (
    <section className="relative min-h-[480px] w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-amber-500/80"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-400 uppercase">
            EVIDENCE BEHIND THE ESTIMATE
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-[1.15]">
          Every number traces to a record.
        </h2>

        {/* Subtitle / Paragraph */}
        <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-xl mb-14">
          ROI claims connect to the same defensible architecture that governs
          live <br className="hidden sm:inline" />
          workflows — so the business case survives audit.
        </p>

        {/* 5-Step Horizontal Flow Container */}
        <motion.div
          className="w-full rounded-2xl bg-[#7AA0BE24] border border-[#7AA0BE24] p-2 lg:p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 backdrop-blur-sm shadow-xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              variants={stepVariants}
              className="relative flex flex-col justify-between p-6 text-left group transition-colors duration-300 rounded-xl"
            >
              <div>
                {/* Step Number */}
                <span className="text-xs font-mono font-bold text-amber-500/90 mb-4 block">
                  {step.number}
                </span>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow Connector for Desktop view */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-20 text-cyan-500/80">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
