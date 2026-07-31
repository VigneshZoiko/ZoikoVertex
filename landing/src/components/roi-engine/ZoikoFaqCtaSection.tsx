"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ChevronDown,
  Calendar,
  ShieldCheck,
  GitPullRequest,
  LayoutDashboard,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How does the ROI Engine calculate value?",
    answer:
      "The ROI Engine calculates value across four primary dimensions: labor efficiency, cycle-time acceleration, rework reduction, and governance readiness. It applies your team size, loaded hourly costs, and workflow volumes against conservative baseline benchmarks.",
  },
  {
    question: "Does the ROI Engine guarantee savings?",
    answer:
      "No. All outputs are directional estimates designed for commercial planning and business case development. Actual realized savings depend on organization adoption rates, implementation scope, and operational discipline.",
  },
  {
    question: "Can the ROI Engine support a procurement or finance approval?",
    answer:
      "Yes. The engine generates a transparent, CFO-ready executive report that details all underlying formulas, unit assumptions, and risk-adjusted conservative scenarios specifically formatted for finance and procurement committees.",
  },
  {
    question: "Does it measure governance ROI, not just productivity?",
    answer:
      "Absolutely. Beyond standard time savings, it quantifies audit preparation speedups, instant evidence retrieval, policy exception prevention, and legal exposure mitigation.",
  },
  {
    question: "Can enterprise teams adjust the assumptions?",
    answer:
      "Yes. All variables—including fully loaded hourly rates, team sizes, review cycle latency, and rework frequency—can be fully customized to match your internal operational metrics.",
  },
  {
    question: "Can ROI be tracked after implementation?",
    answer:
      "Yes. Post-deployment, ZoikoVertex connects to your active workflows and Decision Ledger to track actual execution velocity, approval SLA compliance, and audit prep hours against original projections.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoFaqCtaSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-[#0C1422] py-16 md:py-24 px-6 font-sans text-white border-t border-white/5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* Section Header */}
        <div className="space-y-3">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="h-px w-6 bg-[#20E7F2]" />
            <span className="text-xs font-mono tracking-widest text-[#20E7F2] uppercase">
              COMMON QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-whiteleading-tight"
          >
            How the ROI Engine works.
          </motion.h2>
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: FAQ Accordion List (7 Cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-7">
            <div className="rounded-2xl bg-[#111D2E] border border-white/10 overflow-hidden divide-y divide-white/10">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={index}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full py-4 sm:py-5 px-5 sm:px-6 flex items-center justify-between text-left gap-4"
                    >
                      <span className="text-sm font-semibold text-white tracking-tight">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#ffffff60] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#20E7F2]" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 sm:px-6 pb-5 pt-1 text-xs leading-relaxed text-[#ffffff70]">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: Final Conversion CTA Card (5 Cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="bg-[#182540] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-[#20E7F2] uppercase block">
                  READY TO SEE YOUR NUMBER?
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  Build a board-ready business case for governed AI execution.
                </h3>
                <p className="text-xs text-[#ffffff70] leading-relaxed">
                  Book a demo and walk through the ROI model with a ZoikoVertex
                  strategist using your actual workflow volumes and cost
                  assumptions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button className="w-full py-3 px-4 rounded-xl bg-[#20E7F2] text-[#0b121e] font-semibold text-sm hover:bg-[#1cd4de] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#20E7F2]/20">
                  <Calendar className="w-4 h-4" />
                  Book ROI walkthrough
                </button>

                <button className="w-full py-3 px-4 rounded-xl bg-[#20E7F2] text-[#0b121e] font-semibold text-sm hover:bg-[#1cd4de] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#20E7F2]/20">
                  <ShieldCheck className="w-4 h-4" />
                  Start ROI & Governance Audit
                </button>

                <button className="w-full py-3 px-4 rounded-full bg-white/1 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-[#ffffff80]" />
                  Approval Workflows
                </button>

                <button className="w-full py-3 px-4 rounded-full bg-white/1 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-[#ffffff80]" />
                  Executive Command Center
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
