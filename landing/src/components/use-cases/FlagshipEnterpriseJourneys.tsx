"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface JourneyItem {
  from: string;
  to: string;
}

interface JourneyCard {
  id: string;
  category: string;
  title: string;
  items: JourneyItem[];
  ctaText: string;
  ctaType: "cyan" | "gold";
}

const JOURNEYS: JourneyCard[] = [
  {
    id: "1",
    category: "CMO JOURNEY",
    title: "Fragmented requests → governed execution",
    items: [
      {
        from: "Scattered campaign requests",
        to: "Structured intake",
      },
      {
        from: "Ungoverned AI drafts",
        to: "Policy-checked agents",
      },
      {
        from: "Informal sign-off",
        to: "Evidenced approvals",
      },
    ],
    ctaText: "Book a Demo",
    ctaType: "cyan",
  },
  {
    id: "2",
    category: "CFO / COO JOURNEY",
    title: "Unmeasured AI → measurable ROI",
    items: [
      {
        from: "AI experimentation",
        to: "Quantified savings",
      },
      {
        from: "Unknown cycle time",
        to: "Cycle-time reduction",
      },
      {
        from: "Cost uncertainty",
        to: "Cost avoidance",
      },
    ],
    ctaText: "Start ROI & Governance Audit",
    ctaType: "cyan",
  },
  {
    id: "3",
    category: "GOVERNANCE / LEGAL / IT",
    title: "Uncontrolled AI → audit-ready records",
    items: [
      {
        from: "Unattributed actions",
        to: "Identity-bound actions",
      },
      {
        from: "No decision record",
        to: "Approvals + evidence",
      },
      {
        from: "Manual audit prep",
        to: "Retained audit trail",
      },
    ],
    ctaText: "Contact Sales",
    ctaType: "gold",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
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

export default function FlagshipEnterpriseJourneys() {
  return (
    <section className="relative w-full bg-[#03060C] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex items-center justify-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.header
          className="text-center space-y-3 mx-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block -translate-y-[1px]" />
            <span>FLAGSHIP ENTERPRISE JOURNEYS</span>
          </div>

          <h2 className="text-[32px] leading-[1.18] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            Three paths board-level buyers recognize.
          </h2>

          <p className="text-[14px] leading-[1.6] text-slate-400 font-normal pt-1">
            From fragmented AI experimentation to governed execution — mapped to
            the outcomes each leader owns.
          </p>
        </motion.header>

        {/* 3-Column Journey Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {JOURNEYS.map((journey) => (
            <motion.div
              key={journey.id}
              variants={fadeUpVariants}
              whileHover={{
                y: -6,
                borderColor:
                  journey.ctaType === "gold"
                    ? "rgba(217, 167, 85, 0.35)"
                    : "rgba(32, 231, 242, 0.35)",
                boxShadow:
                  journey.ctaType === "gold"
                    ? "0 10px 30px -10px rgba(217, 167, 85, 0.08)"
                    : "0 10px 30px -10px rgba(32, 231, 242, 0.08)",
                transition: { duration: 0.25 },
              }}
              className="group bg-[#0B1320] border border-[#162235] rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 relative min-h-[350px]"
            >
              <div className="space-y-6">
                {/* Category Header */}
                <div className={` ${journey.ctaType === "cyan" ?"text-white":"text-[#E8B768]"} text-[10px] font-mono font-semibold uppercase tracking-[0.15em]`}>
                  {journey.category}
                </div>

                {/* Card Title */}
                <h3 className={`text-[18px] font-bold text-white tracking-tight leading-snug` }>
                  {journey.title}
                </h3>

                {/* Journey Items List */}
                <div className="space-y-5 pt-2">
                  {journey.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[12px] gap-2"
                    >
                      <span className="text-slate-400 font-normal">
                        {item.from}
                      </span>
                      <span className="text-[#20E7F2] font-mono text-[11px] px-1">
                        →
                      </span>
                      <span className="text-slate-200 font-medium text-right">
                        {item.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {journey.ctaType === "cyan" ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#00F3FF] text-[#03060C] font-semibold text-[12px] tracking-tight hover:bg-[#33F6FF] shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all"
                  >
                    {journey.ctaText}
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#D9A755] text-[#03060C] font-semibold text-[12px] tracking-tight hover:bg-[#E5B667] shadow-[0_0_20px_rgba(217,167,85,0.2)] transition-all"
                  >
                    {journey.ctaText}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
