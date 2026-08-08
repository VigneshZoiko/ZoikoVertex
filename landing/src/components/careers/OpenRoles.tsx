"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, ChevronDown } from "lucide-react";

interface Role {
  id: string;
  title: string;
  description: string;
  locationType: "Remote" | "Hybrid";
}

interface CategoryGroup {
  category: string;
  openCount: number;
  roles: Role[];
}

const jobCategories: CategoryGroup[] = [
  {
    category: "AI & AGENT SYSTEMS",
    openCount: 2,
    roles: [
      {
        id: "ai-eng-agent-systems",
        title: "AI Engineer — Agent Systems",
        description:
          "Design and constrain AI agents that operate within defined governance boundaries.",
        locationType: "Remote",
      },
      {
        id: "ml-eng-gov-intelligence",
        title: "ML Engineer — Governance Intelligence",
        description:
          "Build risk classification, anomaly detection, and governance posture scoring.",
        locationType: "Remote",
      },
    ],
  },
  {
    category: "CUSTOMER SUCCESS",
    openCount: 1,
    roles: [
      {
        id: "csm-enterprise",
        title: "Customer Success Manager — Enterprise",
        description:
          "Own post-sale governance configuration, adoption, and expansion for enterprise accounts.",
        locationType: "Remote",
      },
    ],
  },
  {
    category: "DESIGN",
    openCount: 1,
    roles: [
      {
        id: "snr-product-designer",
        title: "Senior Product Designer",
        description:
          "Design the governance interfaces, approval UX, and evidence visualization that enterprise teams rely on.",
        locationType: "Remote",
      },
    ],
  },
  {
    category: "ENGINEERING",
    openCount: 3,
    roles: [
      {
        id: "snr-swe-platform-core",
        title: "Senior Software Engineer — Platform Core",
        description:
          "Build the core workflow, evidence, and audit infrastructure that enterprise customers trust.",
        locationType: "Remote",
      },
      {
        id: "staff-eng-ai-orchestration",
        title: "Staff Engineer — AI Orchestration",
        description:
          "Lead architecture for multi-agent orchestration, policy enforcement, and evidence capture.",
        locationType: "Remote",
      },
      {
        id: "eng-sec-evidence-systems",
        title: "Engineer — Security & Evidence Systems",
        description:
          "Build identity ledger, audit trail, and forensic hub infrastructure for governance.",
        locationType: "Hybrid",
      },
    ],
  },
  {
    category: "GROWTH & SALES",
    openCount: 2,
    roles: [
      {
        id: "enterprise-ae",
        title: "Enterprise Account Executive",
        description:
          "Sell governed AI execution to CMOs, CIOs, and heads of marketing operations at enterprise companies.",
        locationType: "Remote",
      },
      {
        id: "solutions-architect",
        title: "Solutions Architect",
        description:
          "Own technical pre-sales for enterprise deals: architecture reviews, governance demos, and integration design.",
        locationType: "Remote",
      },
    ],
  },
  {
    category: "OPERATIONS",
    openCount: 1,
    roles: [
      {
        id: "head-of-ops",
        title: "Head of Operations",
        description:
          "Build and run the operational infrastructure: finance, legal ops, hiring, vendor management, and governance processes.",
        locationType: "Hybrid",
      },
    ],
  },
  {
    category: "PRODUCT",
    openCount: 2,
    roles: [
      {
        id: "pm-approval-workflows",
        title: "Product Manager — Approval Workflows",
        description:
          "Own the approval workflow product: role routing, SLA controls, evidence linkage, and enterprise configuration.",
        locationType: "Remote",
      },
      {
        id: "pm-platform",
        title: "Product Manager — Platform",
        description:
          "Drive the core platform roadmap: agentic architecture, integrations, and executive command center.",
        locationType: "Hybrid",
      },
    ],
  },
  {
    category: "SECURITY & GOVERNANCE",
    openCount: 1,
    roles: [
      {
        id: "sec-eng-governance",
        title: "Security Engineer — Governance",
        description:
          "Own access control, tenant isolation, audit logging, and responsible AI controls.",
        locationType: "Hybrid",
      },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
} as const;

export default function OpenRoles() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="w-full bg-[#F2F4F8] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-[#0F172A]">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#080E1A73]">
              OPEN ROLES • 13 OPEN ROLES
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] mb-4 leading-tight">
            Find your place.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] font-normal max-w-2xl">
            Positions across engineering, product, design, GTM, and operations.
            Remote-friendly where the role permits.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-12">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles by team, skill, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D2B4]/50 transition-all shadow-sm"
            />
          </div>

          {/* Filter Dropdowns & Role Counter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[160px]">
              <select className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 pr-8 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00D2B4]/50 cursor-pointer shadow-sm">
                <option value="all">All departments</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative min-w-[140px]">
              <select className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 pr-8 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00D2B4]/50 cursor-pointer shadow-sm">
                <option value="all">All locations</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="font-mono text-xs text-[#64748B] pl-2 whitespace-nowrap">
              13 roles
            </span>
          </div>
        </div>

        {/* Roles List Grouped by Category */}
        <div className="space-y-10 mb-12">
          {jobCategories.map((group) => (
            <motion.div key={group.category} variants={itemVariants}>
              {/* Group Category Heading */}
              <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-2 mb-4">
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#64748B] uppercase">
                  {group.category}
                </span>
                <span className="font-mono text-[11px] text-[#94A3B8]">
                  • {group.openCount} OPEN
                </span>
              </div>

              {/* Group Roles */}
              <div className="space-y-3">
                {group.roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 sm:p-5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-1">
                        {role.title}
                      </h3>
                      <p className="text-xs text-[#64748B] font-normal leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    {/* Location Badge */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B]">
                        <MapPin className="w-3 h-3" />
                        <span>{role.locationType}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-semibold border ${
                          role.locationType === "Remote"
                            ? "bg-[#E6F1FB] border-[#B5D4F4] text-[#185FA5]"
                            : "bg-[#EEF2FF] border-[#818CF8]/40 text-[#4F46E5]"
                        }`}
                      >
                        {role.locationType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Disclaimer Box */}
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl bg-white shadow-sm"
        >
          <p className="font-mono text-[14px] text-[#68758A] leading-relaxed">
            <strong className="text-[#0F172A]">Note:</strong> ZoikoVertex does
            not charge candidate application or placement fees. All genuine
            opportunities are posted on this page only. We partner with approved
            agencies — unsolicited agency submissions will not be considered.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
