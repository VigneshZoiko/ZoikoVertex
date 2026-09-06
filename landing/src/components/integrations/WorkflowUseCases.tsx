"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

interface UseCaseCard {
  id: string;
  category: string;
  title: string;
  problem: string;
  solution: string;
  ctaText: string;
  href: string;
}

const USE_CASES: UseCaseCard[] = [
  {
    id: "1",
    category: "SOCIAL",
    title: "Governed social publishing",
    problem: "Teams publish across channels without consistent review.",
    solution:
      "Connect social platforms to AI workflows, approvals, policy checks, and evidence records.",
    ctaText: "See publishing workflow →",
    href: "/ai-workflow-orchestration",
  },
  {
    id: "2",
    category: "CRM",
    title: "CRM-driven campaign execution",
    problem:
      "Campaign actions are disconnected from customer and revenue data.",
    solution: "Connect CRM segments to agentic workflows and ROI measurement.",
    ctaText: "Map CRM stack →",
    href: "/roi-engine",
  },
  {
    id: "3",
    category: "COLLABORATION",
    title: "Approval routing in Slack / Teams",
    problem: "Approvals get lost in chat and email.",
    solution:
      "Route review requests into collaboration tools while ZoikoVertex stays the system of record.",
    ctaText: "Design approval flow →",
    href: "/approval-workflows",
  },
  {
    id: "4",
    category: "ANALYTICS",
    title: "Analytics-to-ROI loop",
    problem: "Marketing performance is visible but not governed.",
    solution:
      "Connect performance data to the ROI Engine and Executive Command Center.",
    ctaText: "View ROI Engine →",
    href: "/executive-command-center",
  },
  {
    id: "5",
    category: "COMPLIANCE",
    title: "Compliance evidence export",
    problem: "Audit proof is manual and scattered.",
    solution: "Generate controlled evidence bundles from integrated workflows.",
    ctaText: "View governance audit →",
    href: "/audit-engine",
  },
  {
    id: "6",
    category: "IDENTITY",
    title: "Identity-scoped access",
    problem: "Integrations often over-grant access by default.",
    solution:
      "Bind every connected action to role, scope, and tenant with SSO and SCIM.",
    ctaText: "View security controls →",
    href: "/security",
  },
];

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function WorkflowUseCases() {
  return (
    <div className="relative w-full bg-[#08101F] text-slate-300 font-sans antialiased p-6 md:p-12 lg:p-16 flex items-center justify-center overflow-hidden">
      <div className="max-w-7xl w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-widest uppercase">
            <span className="w-3 h-[1px] bg-[#20E7F2] inline-block" />
            <span>WORKFLOW USE CASES</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Connectors become business outcomes.
          </h1>
        </motion.div>

        {/* 3-Column Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {USE_CASES.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              whileHover={{
                y: -4,
                borderColor: "rgba(32, 231, 242, 0.4)",
                boxShadow: "0 0 25px rgba(32,231,242,0.08)",
              }}
              className="group bg-gradient-to-b from-[#131C2B] to-[#0B1524] rounded-2xl border border-[#7AA0BE]/26 p-6 flex flex-col justify-between transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Category Header */}
                <div className="text-[10px] font-mono font-semibold text-[#0A8FA6] uppercase tracking-wider">
                  {item.category}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white group-hover:text-[#20E7F2] transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Problem Statement */}
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  {item.problem}
                </p>

                {/* Divider */}
                <div className="w-full h-[1px] bg-[#7AA0BE]/15" />

                {/* Solution Statement */}
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  {item.solution}
                </p>
              </div>

              {/* Action Link CTA */}
              <div className="pt-6 mt-4 flex items-center text-xs font-mono text-[#20E7F2] group-hover:underline">
                <Link href={item.href}>{item.ctaText}</Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
