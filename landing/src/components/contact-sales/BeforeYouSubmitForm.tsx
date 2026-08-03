"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How do I contact ZoikoVertex sales for a demo?",
    answer:
      "Fill in the form above with your work email and primary interest. A specialist reviews every submission and routes it to the right team, usually within four business hours for enterprise-priority requests.",
  },
  {
    question: "Is pricing public before I talk to sales?",
    answer:
      "We tailor custom pricing packages based on deployment scale, governance needs, and workflow automation scope during initial discovery.",
  },
  {
    question: "Can legal or security join the first call?",
    answer:
      "Yes. We welcome technical, legal, and security stakeholders early to accelerate your review process and answer architecture questions upfront.",
  },
  {
    question: "What if I just need support, not sales?",
    answer:
      "Select 'Support request' as your primary interest in the form, and your inquiry will be routed directly to our dedicated technical support team.",
  },
  {
    question: "How long until someone responds?",
    answer:
      "High-priority enterprise requests receive responses or calendar scheduling links within hours, and all inquiries hear back within one business day.",
  },
];

export default function BeforeYouSubmitForm() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
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
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#F5F3EC] text-[#0D1526] py-20 px-6 sm:px-12 md:px-16 min-h-screen flex flex-col justify-center font-sans antialiased border-t border-[#DFDBCB]">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              FREQUENTLY ASKED
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#0D1526]">
            Before you submit the form
          </h2>
        </motion.div>

        {/* Accordion List Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {faqData.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className=" py-6 transition-colors duration-200"
              >
                {/* Accordion Header / Trigger Button */}
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full flex items-start justify-between gap-6 text-left group focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg sm:text-xl font-semibold text-[#0D1526] leading-snug group-hover:text-[#1E293B] transition-colors max-w-2xl">
                    {faq.question}
                  </span>

                  <span className="mt-1 text-[#2DD4BF] shrink-0 p-1">
                    {isOpen ? (
                      <X className="w-5 h-5 transition-transform duration-200" />
                    ) : (
                      <Plus className="w-5 h-5 transition-transform duration-200" />
                    )}
                  </span>
                </button>

                {/* Accordion Content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="mt-4 text-[#64748B] text-sm sm:text-base leading-relaxed max-w-2xl pr-8">
                        {faq.answer}
                      </p>
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
