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
    question: "How do customers get support?",
    answerBold:
      "Through the in-app support channel, prioritized by workspace tier and issue severity.",
    answerRest:
      " Existing customers should always use this route rather than the sales form.",
  },
  {
    id: "02",
    question: "Where are product updates published?",
    answerBold: "In our central changelog and release notes portal.",
    answerRest:
      " Admins also receive direct email digests outlining major platform features, security enhancements, and API updates.",
  },
  {
    id: "03",
    question: "How do admins find documentation?",
    answerBold:
      "Comprehensive developer guides and admin knowledge bases are available inside the platform portal.",
    answerRest:
      " The documentation includes API reference manuals, workflow integration tutorials, and governance compliance blueprints.",
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

export default function SupportUpdatesCustomersAccordion() {
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
              08
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Support, Updates & Customers
            </h2>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#64748B]">
            RETENTION & SUPPORT DEFLECTION
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
