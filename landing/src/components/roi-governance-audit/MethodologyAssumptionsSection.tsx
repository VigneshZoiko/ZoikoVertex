"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sigma,
  RotateCcw,
  MoveUpRight,
  ShieldCheck,
  Clock,
  Waves,
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

interface MethodologyCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  resultLabel: string;
}

const cards: MethodologyCard[] = [
  {
    id: "approval-time-savings",
    icon: Sigma,
    title: "Approval time savings",
    description:
      "Current cycle time minus target governed cycle time, multiplied by workflow volume and blended labor cost.",
    resultLabel: "Annual hours & cost recovered",
  },
  {
    id: "rework-reduction",
    icon: RotateCcw,
    title: "Rework reduction",
    description:
      "Current rework rate multiplied by an estimated reduction range from controlled briefs, approvals, and evidence.",
    resultLabel: "Cost of avoided rework",
  },
  {
    id: "campaign-velocity-gain",
    icon: MoveUpRight,
    title: "Campaign velocity gain",
    description: "Monthly campaigns multiplied by approval-cycle compression.",
    resultLabel: "Additional throughput capacity",
  },
  {
    id: "risk-exposure-reduction",
    icon: ShieldCheck,
    title: "Risk exposure reduction",
    description:
      "Risk categories scored by control maturity: policy, approval, evidence, identity, retention.",
    resultLabel: "Risk score improvement & gap map",
  },
  {
    id: "governance-maturity",
    icon: Clock,
    title: "Governance maturity",
    description:
      "Weighted score across controls, auditability, identity, evidence, workflows, retention, and responsible AI.",
    resultLabel: "0-100 score & maturity tier",
  },
  {
    id: "payback-period",
    icon: Waves,
    title: "Payback period",
    description:
      "Estimated annual benefit divided by an estimated subscription and implementation cost range.",
    resultLabel: "Indicative payback range",
  },
];

export default function MethodologyAssumptionsSection() {
  return (
    <section className="relative min-h-[580px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="mb-12 max-w-2xl">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              METHODOLOGY &amp; ASSUMPTIONS
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Transparent enough to survive <br />
            procurement.
          </h2>

          {/* Description */}
          <p className="text-slate-400 max-w-md text-sm sm:text-sm font-normal leading-relaxed">
            Every figure derives from your inputs and a published formula. No
            invented benchmarks are presented as fact.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 text-left"
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
                className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#162235] transition-all duration-300 cursor-pointer backdrop-blur-sm"
              >
                <div>
                  {/* Icon & Title Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-4 h-4 text-cyan-400 stroke-[2.2] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-100 tracking-tight group-hover:text-white transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 font-normal leading-relaxed pl-7 mb-4">
                    {card.description}
                  </p>
                </div>

                {/* Arrow Output / Result Label */}
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-amber-400 font-mono text-xs font-semibold">
                    →
                  </span>
                  <span className="text-[12px] text-amber-400 tracking-[1px]">
                    {card.resultLabel}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
