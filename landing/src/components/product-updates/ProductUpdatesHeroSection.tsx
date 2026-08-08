"use client";

import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
} as const;

interface ReleaseItem {
  id: string;
  title: string;
  category: string;
  date: string;
  status: string;
  statusType: "released" | "rolling" | "action" | "governance" | "preview";
}

const timelineData: ReleaseItem[] = [
  {
    id: "1",
    title: "Evidence Vault sealed-output controls",
    category: "Auditability",
    date: "Jan 14",
    status: "Released",
    statusType: "released",
  },
  {
    id: "2",
    title: "Salesforce & HubSpot connector v2",
    category: "Integration",
    date: "Jan 8",
    status: "Rolling out",
    statusType: "rolling",
  },
  {
    id: "3",
    title: "Privileged-action logging",
    category: "Security",
    date: "Jan 3",
    status: "Action required",
    statusType: "action",
  },
  {
    id: "4",
    title: "Autonomy thresholds for agents",
    category: "Responsible AI",
    date: "Jan 5",
    status: "Governance",
    statusType: "governance",
  },
  {
    id: "5",
    title: "Webhooks 2.0 signed payloads",
    category: "Integration",
    date: "Dec 5",
    status: "Preview",
    statusType: "preview",
  },
];

const getStatusBadgeStyle = (type: ReleaseItem["statusType"]) => {
  switch (type) {
    case "released":
      return "bg-emerald-950/60 text-emerald-400 border-emerald-800/50 dot-emerald-400";
    case "rolling":
      return "bg-cyan-950/60 text-cyan-400 border-cyan-800/50 dot-cyan-400";
    case "action":
      return "bg-amber-950/60 text-amber-400 border-amber-800/50 dot-amber-400";
    case "governance":
      return "bg-yellow-950/60 text-amber-300 border-yellow-800/50 dot-yellow-300";
    case "preview":
      return "bg-purple-950/60 text-purple-300 border-purple-800/50 dot-purple-300";
  }
};

const getDotColor = (type: ReleaseItem["statusType"]) => {
  switch (type) {
    case "released":
      return "bg-emerald-400";
    case "rolling":
      return "bg-cyan-400";
    case "action":
      return "bg-amber-400";
    case "governance":
      return "bg-amber-300";
    case "preview":
      return "bg-purple-400";
  }
};

