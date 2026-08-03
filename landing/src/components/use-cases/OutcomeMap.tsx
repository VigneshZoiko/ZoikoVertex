"use client";

import { motion } from "framer-motion";

interface OutcomeRow {
  outcome: string;
  useCases: string;
  proof: string;
}

const rows: OutcomeRow[] = [
  {
    outcome: "Faster execution",
    useCases: "Campaign execution, content production, retail launches",
    proof: "Cycle-time ↓ · SLA improvement · bottlenecks removed",
  },
  {
    outcome: "Higher throughput",
    useCases: "Content production, agency execution, marketing operations",
    proof: "Approved outputs / team · campaign volume · reuse rate",
  },
  {
    outcome: "Reduced governance risk",
    useCases: "Auditability, approval workflows, compliance governance",
    proof: "Policy exceptions ↓ · approval coverage · evidence completeness",
  },
  {
    outcome: "Better executive control",
    useCases: "Executive Command Center, ROI Engine",
    proof: "Status visibility · ROI confidence · risk & readiness score",
  },
  {
    outcome: "Lower operational waste",
    useCases: "Workflow orchestration, integrations, approval automation",
    proof: "Manual handoffs removed · duplicate work ↓ · fewer tool switches",
  },
  {
    outcome: "Stronger retention",
    useCases: "Value reviews, expansion paths, governance maturity",
    proof: "Quarterly value report · adoption depth · cross-team usage",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
} as const;

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
} as const;

export default function OutcomeMap() {
  return (
    <div className="min-h-screen w-full bg-[#08101F] px-6 py-20 sm:px-10 lg:px-24">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-6 flex items-center gap-3"
        >
          <span className="h-px w-8 bg-amber-400" />
          <span className="text-xs font-semibold tracking-[0.25em] text-amber-400">
            OUTCOME MAP
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mb-14 text-4xl font-bold leading-tight text-white lg:text-[44px]"
        >
          Every problem tied to
          <br />
          measurable value.
        </motion.h1>

        {/* Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="overflow-hidden rounded-xl border border-white/10"
        >
          {/* Header Row */}
          <motion.div
            variants={rowVariants}
            className="grid grid-cols-[1fr_1.4fr_1.5fr] bg-[#111D2E] px-8 py-5"
          >
            <span className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              OUTCOME
            </span>
            <span className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              RELEVANT USE CASES
            </span>
            <span className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              PROOF / METRIC
            </span>
          </motion.div>

          {/* Data Rows */}
          {rows.map((row, idx) => (
            <motion.div
              key={row.outcome}
              variants={rowVariants}
              className={`grid grid-cols-[1fr_1.4fr_1.5fr] gap-6 px-8 py-8 ${
                idx !== rows.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="pr-4 text-[17px] font-bold leading-snug text-white">
                {row.outcome}
              </div>
              <div className="pr-4 text-[15px] leading-relaxed text-slate-400">
                {row.useCases}
              </div>
              <div className="font-mono text-[14px] leading-relaxed text-cyan-400">
                {row.proof}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
