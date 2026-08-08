"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";

interface ItemRow {
  text: string;
}

const beforeItems: ItemRow[] = [
  {
    text: "Campaign requests scattered across email, chat, spreadsheets, and tools.",
  },
  {
    text: "AI outputs created without consistent policy or approval evidence.",
  },
  { text: "Approvals happen late, informally, or without a decision record." },
  { text: "Executives lack visibility until delays or mistakes surface." },
  { text: "Audit preparation requires manual reconstruction." },
];

const afterItems: ItemRow[] = [
  { text: "Request intake is structured, routed, prioritized, and assigned." },
  {
    text: "Agent outputs are governed by brand, policy, approval, and evidence controls.",
  },
  {
    text: "Approvals capture decision events, rationale, role authority, and timestamps.",
  },
  {
    text: "Command Center shows status, blockers, risk, ROI, and readiness in real time.",
  },
  { text: "Audit Trail and Evidence Vault preserve proof as work happens." },
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
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function WorkflowPreview() {
  return (
    <div className="min-h-screen w-full bg-[#0a0e1a] px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-3 flex items-center gap-2"
        >
          <span className="h-px w-6 bg-cyan-400" />
          <span className="text-[9px] font-semibold tracking-[0.2em] text-cyan-400">
            WORKFLOW PREVIEW
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mb-2 md:text-[44px] font-bold leading-tight text-white text-3xl"
        >
          What changes when execution
          <br />
          is governed.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.15 }}
          className="mb-8 text-[11px] text-slate-500"
        >
          The product made tangible — no login required.
        </motion.p>

        {/* Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2"
        >
          {/* Before Card */}
          <motion.div
            variants={cardVariants}
            className="rounded-l-xl border-l border-white/10 bg-[#FF6B6B08] p-5"
          >
            <div className="mb-5 flex items-center gap-2.5">
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[8px] font-semibold tracking-wider text-rose-400">
                BEFORE
              </span>
              <span className="text-[12px] font-bold text-white">
                Ungoverned
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {beforeItems.map((item) => (
                <motion.div
                  key={item.text}
                  variants={itemVariants}
                  className="flex items-start gap-2.5"
                >
                  <Minus className="mt-[3px] h-2.5 w-2.5 shrink-0 text-rose-500/70" />
                  <span className="text-[10.5px] leading-relaxed text-slate-400">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* After Card */}
          <motion.div
            variants={cardVariants}
            className="rounded-r-xl border-r border-white/10 bg-[#20E7F208] p-5"
          >
            <div className="mb-5 flex items-center gap-2.5">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-semibold tracking-wider text-emerald-400">
                AFTER
              </span>
              <span className="text-[12px] font-bold text-white">
                Governed with ZoikoVertex
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {afterItems.map((item) => (
                <motion.div
                  key={item.text}
                  variants={itemVariants}
                  className="flex items-start gap-2.5"
                >
                  <Check className="mt-[3px] h-2.5 w-2.5 shrink-0 text-emerald-500/80" />
                  <span className="text-[10.5px] leading-relaxed text-slate-300">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
