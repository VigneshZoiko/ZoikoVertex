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

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "Do demos use real customer data?",
    answer:
      "No, all product demos strictly run on synthetic data to ensure zero risk of exposure for real enterprise datasets while demonstrating actual execution capabilities.",
  },
  {
    id: "2",
    question: "Can I get a live demo on my own workflows?",
    answer:
      "Yes! You can book a live demo with our team. We will map your specific governance, workflow, and integration requirements into a custom walkthrough.",
  },
  {
    id: "3",
    question: "Are captions and transcripts available?",
    answer:
      "Yes, full interactive transcripts and closed captions are available for all recorded product demos in the library.",
  },
  {
    id: "4",
    question: "Can I share demos with my buying committee?",
    answer:
      "Absolutely. You can use the shortlist bookmark feature to build a custom playlist and email it directly to procurement, security, and executive sponsors.",
  },
  {
    id: "5",
    question: "What integrations can you show?",
    answer:
      "We demonstrate integrations across CRM, ERP, social platforms, communication tools, and custom enterprise data warehouses with full audit logging.",
  },
  {
    id: "6",
    question: "How does the Demo Library support procurement?",
    answer:
      "Every demo includes evidence records, security compliance badges, and policy check logs to provide your procurement team with clear, verifiable proof upfront.",
  },
];

export default function DemoLibraryFAQSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative min-h-[600px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-900/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-[960px] w-full z-10 flex flex-col items-center">
        {/* Header Section */}
        <div className="mb-12 text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-[#C59B6C]"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#C59B6C] uppercase">
              DEMO LIBRARY FAQ
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight text-white leading-tight">
            Answers for security &amp; procurement.
          </h2>
        </div>

        {/* FAQ Accordion List */}
        <motion.div
          className="w-full space-y-3"
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
                className="rounded-2xl border border-slate-800/80 bg-[#131C2B] overflow-hidden transition-colors duration-200 hover:border-slate-700/80 backdrop-blur-sm"
              >
                <button
                  onClick={() => toggleFAQ(item.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-sm font-semibold text-slate-200 tracking-tight pr-4">
                    {item.question}
                  </span>
                  <div className="text-cyan-400 shrink-0">
                    {isOpen ? (
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-xs text-slate-400 font-mono leading-relaxed border-t border-slate-800/40 pt-3">
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
