"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface TagBadge {
  label: string;
  type: "category" | "status" | "action" | "preview";
  variant?: "emerald" | "cyan" | "amber" | "purple" | "slate";
}

interface UpdateFeedItem {
  id: string;
  title: string;
  date: string;
  description: string;
  badges: TagBadge[];
  modules: string;
  affects: string;
  readUpdateHref: string;
  docsHref: string;
  categoryFilter: string;
}

const categories = [
  "All",
  "Agentic Architecture",
  "Execution",
  "Approvals",
  "ROI",
  "Integrations",
  "Governance",
  "Security",
  "Responsible AI",
  "Auditability",
];

const feedData: UpdateFeedItem[] = [
  {
    id: "feed-1",
    categoryFilter: "Auditability",
    title: "New Evidence Vault controls for sealed AI outputs",
    date: "Jan 14, 2026",
    description:
      "Sealed evidence packages now carry stronger tamper-evident controls and export logging, so proof holds up in security and procurement review.",
    badges: [
      { label: "Auditability", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
      { label: "Action recommended", type: "action", variant: "amber" },
    ],
    modules: "Evidence Layer, Audit Trail",
    affects: "Governance, Security",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-2",
    categoryFilter: "Approvals",
    title: "Approval SLA escalation rules",
    date: "Jan 10, 2026",
    description:
      "Approvals now escalate automatically when SLAs are at risk — fewer stalled campaigns without bypassing review gates.",
    badges: [
      { label: "Approvals", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
    ],
    modules: "Approval Workflows",
    affects: "Admins, Approvers",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-3",
    categoryFilter: "Integrations",
    title: "Salesforce & HubSpot connector v2",
    date: "Jan 8, 2026",
    description:
      "A rebuilt connector with signed events and richer field mapping is rolling out tenant-by-tenant. Reconnect required to enable v2.",
    badges: [
      { label: "Integrations", type: "category", variant: "cyan" },
      { label: "Rolling Out", type: "status", variant: "cyan" },
      { label: "Action required", type: "action", variant: "amber" },
    ],
    modules: "Integrations",
    affects: "Developers, Admins",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-4",
    categoryFilter: "Responsible AI",
    title: "Configurable autonomy thresholds for governed agents",
    date: "Jan 5, 2026",
    description:
      "Set how far agents can act before a human checkpoint is required, lowering risk while preserving speed.",
    badges: [
      { label: "Responsible AI", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
      { label: "Action recommended", type: "action", variant: "amber" },
    ],
    modules: "Agentic Architecture",
    affects: "Governance",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-5",
    categoryFilter: "Security",
    title: "Privileged-action logging in Identity Ledger",
    date: "Jan 3, 2026",
    description:
      "Privileged actions are now logged and identity-bound. Review admin permissions so actions are attributed correctly.",
    badges: [
      { label: "Security", type: "category", variant: "cyan" },
      { label: "Action Required", type: "action", variant: "amber" },
      { label: "Action required", type: "action", variant: "amber" },
    ],
    modules: "Identity Ledger",
    affects: "Security, Admins",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-6",
    categoryFilter: "ROI",
    title: "Executive Command Center ROI drilldowns",
    date: "Dec 20, 2025",
    description:
      "Executives can drill from portfolio ROI into the workflows and approvals driving it — measurable value, on demand.",
    badges: [
      { label: "ROI", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
    ],
    modules: "Command Center, ROI Engine",
    affects: "Executives",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-7",
    categoryFilter: "Auditability",
    title: "Hash-chain validation for audit exports",
    date: "Dec 15, 2025",
    description:
      "Exported audit bundles include hash-chain validation so reviewers can verify nothing was altered since sealing.",
    badges: [
      { label: "Auditability", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
    ],
    modules: "Audit Trail, Evidence Vault",
    affects: "Governance, Security",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-8",
    categoryFilter: "Workflows",
    title: "Workflow branching & conditional routing",
    date: "Dec 10, 2025",
    description:
      "Route work down different paths based on conditions — faster execution for complex campaigns. Available in beta.",
    badges: [
      { label: "Workflows", type: "category", variant: "cyan" },
      { label: "Beta", type: "status", variant: "purple" },
      { label: "Action recommended", type: "action", variant: "amber" },
    ],
    modules: "Orchestration",
    affects: "Operators",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-9",
    categoryFilter: "Integrations",
    title: "Webhooks 2.0 with signed payloads",
    date: "Dec 5, 2025",
    description:
      "Signed, versioned webhook payloads for safer integrations. Available to selected enterprise customers.",
    badges: [
      { label: "Integrations", type: "category", variant: "cyan" },
      { label: "Enterprise Preview", type: "preview", variant: "amber" },
      { label: "Action recommended", type: "action", variant: "amber" },
    ],
    modules: "API & Webhooks",
    affects: "Developers",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-10",
    categoryFilter: "Governance",
    title: "Redaction controls for evidence exports",
    date: "Nov 28, 2025",
    description:
      "Protect sensitive fields in exports and reviews without breaking record integrity.",
    badges: [
      { label: "Governance", type: "category", variant: "cyan" },
      { label: "Released", type: "status", variant: "emerald" },
      { label: "Action recommended", type: "action", variant: "amber" },
    ],
    modules: "Evidence Layer",
    affects: "Governance, Legal",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-11",
    categoryFilter: "Governance",
    title: "Data retention policy scheduler",
    date: "Nov 20, 2025",
    description:
      "Schedule retention by class and jurisdiction. Rolling out with a required retention-setting review.",
    badges: [
      { label: "Governance", type: "category", variant: "cyan" },
      { label: "Rolling Out", type: "status", variant: "cyan" },
      { label: "Action required", type: "action", variant: "amber" },
    ],
    modules: "Admin",
    affects: "Admins",
    readUpdateHref: "#",
    docsHref: "#",
  },
  {
    id: "feed-12",
    categoryFilter: "Integrations",
    title: "Legacy CSV export endpoint deprecation",
    date: "Nov 10, 2025",
    description:
      "The legacy CSV export endpoint is being retired. Migrate to the new export API before March 31, 2026.",
    badges: [
      { label: "Integrations", type: "category", variant: "cyan" },
      { label: "Deprecated", type: "status", variant: "slate" },
      { label: "Action required", type: "action", variant: "amber" },
    ],
    modules: "API",
    affects: "Developers",
    readUpdateHref: "#",
    docsHref: "#",
  },
];

const getBadgeClasses = (badge: TagBadge) => {
  switch (badge.variant) {
    case "emerald":
      return "text-[#3FD6A0] border-[#3FD6A04D]";
    case "amber":
      return "text-[#F2B53C] border-[#F2B53C4D]";
    case "purple":
      return "bg-purple-950/60 text-purple-300 border-purple-800/50";
    case "slate":
      return "bg-slate-900/80 text-slate-400 border-slate-700/60";
    case "cyan":
    default:
      return "bg-[#0D1B2A] text-[#00E5FF] border-[#0A8FA64D]";
  }
};

export default function UpdateFeedSection() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const filteredFeed = useMemo(() => {
    return feedData.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.categoryFilter === selectedCategory;

      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.modules.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.affects.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section className="relative w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-950/10 blur-[200px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="mb-10 text-left">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              UPDATE FEED
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl max-w-2xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Every release, searchable and tagged.
          </h2>

          {/* Description */}
          <p className="text-slate-400 max-w-120 text-xs sm:text-sm font-normal leading-relaxed">
            Filter by category, status, and impact. Switch between executive
            summaries and a technical table view.
          </p>
        </div>

        {/* Controls Bar: Search Input, Category Filter Pills & View Toggle */}
        <div className="w-full bg-[#131C2B] border border-[#7AA0BE24] rounded-2xl p-6 space-y-5 text-slate-300">
          {/* Search Input Box */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates by module, feature, integration, governance area, status, or keyword..."
              className="w-full bg-[#050913] border border-slate-800/90 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-[8px] text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#20E7F21F] text-[#20E7F2] border border-[#20E7F2]"
                      : "bg-[#050A17] text-slate-300 border border-slate-800/80 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Results Count, Sort Dropdown & View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
            {/* Count & Sort */}
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div>
                <strong className="text-[#00E5FF] font-semibold">
                  {filteredFeed.length}
                </strong>{" "}
                <span>updates</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Sort</span>
                <select className="bg-[#050913] border border-slate-800 rounded-xl px-10 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer">
                  <option value="Newest">Newest</option>
                  <option value="Oldest">Oldest</option>
                </select>
              </div>
            </div>

            {/* View Switcher */}
            <div className="flex items-center border border-[#7AA0BE42] rounded-2xl p-1 font-mono text-xs">
              <button
                onClick={() => setViewMode("card")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-[#20E7F21F] text-[#20E7F2] font-medium"
                    : "text-[#8B97A6] hover:text-slate-200"
                }`}
              >
                Executive cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#112331] text-[#00E5FF] font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Technical table
              </button>
            </div>
          </div>
        </div>

        {/* Update List Feed Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory + searchQuery + viewMode}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full space-y-4 mt-8"
          >
            {filteredFeed.length > 0 ? (
              filteredFeed.map((item) => (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  className="rounded-2xl bg-[#131C2B] border border-[#7AA0BE24] hover:border-slate-700 p-6 sm:p-7 transition-all duration-200 backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.4)] group"
                >
                  {/* Top Bar: Badges & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-0.5 tracking-[1px] rounded-md border text-[11px] font-mono font-medium flex items-center gap-1.5 ${getBadgeClasses(
                            badge,
                          )}`}
                        >
                          {badge.type === "status" && (
                            <span className="w-1 h-1 rounded-full bg-current" />
                          )}
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <span className="text-xs font-mono text-slate-500">
                      {item.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-white transition-colors tracking-tight mb-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[#8B97A6] max-w-xl font-normal leading-relaxed mb-6">
                    {item.description}
                  </p>

                  {/* Footer: Metadata & Links */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/50 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-x-4 tracking-[1px] gap-y-1 text-slate-500">
                      <span>
                        Modules &bull;{" "}
                        <span className="text-slate-400">{item.modules}</span>
                      </span>
                      <span>
                        Affects &bull;{" "}
                        <span className="text-slate-400">{item.affects}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 tracking-[1px] shrink-0 font-semibold">
                      <a
                        href={item.readUpdateHref}
                        className="inline-flex items-center gap-1 text-[#20E7F2] hover:text-cyan-300 transition-colors group/link"
                      >
                        <span>Read update</span>
                        <span className="group-hover/link:translate-x-0.5 transition-transform">
                          &rarr;
                        </span>
                      </a>
                      <a
                        href={item.docsHref}
                        className="inline-flex items-center gap-1 text-[#20E7F2] hover:text-slate-200 transition-colors group/link"
                      >
                        <span>Docs</span>
                        <span className="group-hover/link:translate-x-0.5 transition-transform">
                          &rarr;
                        </span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 bg-[#070E18]/50 border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-sm font-mono">
                  No updates found matching your search criteria.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
