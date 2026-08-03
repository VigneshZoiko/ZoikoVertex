"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface GuideItem {
  id: string;
  roles: string[];
  buyingStage: string;
  assetTypeTags: string[];
  gateTag: string;
  title: string;
  description: string;
  takeaway: string;
  metaInfo: string;
  ctaText: string;
  secondaryCta: string;
}

const guidesData: GuideItem[] = [
  {
    id: "enterprise-buyer-guide",
    roles: ["Executive", "Procurement"],
    buyingStage: "Evaluation",
    assetTypeTags: ["Guide"],
    gateTag: "Light gate",
    title: "Enterprise Buyer Guide to Governed Agentic AI",
    description:
      "Aligning a buying committee on how to evaluate governed agentic AI.",
    takeaway:
      "One framework for autonomy, approvals, audit, ROI, and integration readiness.",
    metaInfo: "PDF · 18 min · Guide",
    ctaText: "Download Guide",
    secondaryCta: "Executive Command Center →",
  },
  {
    id: "ai-workflow-orchestration",
    roles: ["IT / CTO", "Operations"],
    buyingStage: "Evaluation",
    assetTypeTags: ["Guide"],
    gateTag: "Medium gate",
    title: "AI Workflow Orchestration Evaluation Guide",
    description:
      "Judging workflow architecture, autonomy limits, HITL, and audit trails.",
    takeaway:
      'What "good" orchestration looks like and the questions to ask vendors.',
    metaInfo: "PDF · 22 min · Guide",
    ctaText: "Download Guide",
    secondaryCta: "AI Workflow Orchestration →",
  },
  {
    id: "approval-workflow-modernization",
    roles: ["Operations", "Marketing"],
    buyingStage: "Education",
    assetTypeTags: ["Guide"],
    gateTag: "Light gate",
    title: "Approval Workflow Modernization Guide",
    description:
      "Approval bottlenecks and weak policy enforcement slowing execution.",
    takeaway:
      "How to design approval paths, roles, escalation, and SLAs that hold.",
    metaInfo: "PDF · 14 min · Guide",
    ctaText: "Download Guide",
    secondaryCta: "Approval Workflows →",
  },
  {
    id: "ai-governance-auditability",
    roles: ["Legal / Compliance", "Procurement"],
    buyingStage: "Ungated",
    assetTypeTags: ["Checklist"],
    gateTag: "Ungated",
    title: "AI Governance & Auditability Checklist",
    description:
      "Proving governance, evidence, retention, and policy controls to reviewers.",
    takeaway:
      "A control-by-control checklist for legal, compliance, and data teams.",
    metaInfo: "Checklist · 10 min · Checklist",
    ctaText: "Access Checklist",
    secondaryCta: "Auditability →",
  },
  {
    id: "agentic-ai-roi-business-case",
    roles: ["Executive", "Procurement"],
    buyingStage: "Evaluation",
    assetTypeTags: ["Template"],
    gateTag: "Medium gate",
    title: "Agentic AI ROI Business Case Guide",
    description: "Justifying AI investment with numbers your CFO will accept.",
    takeaway:
      "How to model cost reduction, speed gains, risk avoidance, and payback.",
    metaInfo: "Template · 15 min · Template",
    ctaText: "Build ROI Case",
    secondaryCta: "ROI & Governance Audit →",
  },
  {
    id: "enterprise-integration-readiness",
    roles: ["IT / CTO", "Procurement"],
    buyingStage: "Controlled access",
    assetTypeTags: ["Guide"],
    gateTag: "Controlled access",
    title: "Enterprise Integration Readiness Guide",
    description:
      "De-risking APIs, connectors, CRM, social platforms, webhooks, and data flows.",
    takeaway:
      "An integration-readiness assessment for your existing enterprise stack.",
    metaInfo: "PDF · 20 min · Guide",
    ctaText: "Download Guide",
    secondaryCta: "Integrations →",
  },
];

const roleFilters = [
  "Executive",
  "Marketing",
  "IT / CTO",
  "Legal / Compliance",
  "Procurement",
  "Operations",
];
const stageFilters = ["Education", "Evaluation", "Procurement"];
const assetFilters = ["Guide", "Checklist", "Template"];

