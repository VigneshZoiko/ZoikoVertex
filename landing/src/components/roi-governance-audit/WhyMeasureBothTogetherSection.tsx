"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Target,
  SlidersHorizontal,
  ShieldAlert,
  FolderCheck,
} from "lucide-react";

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

interface MeasureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

const cards: MeasureCard[] = [
  {
    id: "measurable-return",
    title: "Measurable return",
    description:
      "Hours recovered, rework avoided, and campaign throughput gained — priced in your own labor and value assumptions.",
    icon: Target,
    iconBgColor: "bg-[#20E7F21A] border-cyan-800/50",
    iconColor: "text-cyan-400",
  },
  {
    id: "approval-velocity",
    title: "Approval velocity",
    description:
      "Faster, structured sign-off across reviewers and business units without bypassing review gates.",
    icon: SlidersHorizontal,
    iconBgColor: "bg-[#20E7F21A] border-cyan-800/50",
    iconColor: "text-cyan-400",
  },
  {
    id: "risk-reduction",
    title: "Risk reduction",
    description:
      "Fewer uncontrolled AI outputs, missing approvals, weak evidence, and unclear ownership across markets.",
    icon: ShieldAlert,
    iconBgColor: "bg-[#E8B7681F] border-amber-800/40",
    iconColor: "text-amber-500",
  },
  {
    id: "evidence-readiness",
    title: "Evidence readiness",
    description:
      "Audit trail, decision records, identity binding, and retention — defensible for legal, risk, and procurement.",
    icon: FolderCheck,
    iconBgColor: "bg-[#E8B7681F] border-amber-800/40",
    iconColor: "text-[#E8B768]",
  },
];

export default function WhyMeasureBothTogetherSection() {
  return (
    <section className="relative  w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Header Section */}
        <div className="mb-14 max-w-6xl flex flex-col items-center">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              WHY MEASURE BOTH TOGETHER
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-5 leading-[1.15]">
            AI productivity without governance{" "}
            <br className="hidden sm:inline" />
            is an unpriced liability.
          </h2>

          {/* Subtitle / Paragraph */}
          <p className="text-[#8B97A6] text-xs sm:text-sm font-normal leading-relaxed max-w-120">
            Speed from agentic AI only compounds value when it is approved,
            auditable, and evidenced. This audit quantifies the return and the
            control in a single business case — so productivity gains don&apos;t
            turn into uncontrolled AI sprawl, brand risk, or compliance debt.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={cardVariants}
                className="group relative flex flex-col justify-start p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700/90 hover:bg-[#0A1422] transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-sm min-h-[220px]"
              >
                {/* Icon Container */}
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105 ${card.iconBgColor}`}
                >
                  <Icon className={`w-4 h-4 stroke-[2] ${card.iconColor}`} />
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
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
