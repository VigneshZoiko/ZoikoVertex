"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface AccordionItem {
  id: string;
  question: string;
  answerBold?: string;
  answerRest?: string;
  content?: string;
}

const accordionData: AccordionItem[] = [
  {
    id: "01",
    question: "What is ZoikoVertex?",
    answerBold:
      "ZoikoVertex is a governed agentic AI execution platform for enterprise teams.",
    answerRest:
      " It's built for AI-assisted workflows, approvals, evidence, auditability, integrations, and executive visibility — designed for controlled execution rather than unmanaged AI experimentation.",
  },
  {
    id: "02",
    question: "Who is ZoikoVertex for?",
    answerBold:
      "Designed for enterprise leaders, operations, and cross-functional teams.",
    answerRest:
      " Ideal for organizations requiring strict governance, security, clear approval pathways, and measurable ROI across automated agent workflows.",
  },
  {
    id: "03",
    question: "What problems does ZoikoVertex solve?",
    answerBold: "Eliminates unmanaged AI sprawl and execution risks.",
    answerRest:
      " It bridge the gap between chaotic AI experimentation and enterprise-grade execution with complete audit trails, human-in-the-loop controls, and unified oversight.",
  },
  {
    id: "04",
    question: "How is ZoikoVertex different from generic AI tools?",
    answerBold:
      "Built for enterprise control rather than standard chat interfaces.",
    answerRest:
      " Unlike generic wrapper apps, ZoikoVertex embeds structured governance, role-based security, multi-stage approval gates, and persistent evidence records into every process.",
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

export default function PlatformOverviewAccordion() {
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
              01
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Platform Overview
            </h2>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#64748B]">
            TOP-OF-FUNNEL EDUCATION
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
                  <span className="text-[17px] sm:text-[18px] font-bold text-[#0F172A] group-hover:text-black transition-colors duration-150">
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
                        <strong className="font-semibold text-[#0F172A]">
                          {item.answerBold}
                        </strong>
                        <span>{item.answerRest}</span>
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
