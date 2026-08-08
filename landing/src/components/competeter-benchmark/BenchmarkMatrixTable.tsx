"use client";

import React from "react";
import { motion } from "framer-motion";

type TagType = "Native" | "Varies" | "Limited" | "Strong";

interface RowData {
  capability: string;
  description: string;
  projectTools: { tag: TagType; text: string };
  marketingAuto: { tag: TagType; text: string };
  aiCopilots: { tag: TagType; text: string };
  workflowAuto: { tag: TagType; text: string };
  zoikoVertex: { tag: TagType; text: string };
}

interface CategorySection {
  title: string;
  rows: RowData[];
}

const matrixData: CategorySection[] = [
  {
    title: "EXECUTION & AGENCY",
    rows: [
      {
        capability: "Agentic execution",
        description: "Autonomous AI work within defined policy boundaries",
        projectTools: { tag: "Limited", text: "Task routing only" },
        marketingAuto: { tag: "Limited", text: "Campaign steps only" },
        aiCopilots: { tag: "Varies", text: "Generates — rarely executes" },
        workflowAuto: {
          tag: "Varies",
          text: "Rule-based, not policy-governed",
        },
        zoikoVertex: {
          tag: "Native",
          text: "Governed autonomous execution with approval gates",
        },
      },
      {
        capability: "Workflow orchestration",
        description: "Multi-step coordination across agents and humans",
        projectTools: { tag: "Limited", text: "Task dependencies only" },
        marketingAuto: { tag: "Varies", text: "Campaign journeys" },
        aiCopilots: { tag: "Limited", text: "Requires integration" },
        workflowAuto: { tag: "Strong", text: "Trigger-action flows" },
        zoikoVertex: {
          tag: "Native",
          text: "Governed orchestration + SLAs + escalation",
        },
      },
    ],
  },
  {
    title: "GOVERNANCE & CONTROL",
    rows: [
      {
        capability: "Approval workflows",
        description: "Role-based, multi-step human approval chains",
        projectTools: { tag: "Limited", text: "Basic or external" },
        marketingAuto: { tag: "Varies", text: "Campaign-level only" },
        aiCopilots: { tag: "Limited", text: "Usually external" },
        workflowAuto: { tag: "Varies", text: "Requires configuration" },
        zoikoVertex: {
          tag: "Native",
          text: "Role-based, escalation, decision linkage",
        },
      },
      {
        capability: "Policy enforcement",
        description: "Rules that block, route, or escalate based on risk",
        projectTools: { tag: "Limited", text: "Admin permissions" },
        marketingAuto: { tag: "Varies", text: "Suite-dependent" },
        aiCopilots: { tag: "Limited", text: "Emerging in some tools" },
        workflowAuto: { tag: "Varies", text: "IT-managed rules" },
        zoikoVertex: {
          tag: "Native",
          text: "Policy gates, brand rules, risk tiers",
        },
      },
      {
        capability: "Risk classification",
        description:
          "Automatic risk scoring per action — Low / Medium / High / Critical",
        projectTools: { tag: "Limited", text: "Not available" },
        marketingAuto: { tag: "Limited", text: "Lead scoring only" },
        aiCopilots: { tag: "Limited", text: "Not available" },
        workflowAuto: { tag: "Limited", text: "Manual config" },
        zoikoVertex: {
          tag: "Native",
          text: "4-tier automatic risk classification",
        },
      },
    ],
  },
  {
    title: "EVIDENCE & AUDITABILITY",
    rows: [
      {
        capability: "Audit trails",
        description: "Linked, reviewable event records for every action",
        projectTools: { tag: "Varies", text: "Activity history" },
        marketingAuto: { tag: "Varies", text: "Campaign logs" },
        aiCopilots: { tag: "Varies", text: "Prompt history varies" },
        workflowAuto: { tag: "Varies", text: "Automation event logs" },
        zoikoVertex: {
          tag: "Native",
          text: "Audit Trail + Decision Ledger linked",
        },
      },
      {
        capability: "Evidence vault",
        description: "Sealed, searchable, exportable proof records",
        projectTools: { tag: "Limited", text: "Not available" },
        marketingAuto: { tag: "Limited", text: "Not available" },
        aiCopilots: { tag: "Limited", text: "Not available" },
        workflowAuto: { tag: "Limited", text: "Not available" },
        zoikoVertex: {
          tag: "Native",
          text: "Sealed, searchable, legal-hold supported",
        },
      },
      {
        capability: "Identity binding",
        description:
          "Actions tied to verified actor identity and role at time of execution",
        projectTools: { tag: "Limited", text: "User accounts only" },
        marketingAuto: { tag: "Limited", text: "User attribution" },
        aiCopilots: { tag: "Limited", text: "Not available" },
        workflowAuto: { tag: "Varies", text: "User auth logs" },
        zoikoVertex: {
          tag: "Native",
          text: "Identity Ledger — role + session + scope",
        },
      },
    ],
  },
  {
    title: "INTELLIGENCE & VISIBILITY",
    rows: [
      {
        capability: "ROI intelligence",
        description:
          "Execution tied to measurable financial and governance outcomes",
        projectTools: { tag: "Limited", text: "Manual reporting" },
        marketingAuto: { tag: "Varies", text: "Marketing metrics" },
        aiCopilots: { tag: "Limited", text: "Not available" },
        workflowAuto: { tag: "Varies", text: "Process metrics" },
        zoikoVertex: {
          tag: "Native",
          text: "ROI Engine tied to execution + governance",
        },
      },
      {
        capability: "Executive command",
        description: "Risk, ROI, workload, and governance in one unified view",
        projectTools: { tag: "Limited", text: "Portfolio dashboards" },
        marketingAuto: { tag: "Varies", text: "Campaign dashboards" },
        aiCopilots: { tag: "Limited", text: "Not available" },
        workflowAuto: { tag: "Varies", text: "Operational view" },
        zoikoVertex: {
          tag: "Native",
          text: "Unified risk + ROI + governance posture",
        },
      },
      {
        capability: "Responsible AI",
        description:
          "Framework-aligned AI governance: NIST AI RMF, ISO 42001, EU AI Act concepts",
        projectTools: { tag: "Limited", text: "Emerging" },
        marketingAuto: { tag: "Limited", text: "Ad hoc" },
        aiCopilots: { tag: "Varies", text: "Content filtering only" },
        workflowAuto: { tag: "Limited", text: "Not available" },
        zoikoVertex: {
          tag: "Native",
          text: "Policy + oversight + evidence + lifecycle",
        },
      },
    ],
  },
];

