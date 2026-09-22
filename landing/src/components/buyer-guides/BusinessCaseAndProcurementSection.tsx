"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FileText,
  Sparkles,
  Scale,
  Database,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

interface ProcurementItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const procurementItems: ProcurementItem[] = [
  {
    icon: ShieldCheck,
    label: "Security overview",
    href: "/security",
  },
  {
    icon: FileText,
    label: "Data Processing Addendum (DPA)",
    href: "/dpa",
  },
  {
    icon: Sparkles,
    label: "Responsible AI",
    href: "/responsible-ai",
  },
  {
    icon: Scale,
    label: "Compliance & Governance",
    href: "/governance",
  },
  {
    icon: Database,
    label: "Auditability & evidence",
    href: "/auditability",
  },
];

export default function BusinessCaseAndProcurementSection() {
  return (
    <section className="relative flex min-h-[900px] w-full items-center justify-center overflow-hidden bg-[#0B1524] px-6 py-20 font-sans text-white md:px-12 lg:px-16">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-950/15 blur-[180px]" />

      <div className="z-10 flex w-full max-w-[1280px] flex-col items-center">
        {/* Header Content */}
        <div className="mb-16 text-center">
          {/* Eyebrow Label */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-[2px] w-4 bg-cyan-400" />

            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
              BUSINESS CASE &amp; PROCUREMENT
            </span>

            <span className="h-[2px] w-4 bg-cyan-400" />
          </div>

          {/* Heading */}
          <h2 className="mb-4 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[48px]">
            Justify it internally. Pass every review.
          </h2>
        </div>

        {/* Main Grid */}
        <motion.div
          className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Card: ROI Business Case Builder */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#131C2B] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-md md:p-10"
          >
            <div>
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[1px] text-[#20E7F2]">
                ROI BUSINESS CASE BUILDER
              </span>

              <h3 className="mb-3 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                Turn the case into numbers.
              </h3>

              <p className="mb-8 text-xs font-normal leading-relaxed text-slate-400 sm:text-sm">
                Model savings, payback, and risk reduction with the same engine
                your CFO will scrutinize.
              </p>

              {/* Metrics Grid */}
              <div className="mb-10 grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#7AA0BE24] bg-[#131C2B] p-4">
                  <span className="mb-1 block text-xl font-extrabold tracking-tight text-[#20E7F2] sm:text-2xl">
                    $2.4M
                  </span>

                  <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 sm:text-xs">
                    Annual value
                  </span>
                </div>

                <div className="rounded-xl border border-[#7AA0BE24] bg-[#131C2B] p-4">
                  <span className="mb-1 block text-xl font-extrabold tracking-tight text-[#20E7F2] sm:text-2xl">
                    7.2 mo
                  </span>

                  <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 sm:text-xs">
                    Payback
                  </span>
                </div>

                <div className="rounded-xl border border-[#7AA0BE24] bg-[#131C2B] p-4">
                  <span className="mb-1 block text-xl font-extrabold tracking-tight text-[#20E7F2] sm:text-2xl">
                    +41%
                  </span>

                  <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 sm:text-xs">
                    Approval velocity
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/roi-governance-audit"
              className="inline-block w-full rounded-xl bg-[#00E5FF] py-4 text-center text-xs font-bold text-slate-950 shadow-[0_0_25px_rgba(0,229,255,0.3)] transition-all hover:bg-[#00cce6] active:scale-[0.98] sm:text-sm"
            >
              Run ROI &amp; Governance Audit
            </Link>
          </motion.div>

          {/* Right Card: Procurement & Security Pack */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col justify-between rounded-2xl border border-[#7AA0BE42] bg-gradient-to-b from-[#111D2E] to-[#0B1524] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-md md:p-10"
          >
            <div>
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B768]">
                PROCUREMENT &amp; SECURITY PACK
              </span>

              <h3 className="mb-3 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                Everything reviewers ask for.
              </h3>

              <p className="mb-8 max-w-md text-xs font-normal leading-relaxed text-slate-400 sm:text-sm">
                Controlled-access documentation for security, legal, privacy,
                and procurement teams.
              </p>

              {/* Procurement Links */}
              <div className="mb-8 flex flex-col gap-3">
                {procurementItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex w-full items-center justify-between rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-slate-700 hover:bg-[#162235]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-[#E8B768] transition-transform duration-200 group-hover:scale-105" />

                        <span className="text-xs font-medium text-[#EEF2F6] transition-colors duration-200 group-hover:text-white sm:text-sm">
                          {item.label}
                        </span>
                      </div>

                      <span className="ml-3 shrink-0 font-mono text-xs text-[#E8B768] transition-transform duration-200 group-hover:translate-x-1">
                        &rarr;
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/contact-sales"
              className="inline-block w-full rounded-xl bg-gradient-to-r from-[#E8B768] to-[#C8954A] py-4 text-center text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98] sm:text-sm"
            >
              Contact Sales for Access
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}