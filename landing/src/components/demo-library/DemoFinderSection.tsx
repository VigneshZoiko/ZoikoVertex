"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Play, Star } from "lucide-react";

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

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface CardData {
  id: string;
  category: string;
  time: string;
  roleTag: string;
  timeTag: string;
  policyTag: string;
  extraTag?: string;
  title: string;
  description: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  categoryFooter: string;
}

const cardsData: CardData[] = [
  {
    id: "1",
    category: "FEATURED OVERVIEW",
    time: "5:00",
    roleTag: "Executive",
    timeTag: "3–7 min",
    policyTag: "Audit-ready",
    extraTag: "Synthetic data",
    title: "ZoikoVertex Executive Overview",
    description:
      "Turn governed AI execution into measurable enterprise outcomes.",
    bullet1: "Governed agents acting within policy",
    bullet2: "ROI and risk surfaced to leadership",
    bullet3: "Approvals and evidence built in",
    categoryFooter: "ROI Explore →",
  },
  {
    id: "2",
    category: "WORKFLOW ORCHESTRATION",
    time: "3:30",
    roleTag: "Dev / CTO",
    timeTag: "8–15 min",
    policyTag: "Policy-controlled",
    extraTag: "82%",
    title: "Build a Governed Agentic Workflow",
    description:
      "Move work from intake to approval to publish without losing accountability.",
    bullet1: "Task intake and routing",
    bullet2: "Agent execution inside guardrails",
    bullet3: "Approval and evidence at each step",
    categoryFooter: "Workflow Demonstration →",
  },
  {
    id: "3",
    category: "APPROVALS",
    time: "4:00",
    roleTag: "Marketing / Legal",
    timeTag: "3–7 min",
    policyTag: "100%",
    extraTag: "Synthetic thread",
    title: "Approve AI Content With Full-Audit Evidence",
    description:
      "Approve AI-generated campaign content with a complete audit record.",
    bullet1: "Reviewer roles and SLAs",
    bullet2: "Automated policy checks",
    bullet3: "A sealed decision record",
    categoryFooter: "Approval Workflows →",
  },
  {
    id: "4",
    category: "AUDITABILITY",
    time: "5:00",
    roleTag: "Governance",
    timeTag: "3–7 min",
    policyTag: "Audit-ready",
    extraTag: "Evidence-sealed",
    title: "Open an Evidence Package From an Audit Event",
    description: "Reconstruct any governed event from a single audit record.",
    bullet1: "Audit-trail to decision ledger",
    bullet2: "Sealed evidence vault",
    bullet3: "Export manifest with hash",
    categoryFooter: "Auditability →",
  },
  {
    id: "5",
    category: "ROI & METRICS",
    time: "2:30",
    roleTag: "CRO / CFO",
    timeTag: "3–7 min",
    policyTag: "Synthetic data",
    title: "Measure ROI From AI Execution",
    description: "Quantity time saved, risk avoided, and approval velocity.",
    bullet1: "ROI dashboard by workflow",
    bullet2: "Estimated payback rings",
    bullet3: "Governance-adjusted value",
    categoryFooter: "ROI & Governance Audit →",
  },
  {
    id: "6",
    category: "INTEGRATIONS",
    time: "4:30",
    roleTag: "IT / Ops",
    timeTag: "3–7 min",
    policyTag: "Privacy maintained",
    title: "Connect Enterprise Systems and Social Platforms",
    description:
      "Sync CRM, social, ad, and analytics without brittle connectors.",
    bullet1: "Connector setup",
    bullet2: "Signed webhooks",
    bullet3: "Governed data flow",
    categoryFooter: "Integrations →",
  },
  {
    id: "7",
    category: "ENTERPRISE RETAIL",
    time: "6:00",
    roleTag: "Retail Ops",
    timeTag: "8–15 min",
    policyTag: "88%",
    title: "Retail Campaign Launch Across Regions",
    description:
      "Coordinate store, regional, and channel launches with local approvals.",
    bullet1: "Central execution layer",
    bullet2: "Store/regional adaptation",
    bullet3: "Launch readiness evidence",
    categoryFooter: "Enterprise Retail →",
  },
  {
    id: "8",
    category: "RESPONSIBLE AI",
    time: "4:00",
    roleTag: "Legal / AI Governance",
    timeTag: "3–7 min",
    policyTag: "Responsible AI",
    extraTag: "91%",
    title: "Responsible AI Controls in Practice",
    description:
      "See bounded autonomy, policy checks, and human oversight in action.",
    bullet1: "Configurable autonomy thresholds",
    bullet2: "Policy-enforced outputs",
    bullet3: "Human checkpoints where required",
    categoryFooter: "Responsible AI →",
  },
];

