"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface AccordionItem {
  id: string;
  question: string;
  answerBold?: string;
  answerRest?: string;
}

const accordionData: AccordionItem[] = [
  {
    id: "01",
    question: "Does ZoikoVertex integrate with existing tools?",
    answerBold:
      "Yes. ZoikoVertex connects with marketing, social, CRM, productivity, analytics, and identity systems",
    answerRest: " through controlled integrations, APIs, and webhooks.",
  },
  {
    id: "02",
    question: "Are APIs available?",
    answerBold: "Yes, fully documented RESTful and GraphQL APIs are provided.",
    answerRest:
      " Enterprise teams can programmatically trigger workflows, fetch audit logs, export evidence records, and synchronize agent state across external platforms.",
  },
  {
    id: "03",
    question: "How do webhooks work?",
    answerBold:
      "Real-time event notifications sent directly to your web servers.",
    answerRest:
      " Webhooks trigger instantly upon state transitions—such as when an approval is requested, granted, rejected, or when an execution completes.",
  },
  {
    id: "04",
    question: "How are integration failures handled?",
    answerBold:
      "Through automated retry logic and immediate failure escalation routes.",
    answerRest:
      " If a third-party API or connected service fails, the workflow gracefully pauses execution, logs the network event, and alerts assigned operators.",
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

export default function IntegrationsAndImplementationAccordion() {
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
              06
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Integrations & Implementation
            </h2>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#64748B]">
            TECHNICAL FEASIBILITY
          </span>
        </div>

        {/* Accordion List */}
        <div className="flex flex-col">
          {accordionData.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.id}
                className="border-b border-[#D8D6C8] transition-colors duration-200"
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
