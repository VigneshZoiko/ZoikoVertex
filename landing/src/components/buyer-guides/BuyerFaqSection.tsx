"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const cardVariants = {
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
    id: "faq-1",
    question: "What should enterprises look for in an agentic AI platform?",
    answer:
      "Enterprises should prioritize governed autonomy, structured human-in-the-loop approval workflows, comprehensive auditability with cryptographic evidence, real-time ROI measurement, seamless enterprise integration, and procurement readiness.",
  },
  {
    id: "faq-2",
    question: "How do buyer guides help evaluate ZoikoVertex?",
    answer:
      "Buyer guides break down platform capabilities by stakeholder role—providing direct frameworks, security controls, and ROI models so procurement, legal, IT, and executives can systematically evaluate readiness.",
  },
  {
    id: "faq-3",
    question: "Should buyer guides be gated?",
    answer:
      "We utilize a hybrid model: strategic overview checklists and high-level evaluation frameworks are ungated for easy alignment, while deep technical whitepapers and procurement security packs require light or controlled access gating.",
  },
  {
    id: "faq-4",
    question: "How does ZoikoVertex support procurement review?",
    answer:
      "ZoikoVertex supplies pre-packaged Data Processing Addendums (DPAs), SOC 2 compliance reports, Responsible AI governance frameworks, and audit trail exports to de-risk and accelerate internal security and legal reviews.",
  },
];

export default function BuyerFaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative min-h-[700px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1000px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              BUYER FAQ
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Answers for the evaluation team.
          </h2>
        </div>

        {/* Accordion List */}
        <motion.div
          className="w-full flex flex-col gap-4 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {faqData.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <motion.div
                key={faq.id}
                variants={cardVariants}
                className="rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 transition-all duration-300 overflow-hidden backdrop-blur-sm"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-6 sm:p-7 flex items-center justify-between gap-4 text-left cursor-pointer group"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-white transition-colors tracking-tight">
                    {faq.question}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-45 text-amber-400" : "text-[#00E5FF]"
                    }`}
                  >
                    <span className="text-xl font-mono leading-none">+</span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-6 pb-6 sm:px-7 sm:pb-7 text-xs sm:text-sm text-slate-400 font-normal leading-relaxed border-t border-slate-800/50 pt-4">
                        {faq.answer}
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
