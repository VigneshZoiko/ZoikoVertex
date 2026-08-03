"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    id: "roi-calculation",
    question: "How does ZoikoVertex calculate AI workflow ROI?",
    answer:
      "We use your specific inputs and published, transparent formulas mapping cycle time reduction, rework avoidance, and labor cost savings—avoiding any invented benchmarks.",
  },
  {
    id: "roi-guarantee",
    question: "Is the ROI estimate guaranteed?",
    answer:
      "Estimates are modeled on your provided assumptions and baseline metrics. They provide a defensible business case that survives procurement and board audit, rather than a financial guarantee.",
  },
  {
    id: "governance-controls",
    question: "What governance controls are measured?",
    answer:
      "We evaluate controls across policy compliance, approval chains, evidence retention, identity binding, audit trails, and overall responsible AI maturity.",
  },
  {
    id: "sensitive-data",
    question: "Do you store sensitive business data from the audit?",
    answer:
      "No. Calculator inputs are strictly separated from retained business evidence, and sensitive descriptions are minimized by design to prevent exposure of PII or confidential facts.",
  },
  {
    id: "procurement-use",
    question: "Can the report be used with procurement?",
    answer:
      "Yes. The outputs and methodology breakdowns are specifically structured to be transparent enough to satisfy procurement reviews, vendor risk assessments, and financial controllers.",
  },
  {
    id: "generic-calculator",
    question:
      "How is this different from a generic AI productivity calculator?",
    answer:
      "Unlike generic tools that rely on generic time-saved percentages, ZoikoVertex ties every estimate directly to an immutable architecture of decision ledgers, audit trails, and human accountability.",
  },
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="relative min-h-[600px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1000px] w-full z-10 flex flex-col items-center text-center">
        {/* Eyebrow Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-[2px] bg-amber-500/80"></span>
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-400 uppercase">
            FAQ
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight text-white mb-14 leading-[1.15]">
          Answers for the buying committee.
        </h2>

        {/* FAQ List Container */}
        <motion.div
          className="w-full flex flex-col gap-3 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {faqData.map((item) => {
            const isOpen = openId === item.id;
            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className="rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 transition-all duration-300 overflow-hidden backdrop-blur-sm"
              >
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-100 tracking-tight pr-4">
                    {item.question}
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-cyan-400 transition-transform duration-200">
                    {isOpen ? (
                      <Minus className="w-4 h-4 stroke-[2.2]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-6 pb-6 pt-0 text-xs sm:text-sm text-slate-400 font-normal leading-relaxed border-t border-slate-800/40 pt-4">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
