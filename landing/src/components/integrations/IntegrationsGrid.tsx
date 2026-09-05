"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";

interface IntegrationItem {
  id: string;
  initials: string;
  name: string;
  category: string;
  badge: string;
  badgeType: "native" | "api" | "partner" | "custom" | "roadmap";
  description: string;
  tags: string[];
  ctaText?: string;
}

const CATEGORIES = [
  "All",
  "Social & Publishing",
  "CRM & Customer",
  "Content & Asset",
  "Analytics & BI",
  "Workflow & Collaboration",
  "Identity & Security",
  "Compliance & Evidence",
  "Developer & API",
];

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "1",
    initials: "L",
    name: "LinkedIn",
    category: "SOCIAL & PUBLISHING",
    badge: "Native",
    badgeType: "native",
    description: "Publish governed content with approval rails.",
    tags: ["Approval", "Routing", "Evidence"],
  },
  {
    id: "2",
    initials: "M",
    name: "Meta",
    category: "SOCIAL & PUBLISHING",
    badge: "API-ready",
    badgeType: "api",
    description: "Publish to Facebook properties with policy checks.",
    tags: ["Policy checks", "Audit event"],
  },
  {
    id: "3",
    initials: "I",
    name: "Instagram",
    category: "SOCIAL & PUBLISHING",
    badge: "API-ready",
    badgeType: "api",
    description: "Schedule and confirm governed posts.",
    tags: ["Approval", "Confirmation"],
  },
  {
    id: "4",
    initials: "X",
    name: "X",
    category: "SOCIAL & PUBLISHING",
    badge: "Roadmap",
    badgeType: "roadmap",
    description: "Post and receive status via webhooks.",
    tags: ["Webhook events", "Tagged"],
  },
  {
    id: "5",
    initials: "T",
    name: "TikTok",
    category: "SOCIAL & PUBLISHING",
    badge: "Roadmap",
    badgeType: "roadmap",
    description: "Planned governed marketing integration.",
    tags: ["Roadmap", "Evidence-ready"],
    ctaText: "Request connector →",
  },
  {
    id: "6",
    initials: "Y",
    name: "YouTube",
    category: "SOCIAL & PUBLISHING",
    badge: "API-ready",
    badgeType: "api",
    description: "Publish video assets with review.",
    tags: ["Approval", "Evidence"],
  },
  {
    id: "7",
    initials: "S",
    name: "Salesforce",
    category: "CRM & CUSTOMER",
    badge: "Native",
    badgeType: "native",
    description: "Connect campaigns to customer & revenue context.",
    tags: ["Scoped", "Audit event"],
  },
  {
    id: "8",
    initials: "H",
    name: "HubSpot",
    category: "CRM & CUSTOMER",
    badge: "Native",
    badgeType: "native",
    description: "Sync segments into agentic workflows.",
    tags: ["Role scoped", "Tagged"],
  },
  {
    id: "9",
    initials: "MD",
    name: "Microsoft Dynamics",
    category: "CRM & CUSTOMER",
    badge: "API-ready",
    badgeType: "api",
    description: "Map CRM events to governed execution.",
    tags: ["Data scope", "Evidence"],
  },
  {
    id: "10",
    initials: "ZC",
    name: "Zoho CRM",
    category: "CRM & CUSTOMER",
    badge: "Partner-supported",
    badgeType: "partner",
    description: "Partner-supported CRM connection.",
    tags: ["Scoped", "Partner-led"],
  },
  {
    id: "11",
    initials: "D",
    name: "DAM",
    category: "CONTENT & ASSET",
    badge: "API-ready",
    badgeType: "api",
    description: "Keep approved assets aligned to workflows.",
    tags: ["Asset", "Tokens", "Evidence"],
  },
  {
    id: "12",
    initials: "C",
    name: "CMS",
    category: "CONTENT & ASSET",
    badge: "API-ready",
    badgeType: "api",
    description: "Publish approved copy with proof.",
    tags: ["Approved", "Audit event"],
  },
  {
    id: "13",
    initials: "CS",
    name: "Cloud Storage",
    category: "CONTENT & ASSET",
    badge: "Native",
    badgeType: "native",
    description: "Store and retrieve governed assets.",
    tags: ["Scoped", "Evidence"],
  },
  {
    id: "14",
    initials: "G",
    name: "GA4",
    category: "ANALYTICS & BI",
    badge: "Native",
    badgeType: "native",
    description: "Turn execution data into governed analytics.",
    tags: ["Read", "Governed"],
  },
  {
    id: "15",
    initials: "L",
    name: "Looker",
    category: "ANALYTICS & BI",
    badge: "API-ready",
    badgeType: "api",
    description: "Feed performance into BI intelligence.",
    tags: ["Event", "Scoped"],
  },
  {
    id: "16",
    initials: "PB",
    name: "Power BI",
    category: "ANALYTICS & BI",
    badge: "API-ready",
    badgeType: "api",
    description: "Export governed metrics to BI.",
    tags: ["Export", "Tagged"],
  },
  {
    id: "17",
    initials: "T",
    name: "Tableau",
    category: "ANALYTICS & BI",
    badge: "API-ready",
    badgeType: "api",
    description: "Visualize governed execution data.",
    tags: ["Read", "Scoped"],
  },
  {
    id: "18",
    initials: "DW",
    name: "Data Warehouse",
    category: "ANALYTICS & BI",
    badge: "Native",
    badgeType: "native",
    description: "Stream governed events to your warehouse.",
    tags: ["Event stream", "Audit"],
  },
  {
    id: "19",
    initials: "S",
    name: "Slack",
    category: "WORKFLOW & COLLABORATION",
    badge: "Native",
    badgeType: "native",
    description: "Route approvals & alerts into channels.",
    tags: ["HITL", "Logged"],
  },
  {
    id: "20",
    initials: "MT",
    name: "Microsoft Teams",
    category: "WORKFLOW & COLLABORATION",
    badge: "Native",
    badgeType: "native",
    description: "Approvals and governance in daily work.",
    tags: ["HITL", "Evidence"],
  },
  {
    id: "21",
    initials: "J",
    name: "Jira",
    category: "WORKFLOW & COLLABORATION",
    badge: "API-ready",
    badgeType: "api",
    description: "Route governance actions into tickets.",
    tags: ["Ticketed", "Audit"],
  },
  {
    id: "22",
    initials: "A",
    name: "Asana",
    category: "WORKFLOW & COLLABORATION",
    badge: "API-ready",
    badgeType: "api",
    description: "Sync tasks with governed workflows.",
    tags: ["Scoped", "Tagged"],
  },
  {
    id: "23",
    initials: "M",
    name: "Monday",
    category: "WORKFLOW & COLLABORATION",
    badge: "Partner-supported",
    badgeType: "partner",
    description: "Partner-supported work management.",
    tags: ["Partner built", "Scoped"],
  },
  {
    id: "24",
    initials: "S",
    name: "SSO / SAML",
    category: "IDENTITY & SECURITY",
    badge: "Native",
    badgeType: "native",
    description: "Enterprise single sign-on.",
    tags: ["Assertion-bound", "Scoped"],
  },
  {
    id: "25",
    initials: "S",
    name: "SCIM",
    category: "IDENTITY & SECURITY",
    badge: "API-ready",
    badgeType: "api",
    description: "Automated provisioning & deprovisioning.",
    tags: ["Role sync", "Scoped"],
  },
  {
    id: "26",
    initials: "EI",
    name: "Enterprise IAM",
    category: "IDENTITY & SECURITY",
    badge: "API-ready",
    badgeType: "api",
    description: "Preserve institutional identity control.",
    tags: ["RBAC", "Audit-backed"],
  },
  {
    id: "27",
    initials: "AE",
    name: "Audit Export",
    category: "COMPLIANCE & EVIDENCE",
    badge: "Native",
    badgeType: "native",
    description: "Export structural evidence bundles.",
    tags: ["Export", "Log"],
  },
  {
    id: "28",
    initials: "LH",
    name: "Legal Hold System",
    category: "COMPLIANCE & EVIDENCE",
    badge: "API-ready",
    badgeType: "api",
    description: "Preserve evidence under legal hold.",
    tags: ["Retention", "Held"],
  },
  {
    id: "29",
    initials: "RA",
    name: "REST API",
    category: "DEVELOPER & API",
    badge: "Native",
    badgeType: "native",
    description: "Programmatic access to governed execution.",
    tags: ["Scoped tokens", "JSON"],
  },
  {
    id: "30",
    initials: "W",
    name: "Webhooks",
    category: "DEVELOPER & API",
    badge: "Native",
    badgeType: "native",
    description: "Subscribe to governed workflow events.",
    tags: ["Signed", "Payload"],
  },
  {
    id: "31",
    initials: "ES",
    name: "Event Streams",
    category: "DEVELOPER & API",
    badge: "Custom",
    badgeType: "custom",
    description: "Enterprise streaming for SIEM & DWH.",
    tags: ["Custom", "v1.0.0"],
  },
  {
    id: "32",
    initials: "CA",
    name: "Custom Apps",
    category: "DEVELOPER & API",
    badge: "Custom",
    badgeType: "custom",
    description: "Build approved custom integrations.",
    tags: ["Custom", "v1.0.0"],
  },
];

