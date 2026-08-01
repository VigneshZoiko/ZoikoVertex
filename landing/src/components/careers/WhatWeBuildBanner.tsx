"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Bot,
  GitCommit,
  FileCheck2,
  LayoutGrid,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface FeaturePill {
  id: string;
  label: string;
  icon: React.ElementType;
}

const featurePills: FeaturePill[] = [
  {
    id: "governed-agents",
    label: "Governed agents",
    icon: Bot,
  },
  {
    id: "approval-workflows",
    label: "Approval workflows",
    icon: GitCommit,
  },
  {
    id: "evidence-layer",
    label: "Evidence layer",
    icon: FileCheck2,
  },
  {
    id: "executive-command-center",
    label: "Executive command center",
    icon: LayoutGrid,
  },
  {
    id: "roi-governance-intelligence",
    label: "ROI & governance intelligence",
    icon: BarChart3,
  },
  {
    id: "security-compliance",
    label: "Security & compliance",
    icon: ShieldCheck,
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function WhatWeBuildBanner() {
  return (
    <section className="w-full bg-[#080C14] border-y border-slate-800/80 py-4 px-4 sm:px-8 font-sans">
      <motion.div
        className="max-w-7xl mx-auto flex items-center justify-center gap-4 overflow-x-auto no-scrollbar py-1"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Left Section Label */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[#64748B] uppercase whitespace-nowrap">
            WHAT WE BUILD
          </span>
          <span className="text-[#334155] text-sm select-none">|</span>
        </div>

        {/* Scrollable / Flexible Pill List */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
          {featurePills.map((pill) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.id}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D1424] border border-slate-800/90 text-[#94A3B8] hover:text-white hover:border-slate-700 hover:bg-[#121B30] transition-all duration-150 cursor-pointer shrink-0"
              >
                <Icon className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                <span className="font-mono text-xs font-medium tracking-tight whitespace-nowrap">
                  {pill.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
