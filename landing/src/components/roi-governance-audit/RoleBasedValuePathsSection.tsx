"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface RoleData {
  id: string;
  tabLabel: string;
  roleTitle: string;
  headline: string;
  description: string;
  ctaText: string;
}

const rolesData: RoleData[] = [
  {
    id: "cfo",
    tabLabel: "CFO",
    roleTitle: "CHIEF FINANCIAL OFFICER",
    headline: "Quantify savings, payback, and avoided waste.",
    description:
      "Turn agentic AI into a measurable line item: hours recovered, rework avoided, and payback period — with assumptions transparent enough for the board.",
    ctaText: "Download ROI Summary",
  },
  {
    id: "cmo",
    tabLabel: "CMO",
    roleTitle: "CHIEF MARKETING OFFICER",
    headline: "Accelerate campaign speed without risking brand equity.",
    description:
      "Scale high-velocity campaign workflows across markets with real-time approval gates and automated quality compliance.",
    ctaText: "Explore Marketing Demos",
  },
  {
    id: "coo",
    tabLabel: "COO",
    roleTitle: "CHIEF OPERATING OFFICER",
    headline: "Streamline execution bottlenecks across business units.",
    description:
      "Gain full cross-functional visibility into automated workflow throughput and eliminate operational dependencies.",
    ctaText: "View Operational Playbook",
  },
  {
    id: "cio",
    tabLabel: "CIO / CISO",
    roleTitle: "CHIEF INFORMATION & SECURITY OFFICER",
    headline: "Deploy autonomous agents on a governed core.",
    description:
      "Enforce zero-trust agent permissions, continuous policy validation, and complete technical auditability across your enterprise.",
    ctaText: "Review Security Architecture",
  },
  {
    id: "legal",
    tabLabel: "Legal",
    roleTitle: "GENERAL COUNSEL & LEGAL",
    headline: "Defend AI outcomes with immutable evidence.",
    description:
      "Ensure strict regulatory adherence with automated decision recording, identity binding, and tamper-proof evidence trails.",
    ctaText: "Inspect Legal Evidence Vault",
  },
  {
    id: "procurement",
    tabLabel: "Procurement",
    roleTitle: "PROCUREMENT & VENDOR MANAGEMENT",
    headline: "Validate vendor risk and total cost of ownership.",
    description:
      "Access board-ready procurement packs with clear SLA mappings, risk assessments, and predictable licensing tiers.",
    ctaText: "Download Procurement Pack",
  },
];

export default function RoleBasedValuePathsSection() {
  const [activeTab, setActiveTab] = useState<string>("cfo");

  const activeRole =
    rolesData.find((role) => role.id === activeTab) || rolesData[0];

  return (
    <section className="relative min-h-[480px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

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
            ROLE-BASED VALUE PATHS
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          variants={itemVariants}
          className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-white mb-10 leading-[1.12]"
        >
          A reason to continue for every <br />
          stakeholder.
        </motion.h2>

        {/* Role Tab Navigation Pills */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-2 mb-8"
        >
          {rolesData.map((role) => {
            const isActive = role.id === activeTab;
            return (
              <button
                key={role.id}
                onClick={() => setActiveTab(role.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    : "bg-[#070E18]/80 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                {role.tabLabel}
              </button>
            );
          })}
        </motion.div>

        {/* Dynamic Card Container */}
        <motion.div variants={itemVariants} className="w-full">
          <div className="relative w-full rounded-2xl bg-[#070E18]/80 border border-slate-800/80 p-8 md:p-10 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] min-h-[220px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left Content Column */}
                <div className="lg:col-span-8 flex flex-col items-start">
                  <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-cyan-400 uppercase mb-3">
                    {activeRole.roleTitle}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight leading-snug">
                    {activeRole.headline}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-2xl">
                    {activeRole.description}
                  </p>
                </div>

                {/* Right CTA Box Column */}
                <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center lg:border-l lg:border-slate-800/80 lg:pl-10">
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">
                    RECOMMENDED NEXT STEP
                  </span>
                  <button className="px-6 py-3.5 rounded-xl bg-[#D4A359] text-slate-950 font-bold text-xs hover:bg-[#E2B46C] transition-all duration-200 shadow-[0_0_20px_rgba(212,163,89,0.25)] active:scale-[0.98] w-full sm:w-auto text-center">
                    {activeRole.ctaText}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