export default function DemoFinderSection() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <section className="relative min-h-screen w-full bg-[#030711] text-white px-4 py-12 sm:px-8 md:px-12 lg:px-16 flex justify-center font-sans">
      <div className="max-w-[1280px] w-full z-10">
        {/* Title Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-cyan-400 uppercase">
              DEMO FINDER
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Find the demo that proves your <br />
            case.
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
            Filter by role, capability, length, and governance need. Every demo
            is a mini proof — with outcomes, evidence, and a next step.
          </p>
        </div>

        {/* Filter Bar Panel */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131C2B] p-5 mb-10 backdrop-blur-md">
          {/* Search Input Box */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search demos by workflow, use-case, role, industry, integration, governance need, or feature..."
              className="w-[100%] pl-10 pr-16 py-2.5 rounded-lg bg-[#040811] border border-slate-800/90 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
            <div className="absolute inset-y-0 right-3.5 flex items-center text-[10px] font-mono text-slate-500">
              ⌘ SEARCH
            </div>
          </div>

          {/* Tag Filters Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Column 1: ROLE */}
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2.5">
                ROLE
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Executive",
                  "Marketing Ops",
                  "Retail Ops",
                  "AI Governance",
                  "Legal",
                  "IT / Architects",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeFilter === tag
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-[#0B1320] text-slate-400 border border-slate-800/60 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: CAPABILITY */}
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2.5">
                CAPABILITY
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Overview",
                  "Workflows",
                  "Approvals",
                  "ROI Engine",
                  "Integrations",
                  "Auditability",
                  "Responsible AI",
                  "Retail",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeFilter === tag
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-[#0B1320] text-slate-400 border border-slate-800/60 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 3: LENGTH */}
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2.5">
                LENGTH
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Under 5 min", "5–7 min", "8–15 min", "Live demo"].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveFilter(tag)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                        activeFilter === tag
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-[#0B1320] text-slate-400 border border-slate-800/60 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Column 4: GOVERNANCE NEED */}
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2.5">
                GOVERNANCE NEED
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Audit-ready",
                  "Human-in-loop",
                  "Evidence-sealed",
                  "Responsible AI",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      activeFilter === tag
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-[#0B1320] text-slate-400 border border-slate-800/60 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Bar inside Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/60 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">
                Showing all demos
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Recommended next step:{" "}
                <button className="text-cyan-400 hover:underline">
                  Book a live demo
                </button>
              </span>
            </div>
            <button
              onClick={() => setActiveFilter("All")}
              className="px-3 py-1 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors text-[11px]"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Demo Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cardsData.map((card) => (
            <motion.div
              key={card.id}
              variants={itemVariants}
              className="group rounded-2xl border border-slate-800/80 bg-[#131C2B] overflow-hidden flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300 shadow-lg"
            >
              <div>
                {/* Card Video Header Screen */}
                <div className="relative aspect-[1.85/1] bg-gradient-to-b from-[#020710] to-[#050C16] border-b border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden">
                  {/* Glowing Backdrop inside player */}
                  <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                  {/* Top Bar of player */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                      {card.category}
                    </span>
                    <button className="text-slate-600 hover:text-amber-400 transition-colors">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Central Play Icon */}
                  <div className="relative z-10 self-center my-auto">
                    <div className="w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <div className="w-7 h-7 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950 pl-0.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Time */}
                  <div className="relative z-10 self-end text-[10px] font-mono text-slate-500">
                    {card.time}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="px-2 py-0.5 rounded border border-slate-800 bg-[#0B1320] text-[10px] font-mono text-cyan-300">
                      {card.roleTag}
                    </span>
                    <span className="px-2 py-0.5 rounded border border-slate-800 bg-[#0B1320] text-[10px] font-mono text-slate-400">
                      {card.timeTag}
                    </span>
                    <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-950/20 text-[10px] font-mono text-amber-300">
                      {card.policyTag}
                    </span>
                    {card.extraTag && (
                      <span className="px-2 py-0.5 rounded border border-slate-800 bg-[#0B1320] text-[10px] font-mono text-slate-400">
                        {card.extraTag}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Bullets */}
                  <div className="space-y-1.5 mb-6 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span className="truncate">{card.bullet1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span className="truncate">{card.bullet2}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span className="truncate">{card.bullet3}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 pb-5 pt-0 flex items-center justify-between text-xs font-mono border-t border-slate-800/40 mt-auto pt-3">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-cyan-400 font-semibold hover:underline">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Watch demo</span>
                  </button>
                  <button className="text-slate-400 hover:text-white transition-colors">
                    Book Live
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                  {card.categoryFooter}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