export default function IntegrationsGrid() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIntegrations = INTEGRATIONS.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getBadgeStyle = (type: IntegrationItem["badgeType"]) => {
    switch (type) {
      case "native":
        return "bg-[#20E7F2]/10 text-[#20E7F2] border-[#20E7F2]/25";
      case "api":
        return "bg-[#20E7F2]/10 text-[#20E7F2] border-[#20E7F2]/25";
      case "partner":
        return "bg-amber-500/10 text-amber-300 border-amber-500/25";
      case "custom":
        return "bg-amber-500/10 text-amber-300 border-amber-500/25";
      case "roadmap":
      default:
        return "bg-slate-800/80 text-slate-400 border-slate-700/60";
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030914] text-slate-300 font-sans antialiased p-6 md:p-12 lg:p-16 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-widest uppercase">
            <span className="w-3 h-[1px] bg-[#20E7F2] inline-block" />
            <span>INTEGRATION COVERAGE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Connect the stack you already
            <br />
            run.
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed font-normal">
            Coverage across marketing, social, CRM, content, analytics,
            workflow, identity, evidence, and developer systems — each with an
            honest status and a governance layer.
          </p>
        </div>

        {/* Filter & Search Toolbar Wrapper */}
        <div className="p-3 md:p-5 rounded-2xl bg-gradient-to-b from-[#131C2B] to-[#0B1524] border border-[#7AA0BE]/26 space-y-4 shadow-2xl">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by system, category, or use case — CRM, social, analytics, SSO, webhook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#030914]/90 text-xs text-slate-200 placeholder-slate-500 pl-10 pr-28 py-2.5 rounded-lg border border-[#7AA0BE]/20 focus:outline-none focus:border-[#20E7F2] transition-all font-sans"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
              32 connectors
            </span>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#20E7F21F] border border-[#20E7F2] text-[#20E7F2] font-semibold"
                    : "bg-[#030914]/80 text-slate-300 hover:text-white border border-[#7AA0BE]/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Legend Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#7AA0BE]/15 text-[10px] text-slate-400 font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                Native
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                API-ready
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Webhook
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Partner
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Custom
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Roadmap
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="text-[10px] font-mono text-slate-500 hover:text-[#20E7F2] transition-colors border-b border-slate-700 hover:border-[#20E7F2]"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 4-Column Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
        >
          {filteredIntegrations.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="group bg-gradient-to-b from-[#131C2B] to-[#0B1524] rounded-xl border border-[#7AA0BE]/26 p-4 flex flex-col justify-between hover:border-[#20E7F2]/40 transition-all hover:shadow-[0_0_20px_rgba(32,231,242,0.08)]"
            >
              <div className="space-y-3">
                {/* Initial Box + Name & Category */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {/* Letter Initial Avatar Box */}
                    <div className="w-7 h-7 rounded bg-[#030914] border border-[#7AA0BE]/30 flex items-center justify-center font-mono text-xs font-bold text-[#20E7F2] shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xs font-bold text-white group-hover:text-[#20E7F2] transition-colors leading-none">
                        {item.name}
                      </h3>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tight mt-1">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded border ${getBadgeStyle(
                      item.badgeType,
                    )}`}
                  >
                    • {item.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 leading-snug font-normal">
                  {item.description}
                </p>

                {/* Bullet Tags */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-[#C8954A] pt-0.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1">
                      <span className="text-[8px] text-[#C8954A]">•</span>
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* View details CTA button/link */}
              {/* <div className="pt-3 mt-3 border-t border-[#7AA0BE]/15 flex items-center justify-between text-[11px] font-mono text-[#20E7F2] hover:underline tracking-[1px] cursor-pointer">
                <span>{item.ctaText || "View details →"}</span>
              </div> */}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Disclaimer Paragraph */}
        <div className="">
          <p className="text-[14px] font-mono text-[#5F6D7E] max-w-6xl mx-auto leading-relaxed">
            Status badges reflect connection method, not endorsement.
            Logos/names shown are representative for this prototype;
            availability is confirmed during a stack assessment. No native-
            integration claim is implied before engineering confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
