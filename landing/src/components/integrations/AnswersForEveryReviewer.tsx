"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface StakeholderCard {
  id: string;
  role: string;
  question: string;
  ctaText: string;
}

const STAKEHOLDERS: StakeholderCard[] = [
  {
    id: "1",
    role: "EXECUTIVE BUYER",
    question: "Can this connect to our stack?",
    ctaText: "Book Integration Demo →",
  },
  {
    id: "2",
    role: "CTO / IT",
    question: "Is it secure and manageable?",
    ctaText: "Get Stack Assessment →",
  },
  {
    id: "3",
    role: "MARKETING OPS",
    question: "Will it fit daily workflows?",
    ctaText: "Design a workflow →",
  },
  {
    id: "4",
    role: "LEGAL / COMPLIANCE",
    question: "Can we prove what happened?",
    ctaText: "View Governance Audit →",
  },
  {
    id: "5",
    role: "PARTNER / SI",
    question: "Can we build connectors?",
    ctaText: "Become a Partner →",
  },
];

// Stagger container for fade-up animation sequence
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Distinct fade-up animation variant for cards
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

export default function AnswersForEveryReviewer() {
  return (
    <section className="relative w-full bg-[#08101F] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex items-center justify-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-12 z-10">
        {/* Header Section with Fade Up Animation */}
        <motion.header
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#20E7F2] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block -translate-y-[1px]" />
            <span>ANSWERS FOR EVERY REVIEWER</span>
          </div>

          <h2 className="text-[32px] leading-[1.2] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            A path for each stakeholder.
          </h2>
        </motion.header>

        {/* 5-Column Grid with Fade Up Animation on each Card */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {STAKEHOLDERS.map((item) => (
            <motion.div
              key={item.id}
              variants={fadeUpVariants}
              whileHover={{
                y: -6,
                borderColor: "rgba(32, 231, 242, 0.35)",
                boxShadow: "0 10px 30px -10px rgba(32, 231, 242, 0.08)",
                transition: { duration: 0.25 },
              }}
              className="group bg-[#0B1320] border border-[#162235] rounded-2xl p-6 flex flex-col justify-between min-h-[170px] transition-all duration-300 relative"
            >
              <div className="space-y-3">
                {/* Role Header */}
                <div className="text-[10px] font-mono font-semibold text-[#00A1A7] uppercase tracking-[0.15em]">
                  {item.role}
                </div>

                {/* Stakeholder Question */}
                <h3 className="text-[15px] font-bold text-white tracking-tight leading-snug group-hover:text-[#20E7F2] transition-colors">
                  {item.question}
                </h3>
              </div>

              {/* Call-to-Action Link */}
              <div className="pt-6">
                <a
                  href="#"
                  className="inline-flex items-center text-[11px] font-mono text-[#20E7F2] hover:underline tracking-tight"
                >
                  {item.ctaText}
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
