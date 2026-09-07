"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

interface DevAccessItem {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  href: string;
}

interface ImplementationPathItem {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
}

const DEV_ACCESS_ITEMS: DevAccessItem[] = [
  {
    id: "1",
    title: "REST API",
    description:
      "Programmatic access to workflows, approvals, events, and evidence references.",
    ctaText: "View API docs →",
    href: "/resources-hub",
  },
  {
    id: "2",
    title: "Webhooks",
    description:
      "Subscribe to workflow state, approvals, publishing results, and integration errors.",
    ctaText: "Explore webhooks →",
    href: "/ai-workflow-orchestration",
  },
  {
    id: "3",
    title: "Event streams",
    description:
      "Enterprise option for audit, analytics, SIEM, or data warehouse use.",
    ctaText: "Talk to solutions →",
    href: "/solution",
  },
  {
    id: "4",
    title: "Sandbox",
    description: "Test environment to validate integrations before production.",
    ctaText: "Request sandbox →",
    href: "/request-demo",
  },
  {
    id: "5",
    title: "Partner program",
    description: "Build certified connectors or vertical workflow packages.",
    ctaText: "Become a partner →",
    href: "/agencies",
  },
];

const IMPLEMENTATION_PATHS: ImplementationPathItem[] = [
  {
    id: "1",
    title: "Native connector",
    description: "Connect quickly using approved, governed connectors.",
    buttonText: "Book Demo",
    href: "/request-demo",
  },
  {
    id: "2",
    title: "API + webhook",
    description:
      "Extend workflows with full control while preserving auditability.",
    buttonText: "View Docs",
    href: "/resources-hub",
  },
  {
    id: "3",
    title: "Solutions-assisted",
    description:
      "Map data, permissions, workflows, and evidence with our experts.",
    buttonText: "Stack Assessment",
    href: "/roi-governance-audit",
  },
  {
    id: "4",
    title: "Partner-built",
    description: "Certified integrations from agencies and platform partners.",
    buttonText: "Partnerships",
    href: "/agencies",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function ApiFirstPath() {
  return (
    <section className="relative w-full bg-[#0B1524] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex items-center justify-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.header
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block -translate-y-[1px]" />
            <span>BUILD & DEPLOY</span>
          </div>

          <h1 className="text-[32px] leading-[1.2] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            API-first, with a path for every team.
          </h1>
        </motion.header>

        {/* 2-Column Grid Container */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Card: API, Webhooks & Developer Access */}
          <motion.div
            variants={cardVariants}
            className="bg-[#131C2B] border border-[#162235] rounded-2xl p-8 flex flex-col justify-between"
          >
            <div>
              {/* Category */}
              <div className="text-[10px] font-mono font-semibold text-[#00A1A7] uppercase tracking-[0.15em] mb-2">
                API, WEBHOOKS & DEVELOPER ACCESS
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold text-white tracking-tight mb-8">
                Extend without weakening governance.
              </h2>

              {/* Items List */}
              <div className="space-y-6">
                {DEV_ACCESS_ITEMS.map((item, idx) => (
                  <div key={item.id} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 group">
                      <div className="space-y-1 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#20E7F2] text-xs">▸</span>
                          <h3 className="text-[15px] font-bold text-white group-hover:text-[#20E7F2] transition-colors">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[12px] text-slate-400 leading-relaxed pl-4">
                          {item.description}
                        </p>
                      </div>

                      <Link
                        href={item.href}
                        className="text-[11px] font-mono text-[#20E7F2] hover:underline whitespace-nowrap pl-4 sm:pl-0 pt-0.5"
                      >
                        {item.ctaText}
                      </Link>
                    </div>

                    {/* Divider line except after last item */}
                    {idx < DEV_ACCESS_ITEMS.length - 1 && (
                      <div className="w-full h-[1px] bg-[#162235]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Card: Implementation Paths */}
          <motion.div
            variants={cardVariants}
            className="bg-[#131C2B] border border-[#162235] rounded-2xl p-8 flex flex-col justify-between"
          >
            <div>
              {/* Category */}
              <div className="text-[10px] font-mono font-semibold text-[#00A1A7] uppercase tracking-[0.15em] mb-2">
                IMPLEMENTATION PATHS
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold text-white tracking-tight mb-8">
                Deploy by maturity, not by force.
              </h2>

              {/* Items List */}
              <div className="space-y-8">
                {IMPLEMENTATION_PATHS.map((item, idx) => (
                  <div key={item.id} className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-md">
                        <h3 className="text-[15px] font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="text-[12px] text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <Link
                        href={item.href}
                        className="self-start sm:self-center px-3.5 py-1.5 rounded-md border border-[#E8B7684D] text-[#E8B768] text-[11px] font-mono hover:bg-[#20E7F2]/10 transition-colors whitespace-nowrap"
                      >
                        {item.buttonText}
                      </Link>
                    </div>

                    {/* Divider line except after last item */}
                    {idx < IMPLEMENTATION_PATHS.length - 1 && (
                      <div className="w-full h-[1px] bg-[#162235]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
