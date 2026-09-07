"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface BuyerPathCard {
  category: string;
  title: string;
  ctaLabel: string;
  href: string;
}

const cards: BuyerPathCard[] = [
  {
    category: "STRATEGIC BUYER",
    title: "Book an executive demo",
    ctaLabel: "Book Executive Demo",
    href: "/demo-library",
  },
  {
    category: "CFO / PROCUREMENT",
    title: "Justify the investment",
    ctaLabel: "Start ROI & Governance Audit",
    href: "/roi-governance-audit",
  },
  {
    category: "MARKETING / OPERATIONS",
    title: "Find your workflow fit",
    ctaLabel: "Find My Use Case",
    href: "/use-cases",
  },
  {
    category: "LEGAL / COMPLIANCE / IT",
    title: "See proof and controls",
    ctaLabel: "View Auditability",
    href: "/auditability",
  },
  {
    category: "ENTERPRISE RETAIL",
    title: "Operational industry fit",
    ctaLabel: "Explore Enterprise Retail",
    href: "/enterprise-retail",
  },
  {
    category: "AGENCY / MULTI-CLIENT",
    title: "Client-separation proof",
    ctaLabel: "Book Multi-Client Demo",
    href: "/demo-library",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.25,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ChooseYourNextStep() {
  return (
    <div className="w-full bg-[#08101F] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-4 flex items-center justify-center gap-3"
        >
          <span className="h-px w-6 bg-cyan-400" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400 uppercase">
            CHOOSE YOUR NEXT STEP
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mb-12 text-center text-[28px] font-bold leading-tight text-white sm:text-[32px]"
        >
          A path for every buyer.
        </motion.h1>

        {/* Cards Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={cardVariants}
              className="rounded-xl border border-[#7AA0BE24] bg-[#131C2B] p-5 flex flex-col justify-between"
            >
              <div>
                <span className="mb-3 block text-[9.5px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
                  {card.category}
                </span>
                <h3 className="mb-4 text-[14px] font-bold leading-snug text-white">
                  {card.title}
                </h3>
              </div>
              <Link
                href={card.href}
                className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-[#20E7F2] transition-colors hover:text-cyan-300 w-fit"
              >
                <span>{card.ctaLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
