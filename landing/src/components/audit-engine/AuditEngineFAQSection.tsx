"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function AuditEngineFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const faqs = [
    {
      question: "What is the ZoikoVertex Audit Engine?",
      answer:
        "The Audit Engine is the five-layer evidence architecture built into every governed workflow — Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger. It records what happened, why it happened, who authorized it, and what artifacts resulted, as the work occurs rather than after the fact.",
    },
    {
      question: "What is captured in the Audit Trail?",
      answer:
        "Every material system event: AI agent tasks, workflow transitions, approval actions, policy checks, integration calls, user actions, and system state changes — each timestamped, actor-referenced, and cross-linked to related evidence records in an append-only log.",
    },
    {
      question: "How does the Decision Ledger differ from the Audit Trail?",
      answer:
        "The Audit Trail records what happened. The Decision Ledger records why — approval rationale, rejection reasons, override justifications, exception notes, and policy waivers. Together they answer both the factual and the reasoning dimension of any governance question.",
    },
    {
      question: "What is stored in the Evidence Vault?",
      answer:
        "Sealed per-campaign packages containing prompts, AI outputs, model metadata, policy check results, approved content artifacts, integration confirmations, and exportable bundles — assembled continuously so evidence is ready before it is requested.",
    },
    {
      question: "How does the Forensic Hub work?",
      answer:
        "The Forensic Hub reconstructs any disputed, failed, escalated, or anomalous event by pulling the linked Audit Trail, Decision Ledger, Evidence Vault, and Identity Ledger records into a single chronological view — turning a multi-system investigation into one query.",
    },
    {
      question: "Who can access audit records?",
      answer:
        "Access is role-scoped. Auditor and executive-viewer roles can be configured for read-oriented access to evidence and governance data without content creation, approval, publishing, or override rights. Access events are themselves logged.",
    },
    {
      question: "How long are audit records retained?",
      answer:
        "Retention is configurable per record type and jurisdiction, with retention classes applied automatically. Legal-hold controls suspend deletion for records under litigation or regulatory review, overriding the standard retention schedule until the hold is released.",
    },
    {
      question: "Can audit records be exported for legal proceedings?",
      answer:
        "Yes. Evidence bundles export on demand in formats intended for auditors, regulators, and legal proceedings, preserving cross-layer linkage, chain-of-custody information, and the record integrity properties of the source layers.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 lg:py-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {/* Header Section */}
        <div className="w-full">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3.5"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
              AUDIT ENGINE QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-2xl"
          >
            Common questions about the evidence architecture.
          </motion.h2>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Side - FAQ Accordion Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5"
          >
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="w-full transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-4 focus:outline-none"
                  >
                    <span className="text-xs sm:text-[13px] font-bold text-white tracking-tight leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#20E7F2]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-5 sm:px-5 sm:pb-5 text-[11px] sm:text-xs text-gray-400 leading-relaxed font-normal">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>

          {/* Right Side - Live Demo Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Top Image with Bottom Fade */}
            <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden">
              <img
                src="/images/audit-engine/AUDIT-ENGINE-DEMO.png"
                alt="Audit engine live demo"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-[#080C10]/40 to-transparent" />
            </div>

            {/* Bottom Card Copy */}
            <div className="p-6 sm:p-7 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
                  AUDIT ENGINE DEMO
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                See the five evidence layers in a live workflow.
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                A focused walkthrough showing how a single campaign generates
                Audit Trail events, Decision Ledger records, sealed Evidence
                Vault packages, forensic reconstruction, and identity binding —
                all from one governed run.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
