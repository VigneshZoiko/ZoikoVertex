"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

// --- Types & Data ---

interface FilterCategory {
  title: string;
  options: string[];
}

interface Tag {
  label: string;
  variant: "default" | "highlight";
}

interface UseCaseCardData {
  id: string;
  tags: Tag[];
  title: string;
  problem: string;
  target: string;
  bullets: string[];
  footerTags: string[];
  ctaText: string;
  ctaColor?: "cyan" | "gold";
}

const FILTER_CATEGORIES: FilterCategory[] = [
  {
    title: "BUSINESS FUNCTION",
    options: ["Marketing", "Retail", "Governance", "Executive", "Agencies"],
  },
  {
    title: "BUSINESS OUTCOME",
    options: [
      "Speed",
      "ROI",
      "Approval control",
      "Throughput",
      "Risk reduction",
      "Retail consistency",
    ],
  },
  {
    title: "GOVERNANCE NEED",
    options: ["Standard", "High", "Regulated"],
  },
];

const USE_CASES: UseCaseCardData[] = [
  {
    id: "1",
    tags: [
      { label: "MARKETING", variant: "default" },
      { label: "SPEED", variant: "default" },
      { label: "STANDARD", variant: "highlight" },
    ],
    title: "Launch campaigns fast — every step governed",
    problem: "Campaigns are slow, fragmented, and hard to govern.",
    target: "FOR MARKETING OPERATIONS",
    bullets: [
      "Agents coordinate campaign work end to end",
      "Policy checks and approvals stay enforced",
      "Evidence trail preserved for every decision",
    ],
    footerTags: ["Creative Ops", "Approval Ops", "Market Launch"],
    ctaText: "View Campaign Execution Use Case",
    ctaColor: "cyan",
  },
  {
    id: "2",
    tags: [
      { label: "GOVERNANCE", variant: "default" },
      { label: "CONTROL", variant: "default" },
      { label: "HIGH", variant: "highlight" },
    ],
    title: "Reduce approval delays without losing control",
    problem: "Approvals are delayed, unclear, and exposed to compliance risks.",
    target: "FOR GOVERNANCE & COMPLIANCE",
    bullets: [
      "Custom approval paths across departments",
      "Escalate risks before bottlenecks",
      "Decision governance and auditability",
    ],
    footerTags: ["Approval", "Decision Flow", "Policy Exceptions"],
    ctaText: "Explore Approval Workflows",
    ctaColor: "gold",
  },
  {
    id: "3",
    tags: [
      { label: "RETAIL", variant: "default" },
      { label: "FIELD EXECUTION", variant: "default" },
      { label: "STANDARD", variant: "highlight" },
    ],
    title: "Coordinate every store, region, and channel launch",
    problem:
      "Retail campaigns vary by region, stores, channels, and execution.",
    target: "FOR STORE OPERATIONS",
    bullets: [
      "Central execution layer coordinates brand",
      "Local adaptation is pre-governed",
      "Launch readiness across channels",
    ],
    footerTags: ["Execution", "Governance", "Regional Coverage"],
    ctaText: "View Retail Use Case",
    ctaColor: "cyan",
  },
  {
    id: "4",
    tags: [
      { label: "EXECUTIVE", variant: "default" },
      { label: "SPEED", variant: "default" },
      { label: "STATUS", variant: "highlight" },
    ],
    title: "See execution status, risk, and ROI in one view",
    problem:
      "Leaders lack a single view of execution status, risks, ROI, and blockers.",
    target: "FOR EXECUTIVE LEADERSHIP",
    bullets: [
      "Status and performance surface live",
      "Risk and bottlenecks visible",
      "Action queues drive collaboration",
    ],
    footerTags: ["Live Visibility", "Executive View", "ROI at a Glance"],
    ctaText: "Explore Executive Center",
    ctaColor: "cyan",
  },
  {
    id: "5",
    tags: [
      { label: "COMPLIANCE", variant: "default" },
      { label: "RISK REDUCTION", variant: "default" },
      { label: "REGULATED", variant: "highlight" },
    ],
    title: "Prove what you AI did — and who approved it",
    problem:
      "Teams need full execution proof, audit transparency, who approved it, and why.",
    target: "FOR RISK & COMPLIANCE",
    bullets: [
      "Audit trail and evidence vault by default",
      "Decision lineage and branch history",
      "Immutable ledger binds accountability",
    ],
    footerTags: ["Evidence Vault", "Identity Audit", "Traceability"],
    ctaText: "View Auditability",
    ctaColor: "gold",
  },
  {
    id: "6",
    tags: [
      { label: "APPROVAL", variant: "default" },
      { label: "THROUGHPUT", variant: "default" },
      { label: "HIGH", variant: "highlight" },
    ],
    title: "Run many clients without operational drag",
    problem:
      "Agencies manage many clients, approvals, workloads, and performance together.",
    target: "FOR AGENCY OPERATIONS",
    bullets: [
      "Client-operated workspaces",
      "Governed agent and approval controls",
      "Evidence exports per client",
    ],
    footerTags: ["Client Workspaces", "Approval Automation", "Governance"],
    ctaText: "Book Agency Demo",
    ctaColor: "cyan",
  },
  {
    id: "7",
    tags: [
      { label: "MARKETING", variant: "default" },
      { label: "CONTENT", variant: "default" },
      { label: "AUTOMATION", variant: "highlight" },
    ],
    title: "Meet content demand without ungoverned AI sprawl",
    problem:
      "Content teams need secure AI at scale without losing governance or control.",
    target: "FOR MARKETING & CONTENT TEAMS",
    bullets: [
      "Agents plan, draft, review, and orchestrate",
      "Human approvals remain in place",
      "Teams track roles and governance",
    ],
    footerTags: ["Governance", "Brand Safety", "Content Automation"],
    ctaText: "View Content Use Case",
    ctaColor: "cyan",
  },
  {
    id: "8",
    tags: [
      { label: "FINANCE", variant: "default" },
      { label: "ROI", variant: "default" },
      { label: "CFO", variant: "highlight" },
    ],
    title: "Justify AI investment with numbers and controls",
    problem:
      "Leaders need to justify AI investment with measurable business outcomes.",
    target: "FOR CFOs & FINANCE",
    bullets: [
      "ROI maps connect productivity gains",
      "Risk controls and governance quantified",
      "Evidence ready reporting",
    ],
    footerTags: ["ROI Tracking", "Executive Reporting", "Audit"],
    ctaText: "Start ROI & Governance Audit",
    ctaColor: "gold",
  },
];