export default function FeaturedGuideLibrarySection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const handleReset = () => {
    setSelectedRole(null);
    setSelectedStage(null);
    setSelectedAsset(null);
  };

  const filteredGuides = guidesData.filter((guide) => {
    if (selectedRole && !guide.roles.includes(selectedRole)) return false;
    if (selectedStage && guide.buyingStage !== selectedStage) return false;
    if (selectedAsset && !guide.assetTypeTags.includes(selectedAsset))
      return false;
    return true;
  });

  return (
    <section className="relative min-h-[900px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="text-start mb-12 max-w-6xl">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-start gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#20E7F2] uppercase">
              FEATURED GUIDE LIBRARY
            </span>
            <span className="w-4 h-[2px] bg-cyan-400"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Guides that build the internal <br />
            business case.
          </h2>

          {/* Description */}
          <p className="text-slate-400 max-w-xl text-xs sm:text-sm font-normal leading-relaxed">
            Each guide states the audience, buying stage, outcome, and format
            &mdash; and routes you to the right next step. Filter to your
            context.
          </p>
        </div>

        {/* Filter Box Container */}
        <div className="w-full rounded-2xl bg-[#131C2B] border border-slate-800/80 p-6 md:p-8 backdrop-blur-md mb-10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-800/80">
            <span className="text-xs font-mono font-bold text-[#20E7F2] uppercase tracking-[1px]">
              {filteredGuides.length}{" "}
              <span className="text-slate-400">guides</span>
            </span>
            <button
              onClick={handleReset}
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer self-start md:self-auto"
            >
              Reset filters
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Buyer Role Filters */}
            <div className="lg:col-span-6 flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                BUYER ROLE
              </span>
              <div className="flex flex-wrap gap-2 max-w-md">
                {roleFilters.map((role) => {
                  const isActive = selectedRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(isActive ? null : role)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                          : "bg-[#050A17] text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buying Stage Filters */}
            <div className="lg:col-span-3 flex flex-col gap-2 max-w-md">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                BUYING STAGE
              </span>
              <div className="flex flex-wrap gap-2">
                {stageFilters.map((stage) => {
                  const isActive = selectedStage === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setSelectedStage(isActive ? null : stage)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                          : "bg-[#050A17] text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asset Type Filters */}
            <div className="lg:col-span-3 flex flex-col gap-2 max-w-md">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                ASSET TYPE
              </span>
              <div className="flex flex-wrap gap-2">
                {assetFilters.map((asset) => {
                  const isActive = selectedAsset === asset;
                  return (
                    <button
                      key={asset}
                      onClick={() => setSelectedAsset(isActive ? null : asset)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                          : "bg-[#050A17] text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {asset}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6 Guide Cards Grid */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {filteredGuides.map((guide) => (
              <motion.div
                key={guide.id}
                variants={cardVariants}
                layout
                className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#162235] transition-all duration-300 backdrop-blur-sm min-h-[300px]"
              >
                <div>
                  {/* Top Tags/Pills Row matching exact design style */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {guide.roles.map((r, i) => (
                      <span
                        key={i}
                        className="p-6 rounded-[14px] bg-[#20E7F20D] border border-[#20E7F24D] text-xs font-mono font-medium text-[#00E5FF] tracking-wide"
                      >
                        {r}
                      </span>
                    ))}
                    <span className="p-6 rounded-[14px] border border-[#7AA0BE24] text-xs font-mono font-medium text-slate-300 tracking-wide">
                      {guide.buyingStage}
                    </span>
                    <span className="p-6 rounded-[14px] border border-[#7AA0BE24] text-xs font-mono font-medium text-[#00E5FF] tracking-wide">
                      {guide.gateTag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                    {guide.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed mb-5">
                    {guide.description}
                  </p>

                  {/* Takeaway / Bullet Point without inner box */}
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mb-8">
                    <span className="text-[#00E5FF] font-bold mt-0.5">
                      &bull;
                    </span>
                    <p>
                      <span className="font-semibold">
                        You learn:
                      </span>{" "}
                      {guide.takeaway}
                    </p>
                  </div>
                </div>

                {/* Footer Meta & CTAs */}
                <div className="pt-6 border-t border-slate-800/80 flex flex-col justify-between gap-4">
                  <span className="text-xs font-mono text-[#C3CCD6] tracking-wide">
                    {guide.metaInfo}
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#20E7F2] to-[#00C8F0] text-slate-950 font-bold text-xs hover:bg-[#00cce6] transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-[0.98]">
                      {guide.ctaText}
                    </button>
                    <button className="text-xs font-mono font-semibold text-[#00E5FF] hover:text-cyan-300 transition-colors tracking-[1px]">
                      {guide.secondaryCta}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