const renderTag = (type: TagType) => {
  switch (type) {
    case "Native":
      return (
        <span className="inline-flex items-center gap-1 bg-[#FDE68A]/20 text-[#D97706] border border-[#F59E0B]/30 font-mono text-[10px] font-semibold px-2 py-0.5 rounded">
          ✓ Native
        </span>
      );
    case "Strong":
      return (
        <span className="inline-flex items-center gap-1 bg-[#FDE68A]/20 text-[#D97706] border border-[#F59E0B]/30 font-mono text-[10px] font-semibold px-2 py-0.5 rounded">
          ✓ Strong
        </span>
      );
    case "Varies":
      return (
        <span className="inline-flex items-center bg-[#FEF3C7]/10 text-[#F59E0B] border border-[#F59E0B]/20 font-mono text-[10px] font-medium px-2 py-0.5 rounded">
          Varies
        </span>
      );
    case "Limited":
    default:
      return (
        <span className="inline-flex items-center bg-slate-800/60 text-[#64748B] border border-slate-700/50 font-mono text-[10px] font-medium px-2 py-0.5 rounded">
          Limited
        </span>
      );
  }
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
} as const;

export default function BenchmarkMatrixTable() {
  return (
    <section className="w-full bg-[#F4F6FB] py-16 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Header Block */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#64748B]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#68758A]">
              BENCHMARK MATRIX
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0F1929] mb-4">
            How the categories compare across 12 governance dimensions.
          </h2>
          <p className="text-sm text-[#68758A] max-w-5xl leading-relaxed">
            Based on enterprise procurement criteria drawn from NIST AI RMF,
            ISO/IEC 42001, and governance frameworks used by regulated
            enterprise buyers. Not a product feature checklist.
          </p>
        </div>

        {/* Legend Box */}
        <div className="bg-white border border-[#DDE2ED] rounded-[10px] p-4 mb-8 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="bg-[#C9A84C1F] text-[#7A5A1A] border border-[#C9A84C4D] font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full">
              ✓ Native
            </span>
            <span className="text-sm text-[#3A4558]">
              Built into the product architecture — not an add-on
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#F59E0B1A] text-[#92580A] border border-[#F59E0B38] font-mono text-[10px] font-medium px-2 py-0.5 rounded-full">
              Varies
            </span>
            <span className="text-sm text-[#3A4558]">
              Available but configuration-dependent or suite-specific
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#F0F2F7] text-[#9AA3B2] border border-[#DDE2ED] font-mono text-[10px] font-medium px-2 py-0.5 rounded">
              Limited
            </span>
            <span className="text-sm text-[#3A4558]">
              Partial capability or requires additional tooling
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-[#DDE2ED] bg-white shadow-sm">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#0B101D] text-white">
                <th className="py-4 px-4 font-mono text-[11px] font-semibold tracking-wider uppercase w-[22%]">
                  Capability
                </th>
                <th className="py-4 px-3 font-mono text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase text-center w-[15.5%]">
                  Project & work tools
                </th>
                <th className="py-4 px-3 font-mono text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase text-center w-[15.5%]">
                  Marketing automation
                </th>
                <th className="py-4 px-3 font-mono text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase text-center w-[15.5%]">
                  AI copilots
                </th>
                <th className="py-4 px-3 font-mono text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase text-center w-[15.5%]">
                  Workflow automation
                </th>
                <th className="py-4 px-3 font-mono text-[11px] font-bold tracking-wider text-[#20E7F2] uppercase text-center w-[16%] bg-[#C9A84C1A]">
                  ZoikoVertex
                </th>
              </tr>
            </thead>

            <tbody>
              {matrixData.map((category) => (
                <React.Fragment key={category.title}>
                  <tr className="border-t border-b border-[#E2E8F0] bg-[#EEF2F6]">
                    <td
                      colSpan={6}
                      className="py-2.5 px-4 font-mono text-[11px] font-bold tracking-[0.12em] text-[#334155] uppercase"
                    >
                      {category.title}
                    </td>
                  </tr>

                  {category.rows.map((row) => (
                    <tr
                      key={row.capability}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150"
                    >
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-xs sm:text-[13px] text-[#0F172A] mb-1">
                          {row.capability}
                        </div>
                        <div className="text-[11px] text-[#64748B] leading-normal font-normal">
                          {row.description}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top text-center border-l border-[#E2E8F0]">
                        <div className="mb-2 flex justify-center">
                          {renderTag(row.projectTools.tag)}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {row.projectTools.text}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top text-center border-l border-[#E2E8F0]">
                        <div className="mb-2 flex justify-center">
                          {renderTag(row.marketingAuto.tag)}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {row.marketingAuto.text}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top text-center border-l border-[#E2E8F0]">
                        <div className="mb-2 flex justify-center">
                          {renderTag(row.aiCopilots.tag)}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {row.aiCopilots.text}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top text-center border-l border-[#E2E8F0]">
                        <div className="mb-2 flex justify-center">
                          {renderTag(row.workflowAuto.tag)}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {row.workflowAuto.text}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top text-center bg-[#FEFCE8]/40 border-l border-[#E2E8F0]">
                        <div className="mb-2 flex justify-center">
                          {renderTag(row.zoikoVertex.tag)}
                        </div>
                        <div className="text-[11px] font-medium text-[#1E293B]">
                          {row.zoikoVertex.text}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <p className="mt-4 font-mono text-[10px] text-[#64748B] leading-relaxed">
          Category descriptions reflect general market positioning as of current
          review. No specific vendor capabilities are claimed. Enterprise buyers
          should verify directly with providers. Named-vendor claims require
          evidence, review, and approval before publication.
        </p>
      </motion.div>
    </section>
  );
}
