"use client";

import React, { useState } from "react";
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

interface ChecklistItem {
  id: string;
  label: string;
  points: number;
}

const checklistData: ChecklistItem[] = [
  {
    id: "item-1",
    label: "Every AI agent action is recorded with actor, time, and object",
    points: 10,
  },
  {
    id: "item-2",
    label:
      "Approvals are structured, role-based, and enforced before publishing",
    points: 10,
  },
  {
    id: "item-3",
    label: "Policy checks run automatically on agent output",
    points: 10,
  },
  {
    id: "item-4",
    label: "Decisions capture rationale, approver, and policy basis",
    points: 10,
  },
  {
    id: "item-5",
    label: "Evidence packages are sealed and retained by class",
    points: 10,
  },
  {
    id: "item-6",
    label: "Identity, MFA, and privileged access are logged",
    points: 10,
  },
  {
    id: "item-7",
    label: "Audit bundles can be exported with a manifest and hash",
    points: 10,
  },
  {
    id: "item-8",
    label: "Retention and legal hold rules are configurable",
    points: 10,
  },
  {
    id: "item-9",
    label: "Executives have real-time status, risk, and ROI visibility",
    points: 10,
  },
  {
    id: "item-10",
    label: "Integrations connect cleanly to your enterprise stack",
    points: 10,
  },
];

export default function GovernanceReadinessChecklistSection() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const score = Object.entries(checkedItems).reduce((acc, [id, isChecked]) => {
    if (isChecked) {
      const found = checklistData.find((item) => item.id === id);
      return acc + (found ? found.points : 0);
    }
    return acc;
  }, 0);

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <section className="relative min-h-[900px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="text-start mb-16 max-w-6xl">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-start gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              GOVERNANCE READINESS CHECKLIST
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Score your governance <br />
            readiness in two minutes.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
            Check what your current AI setup already covers. The gaps are your
            evaluation shortlist.
          </p>
        </div>

        {/* Main Grid: Checklist (Left) & Score Card (Right) */}
        <motion.div
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Checklist Box */}
          <motion.div
            variants={cardVariants}
            className="lg:col-span-8 rounded-2xl bg-[#131C2B] border border-slate-800/80 p-6 md:p-8 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Enterprise governance checklist
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {checkedCount} / {checklistData.length}
              </span>
            </div>

            {/* Checklist items */}
            <div className="flex flex-col gap-4 mb-8">
              {checklistData.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group select-none"
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-[#00E5FF] text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                          : "border border-[#7AA0BE42] group-hover:border-slate-500"
                      }`}
                    >
                      {isChecked && (
                        <span className="text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-normal transition-colors ${
                        isChecked ? "text-white font-medium" : "text-[#C3CCD6]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-800/80">
              <button className="px-6 py-3 rounded-xl bg-[#131C2B] border border-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-all active:scale-[0.98]">
                Download PDF
              </button>
              <button className="px-6 py-3 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs hover:bg-[#00cce6] transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-[0.98]">
                Run Governance Audit
              </button>
            </div>
          </motion.div>

          {/* Right Readiness Score Card */}
          <motion.div
            variants={cardVariants}
            className="lg:col-span-4 rounded-2xl bg-gradient-to-b from-[#111D2E] to-[#0B1524] border border-slate-800/80 p-6 md:p-8 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[1px] text-[#E8B768] uppercase block mb-4">
                READINESS SCORE
              </span>

              {/* Big Score Display */}
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl sm:text-6xl font-extrabold text-[#E8B768] tracking-tight">
                  {score}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-500">
                  / 100
                </span>
              </div>

              {/* Score Description */}
              <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed mb-8">
                Check the controls you have today. A lower score means bigger
                opportunity &mdash; and a stronger reason to run a full
                governance audit.
              </p>
            </div>

            {/* CTA Button */}
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-[#E8B768] to-[#C8954A] text-[#1C1405] font-bold text-xs sm:text-sm hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98]">
              Run ROI &amp; Governance Audit
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
