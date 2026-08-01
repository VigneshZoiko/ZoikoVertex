"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface ScoringTag {
  id: string;
  label: string;
  active?: boolean;
}

const scoringTags: ScoringTag[] = [
  { id: "agentic-execution", label: "Agentic execution", active: true },
  { id: "approval-control", label: "Approval control", active: true },
  { id: "audit-evidence", label: "Audit evidence", active: true },
  { id: "enterprise-governance", label: "Enterprise governance", active: true },
  { id: "ai-governance", label: "AI governance", active: false },
  { id: "policy-enforcement", label: "Policy enforcement", active: false },
  {
    id: "workflow-orchestration",
    label: "Workflow orchestration",
    active: false,
  },
  { id: "identity-binding", label: "Identity binding", active: false },
  { id: "roi-measurement", label: "ROI measurement", active: false },
  { id: "executive-command", label: "Executive command", active: false },
  {
    id: "integration-readiness",
    label: "Integration readiness",
    active: false,
  },
  { id: "responsible-ai", label: "Responsible AI", active: false },
];

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function BenchmarkScoringFilter() {
  const [activeTags, setActiveTags] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    scoringTags.forEach((tag) => {
      initialState[tag.id] = !!tag.active;
    });
    return initialState;
  });

  const toggleTag = (id: string) => {
    setActiveTags((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className="w-full bg-[#111D2E] border-y border-[#FFFFFF1A] py-10 px-4 sm:px-8 md:px-12 lg:px-24 font-sans text-white">
      <motion.div
        className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Left Section: Label + Interactive Pills Grid */}
        <div className="flex flex-col sm:flex-row items-start gap-6 lg:gap-8 flex-1">
          {/* Section Header Label */}
          <div className="pt-1 flex-shrink-0">
            <span className="font-mono text-xs font-semibold tracking-[0.2em] uppercase text-[#FFFFFF42]">
              BENCHMARK SCORING
            </span>
          </div>

          {/* Tags Grid */}
          <div className="flex flex-wrap gap-2.5 max-w-120">
            {scoringTags.map((tag) => {
              const isActive = activeTags[tag.id];
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`font-mono text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 focus:outline-none ${
                    isActive
                      ? "border-[#C9A84C40] text-[#20E7F2] bg-[#C9A84C0F]"
                      : "border-[#FFFFFF1A] text-[#FFFFFF85] bg-[#FFFFFF0E] hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Methodology Note Box */}
        <div className="w-full lg:w-[430px] flex-shrink-0 bg-[#C9A84C0D] border border-[#C9A84C26] rounded-xl p-5 backdrop-blur-sm">
          <p className="font-mono text-xs tracking-[1px] leading-relaxed text-[#FFFFFF42]">
            <strong className="text-[#C9A84C99] font-normal">
              Methodology note:
            </strong>{" "}
            This benchmark uses capability category descriptions, not claims
            about specific named vendors. Critical dimensions reflect enterprise
            procurement requirements and governance framework standards (NIST AI
            RMF, ISO/IEC 42001). Updated quarterly.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