export default function ProductUpdatesHeroSection() {
  return (
    <section className="relative min-h-[900px] w-full bg-gradient-to-r from-[#050A17] to-[#08101F] text-white px-6 py-12 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col justify-between">
        {/* Top Hero Layout */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column: Title & Hero Content */}
          <div className="lg:col-span-7 flex flex-col items-start pt-2">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-8">
              <span>Home</span>
              <span>/</span>
              <span>Resources</span>
              <span>/</span>
              <span className="text-slate-300">Product Updates</span>
            </div>

            {/* Eyebrow Label */}
            <div className="flex items-center gap-2 mb-6">
              <span className="w-4 h-[2px] bg-cyan-400"></span>
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-cyan-400 uppercase">
                PRODUCT UPDATES &bull; RELEASE NOTES &bull; PLATFORM MOMENTUM
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-[56px] font-bold tracking-tight text-white mb-6 leading-[1.08]">
              See what&apos;s new in <br className="hidden sm:inline" />
              <span className="text-[#00E5FF]">ZoikoVertex.</span>
            </h1>

            {/* Description */}
            <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed mb-8 max-w-xl">
              Track the latest governed AI workflow capabilities, approval
              improvements, integrations, auditability controls, security
              enhancements, and enterprise platform releases.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6 w-full sm:w-auto">
              <button className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#20E7F2] to-[#00C8F0] text-slate-950 font-bold text-xs sm:text-sm hover:opacity-95 transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.35)] active:scale-[0.98] cursor-pointer">
                Subscribe to Product Updates
              </button>

              <button className="px-6 py-3.5 rounded-xl bg-[#070E18]/80 border border-slate-800 text-slate-200 font-bold text-xs sm:text-sm hover:bg-[#131C2B] hover:border-slate-700 transition-all duration-200 active:scale-[0.98] cursor-pointer">
                View Latest Release Notes
              </button>
            </div>

            {/* Secondary Text Link */}
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group"
            >
              <span>Book a demo</span>
              <span className="group-hover:translate-x-1 transition-transform">
                &rarr;
              </span>
            </a>
          </div>

          {/* Right Column: Release Timeline Card */}
          <div className="lg:col-span-5 w-full">
            <div className="rounded-2xl bg-gradient-to-b from-[#131C2B] to-[#0B1524] border border-slate-800/80 p-6 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
              {/* Card Header */}
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 uppercase tracking-[1px] pb-4 mb-2 border-b border-slate-800/60">
                <span>RELEASE TIMELINE</span>
                <span>LAST 30 DAYS</span>
              </div>

              {/* Timeline List */}
              <div className="divide-y divide-slate-800/50">
                {timelineData.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Timeline Dot Indicator */}
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotColor(
                          item.statusType,
                        )}`}
                      />
                      <div className="truncate">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] tracking-[1px] font-mono text-slate-500">
                          {item.category} &bull; {item.date}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-medium flex items-center gap-1.5 shrink-0 ${getStatusBadgeStyle(
                        item.statusType,
                      )}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="tracking-[1px]">{item.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Note Text */}
        <p className="text-sm tracking-[0.5px] max-w-xl font-mono text-[#8B97A6] mb-6">
          Every update is categorized by release status, affected module,
          business impact, admin action, and governance relevance.
        </p>

        {/* Bottom Metrics Grid */}
        <motion.div
          className="w-full grid grid-cols-2 md:grid-cols-5 rounded-2xl bg-[#7AA0BE24] border border-slate-800/80 backdrop-blur-md overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800/80"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Box 1: Latest Release */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[1px] block mb-3">
              LATEST RELEASE
            </span>
            <div>
              <div className="text-base sm:text-lg font-bold text-[#00E5FF] tracking-tight mb-1">
                Jan 14, 2026
              </div>
              <p className=" tracking-[1px] text-[12px] font-mono text-[#5F6D7E] max-w-40">
                Evidence Vault controls
              </p>
            </div>
          </div>

          {/* Box 2: This Quarter */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[1px] block mb-3">
              THIS QUARTER
            </span>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-[#20E7F2] tracking-tight mb-1">
                14{" "}
                <span className="text-xs font-normal text-slate-400 font-sans">
                  updates
                </span>
              </div>
              <p className=" tracking-[1px] text-[12px] font-mono text-[#5F6D7E] max-w-40">
                shipped &amp; rolling out
              </p>
            </div>
          </div>

          {/* Box 3: Governance Updates */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[1px] block mb-3">
              GOVERNANCE UPDATES
            </span>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight mb-1">
                6
              </div>
              <p className=" tracking-[1px] text-[12px] font-mono text-[#5F6D7E] max-w-40">
                audit &bull; policy &bull; security &bull; ROI
              </p>
            </div>
          </div>

          {/* Box 4: New Integrations */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[1px] block mb-3">
              NEW INTEGRATIONS
            </span>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-cyan-400 tracking-tight mb-1">
                3
              </div>
              <p className=" tracking-[1px] text-[12px] font-mono text-[#5F6D7E] max-w-40">
                connectors &amp; APIs
              </p>
            </div>
          </div>

          {/* Box 5: Admin Action */}
          <div className="p-5 col-span-2 md:col-span-1 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[1px] block mb-3">
              ADMIN ACTION
            </span>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight mb-1">
                4
              </div>
              <p className=" tracking-[1px] text-[12px] font-mono text-[#5F6D7E] max-w-40">
                require configuration
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
