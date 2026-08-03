"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface Stage {
  stageLabel: string;
  title: string;
  description: string;
}

const stages: Stage[] = [
  {
    stageLabel: "STAGE 01",
    title: "Land a first workflow",
    description: "Prove value on one approval-heavy or high-volume workflow.",
  },
  {
    stageLabel: "STAGE 02",
    title: "Standardize governance",
    description: "Roll out approvals, evidence, and policy across the team.",
  },
  {
    stageLabel: "STAGE 03",
    title: "Expand across teams",
    description: "Extend governed agents to adjacent functions and brands.",
  },
  {
    stageLabel: "STAGE 04",
    title: "Enterprise execution system",
    description: "Quarterly value reviews and governance maturity progression.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.25,
    },
  },
} as const;

const stageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const barVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.7, ease: "easeOut" },
  },
} as const;

export default function LandExpand() {
  return (
    <div className="w-full bg-[#0a0e1a] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-5 flex items-center justify-center gap-3"
        >
          <span className="h-px w-6 bg-cyan-400" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400">
            LAND &amp; EXPAND
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-4 max-w-3xl text-center text-[30px] font-bold leading-tight text-white sm:text-[34px]"
        >
          One use case becomes a governed system.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.15 }}
          className="mx-auto mb-16 max-w-xl text-center text-[14px] leading-relaxed text-slate-400"
        >
          How a first workflow grows into enterprise-wide governed execution.
        </motion.p>

        {/* Stages */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stages.map((stage, idx) => (
            <motion.div
              key={stage.title}
              variants={stageVariants}
              className="relative"
            >
              {/* Arrow connector (desktop only, not on last item) */}
              {idx !== stages.length - 1 && (
                <div className="pointer-events-none absolute right-[-26px] top-[26px] hidden lg:block">
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
              )}

              <span className="mb-3 block text-[10px] font-semibold tracking-[0.2em] text-cyan-400">
                {stage.stageLabel}
              </span>
              <h3 className="mb-2 text-[15px] font-bold leading-snug text-white">
                {stage.title}
              </h3>
              <p className="mb-4 text-[12.5px] leading-relaxed text-slate-400">
                {stage.description}
              </p>

              {/* Gradient underline */}
              <motion.div
                variants={barVariants}
                style={{ transformOrigin: "left" }}
                className="h-[3px] w-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
