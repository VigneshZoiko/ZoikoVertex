"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

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

interface ComparisonRow {
  category: string;
  zoikovertex: string;
  genericTools: string;
  legacyTools: string;
}

const comparisonData: ComparisonRow[] = [
  {
    category: "Governed autonomy",
    zoikovertex: "Policy + HITL by design",
    genericTools: "× Ungoverned output",
    legacyTools: "× No AI agents",
  },
  {
    category: "Approval workflows",
    zoikovertex: "Structured + evidenced",
    genericTools: "× None",
    legacyTools: "- Manual routing",
  },
  {
    category: "Auditability & evidence",
    zoikovertex: "Five-surface evidence model",
    genericTools: "× Chat logs only",
    legacyTools: "- Activity logs",
  },
  {
    category: "ROI measurement",
    zoikovertex: "Built-in ROI engine",
    genericTools: "× Not measured",
    legacyTools: "- Time tracking",
  },
  {
    category: "Enterprise integrations",
    zoikovertex: "APIs, connectors, webhooks",
    genericTools: "- Limited",
    legacyTools: "✓ Mature but rigid",
  },
  {
    category: "Procurement readiness",
    zoikovertex: "Security + DPA + governance",
    genericTools: "× Consumer-grade",
    legacyTools: "- Varies",
  },
];

export default function ComparisonFrameworkSection() {
  return (
    <section className="relative min-h-[900px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16 max-w-2xl">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              COMPARISON FRAMEWORK
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Governed execution vs. the alternatives.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
            How ZoikoVertex compares to generic AI tools and legacy workflow
            platforms on the criteria that matter to enterprise reviewers.
          </p>
        </div>

        {/* Comparison Table Container */}
        <motion.div
          className="w-full rounded-2xl bg-[#070E18]/80 border border-slate-800/80 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#0A1422]/60">
                  <th className="py-5 px-6 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Evaluation Category
                  </th>
                  <th className="py-5 px-6 text-[11px] font-mono font-bold text-[#00E5FF] uppercase tracking-widest bg-[#20E7F20D] border-x border-slate-800/80">
                    ZoikoVertex
                  </th>
                  <th className="py-5 px-6 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Generic AI Tools
                  </th>
                  <th className="py-5 px-6 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Legacy Workflow Tools
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {comparisonData.map((row, index) => (
                  <motion.tr
                    key={index}
                    variants={cardVariants}
                    className="hover:bg-[#131C2B]/60 transition-colors"
                  >
                    <td className="py-5 px-6 text-xs sm:text-sm font-bold text-slate-200">
                      {row.category}
                    </td>
                    <td className="py-5 px-6 flex gap-2 text-xs sm:text-sm font-semibold text-[#3FD6A0] bg-[#20E7F20D] border-x border-slate-800/80">
                      <Check size={15} />{" "}
                      <span className="text-white">{row.zoikovertex}</span>
                    </td>
                    <td className="py-5 px-6 text-xs sm:text-sm font-normal text-slate-400">
                      {row.genericTools}
                    </td>
                    <td className="py-5 px-6 text-xs sm:text-sm font-normal text-slate-400">
                      {row.legacyTools}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Bottom Warning/Note Box */}
        <div className="w-full flex items-start gap-3 p-4 rounded-xl text-slate-400 text-xs font-mono">
          <span className="text-amber-500 font-bold text-sm">⚠</span>
          <p className="leading-relaxed text-sm">
            <span className="font-bold text-slate-300 uppercase">
              Governance risk note:
            </span>{" "}
            generic AI tools accelerate output without approval, evidence, or
            accountability &mdash; the exact gaps enterprise reviewers flag.
            Comparison reflects typical category capabilities, not any specific
            vendor.
          </p>
        </div>
      </div>
    </section>
  );
}
