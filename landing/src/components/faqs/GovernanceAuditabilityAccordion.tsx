"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface AccordionItem {
  id: string;
  question: string;
  answerText: string;
}

const accordionData: AccordionItem[] = [
  {
    id: "01",
    question: "What does ZoikoVertex store for auditability?",
    answerText:
      "ZoikoVertex stores audit events, evidence records, decision references, identity references, workflow snapshots, policy-trigger records, approval outcomes, export logs, and retention metadata.",
  },
  {
    id: "02",
    question: "What is the Audit Trail?",
    answerText:
      "The Audit Trail provides an immutable chronological record of every system event, user interaction, agent action, and policy evaluation for total transparency and compliance reporting.",
  },
  {
    id: "03",
    question: "What is the Evidence Vault?",
    answerText:
      "The Evidence Vault safely stores raw execution context, input prompts, output artifacts, and reviewer signatures required to substantiate regulatory or internal audits.",
  },
  {
    id: "04",
    question: "What is the Decision Ledger?",
    answerText:
      "The Decision Ledger logs every programmatic decision, policy check, and human approval step with cryptographic verification and timestamped metadata.",
  },
  {
    id: "05",
    question: "How does ZoikoVertex support compliance and governance?",
    answerText:
      "By combining role-based access control, automated policy enforcement, continuous event logging, and exportable compliance reports tailored to enterprise standards.",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.08,
    },
  },
} as const;

export default function GovernanceAuditabilityAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-[#F6F5EE] py-16 px-4 sm:px-8 md:px-12 lg:px-24 font-sans text-[#111827] flex flex-col items-center justify-center">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={containerVariants}
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-12">
          <div className="flex items-baseline gap-3 mb-2 sm:mb-0">
            <span className="font-mono text-[14px] text-[#00D2B4] font-medium">
              04
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Governance, Auditability & Responsible AI
            </h2>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#64748B]">
            COMPLIANCE CONVERSION
          </span>
        </div>

        {/* Accordion List */}
        <div className="flex flex-col">
          {accordionData.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.id}
                className="border-b border-[#E6E4DC] transition-colors duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full py-5 flex items-center justify-between text-left focus:outline-none group"
                  aria-expanded={isOpen}
                >
                  <span className="text-[17px] sm:text-[18px] font-bold text-[#0F172A] group-hover:text-black transition-colors duration-150 max-w-[85%] leading-snug">
                    {item.question}
                  </span>
                  <span className="ml-4 flex-shrink-0 text-[#00D2B4]">
                    {isOpen ? (
                      <X className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden max-w-180"
                    >
                      <div className="pb-6 pr-8 text-[15px] sm:text-[16px] leading-relaxed text-[#64748B]">
                        <span>{item.answerText}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