// --- Animation Variants ---

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function UseCaseFinder() {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const filteredUseCases = useMemo(() => {
    if (!selectedFilter) return USE_CASES;
    return USE_CASES.filter((useCase) =>
      useCase.tags.some(
        (t) => t.label.toUpperCase() === selectedFilter.toUpperCase(),
      ),
    );
  }, [selectedFilter]);

  const handleFilterClick = (option: string) => {
    setSelectedFilter((prev) => (prev === option ? null : option));
  };

  return (
    <section className="relative w-full bg-[#0B1524] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex flex-col items-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-10 z-10">
        {/* --- Header Section --- */}
        <motion.header
          className="space-y-4 max-w-3xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block -translate-y-[1px]" />
            <span>USE CASE FINDER</span>
          </div>

          <h1 className="text-[32px] leading-[1.15] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            Start with your problem, not our product.
          </h1>

          <p className="leading-[1.6] text-slate-400 font-normal pt-1 max-w-[540px]">
            Every card names a real operational pain, maps it to governed
            agentic execution and evidence, and routes you to the right next
            step. Filter to your context.
          </p>
        </motion.header>

        {/* --- Filter Section --- */}
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#131C2B] border border-[#7AA0BE24] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
        >
          {/* Top Row: Count & Reset */}
          <div className="flex items-center justify-between border-b border-[#162235] pb-5">
            <div className="text-[12px] font-mono font-medium text-slate-400 uppercase tracking-widest">
              <span className="text-[#20E7F2] font-bold pr-1">
                {filteredUseCases.length}
              </span>{" "}
              Use cases
            </div>
            {selectedFilter && (
              <button
                type="button"
                onClick={() => setSelectedFilter(null)}
                className="text-[12px] font-mono text-[#8B97A6] border border-[#7AA0BE42] bg-[#05080E] px-4 py-1.5 rounded-full hover:text-white hover:border-slate-500 transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Bottom Row: Filter Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FILTER_CATEGORIES.map((category) => (
              <div key={category.title} className="space-y-4">
                <h3 className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-[0.15em]">
                  {category.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.options.map((option) => {
                    const isActive = selectedFilter === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleFilterClick(option)}
                        className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors border ${
                          isActive
                            ? "bg-[#20E7F2]/10 border-[#20E7F2] text-[#20E7F2]"
                            : "bg-[#05080E] border-[#7AA0BE42] text-slate-300 hover:border-[#20E7F2]/50 hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* --- Card Grid --- */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={selectedFilter || "all"}
        >
          {filteredUseCases.map((card) => (
            <motion.article
              key={card.id}
              variants={fadeUpVariants}
              whileHover={{
                y: -4,
                borderColor: "rgba(32, 231, 242, 0.3)",
                boxShadow: "0 10px 40px -10px rgba(32, 231, 242, 0.08)",
                transition: { duration: 0.3 },
              }}
              className="group bg-[#131C2B] border border-[#7AA0BE24] rounded-2xl p-8 flex flex-col h-full transition-all duration-300 relative"
            >
              <div className="flex-grow space-y-6">
                {/* Top Tags */}
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-widest ${
                        tag.variant === "highlight"
                          ? "border border-[#E8B7684D] text-[#E8B768]"
                          : "border border-[#7AA0BE24] text-[#8B97A6]"
                      }`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>

                {/* Title & Problem */}
                <div className="space-y-2">
                  <h3 className="text-[20px] font-bold text-white tracking-tight leading-snug group-hover:text-[#20E7F2] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-slate-400">
                    {card.problem}
                  </p>
                </div>

                {/* Target Audience */}
                <div className="text-[10px] font-mono font-semibold text-[#C8954A] uppercase tracking-[0.15em]">
                  {card.target}
                </div>

                {/* Bullet Points */}
                <ul className="space-y-3">
                  {card.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8954A] flex-shrink-0 mt-1.5" />
                      <span className="text-[13px] leading-relaxed text-slate-300">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 space-y-6">
                {/* Footer Tags */}
                <div className="flex flex-wrap gap-2">
                  {card.footerTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[White 3%] border border-[#7AA0BE24] rounded-md text-[10px] font-mono text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA Link */}
                <div>
                  <a
                    href="#"
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-tight hover:underline transition-colors ${
                      card.ctaColor === "gold"
                        ? "text-[#D9A755] group-hover:text-[#F0BE6E]"
                        : "text-[#20E7F2] group-hover:text-[#4DF8FF]"
                    }`}
                  >
                    {card.ctaText}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
