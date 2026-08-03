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

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface OutputCard {
  id: string;
  number: string;
  title: string;
  description: string;
}

const outputs: OutputCard[] = [
  {
    id: "roi-estimate",
    number: "01",
    title: "ROI estimate",
    description:
      "Annualized savings range, payback period, workflow hours recovered, and approval-bottleneck cost.",
  },
  {
    id: "governance-readiness-score",
    number: "02",
    title: "Governance readiness score",
    description:
      "0-100 maturity across controls, approvals, evidence, roles, policy, and auditability.",
  },
  {
    id: "workflow-velocity",
    number: "03",
    title: "Workflow velocity",
    description:
      "Current approval cycle time versus an optimized governed state, with a rework-reduction estimate.",
  },
  {
    id: "risk-reduction-map",
    number: "04",
    title: "Risk reduction map",
    description:
      "High-risk gaps: uncontrolled outputs, missing approvals, weak evidence, unclear ownership.",
  },
  {
    id: "evidence-readiness",
    number: "05",
    title: "Evidence readiness",
    description:
      "Audit trail, evidence vault, decision records, identity binding, and retention status.",
  },
  {
    id: "recommended-next-step",
    number: "06",
    title: "Recommended next step",
    description:
      "Demo path, governance review, procurement pack, or pilot plan — routed to your role.",
  },
];

export default function WhatTheAuditMeasuresSection() {
  return (
    <section className="relative min-h-[500px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-amber-500/80"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-400 uppercase">
            WHAT THE AUDIT MEASURES
          </span>
        </div>

        {/* Main Section Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight text-white mb-14 leading-[1.15]">
          Six outputs, one board-ready case.
        </h2>

        {/* 6 Cards Grid (3 columns on lg, 2 on sm, 1 on mobile) */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {outputs.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              className="group relative flex flex-col justify-start p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0A1422] transition-all duration-300 cursor-pointer backdrop-blur-sm min-h-[170px]"
            >
              {/* Number Badge */}
              <div className="text-xs font-mono font-bold text-cyan-400 mb-3 tracking-wider">
                {card.number}
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
