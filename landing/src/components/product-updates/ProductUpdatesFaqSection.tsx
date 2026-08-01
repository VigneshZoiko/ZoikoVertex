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
    question: "What is ZoikoVertex Product Updates?",
    answer:
      "ZoikoVertex Product Updates is our dedicated changelog and release portal detailing platform enhancements, security patches, governance capabilities, and feature rollouts with complete transparency.",
  },
  {
    id: "faq-2",
    question: "How is a released feature different from a roadmap item?",
    answer:
      "A released feature is fully tested, deployed, and available in production with complete governance controls. Roadmap items are scheduled capabilities undergoing security review and active development.",
  },
  {
    id: "faq-3",
    question: "How do I know if an update needs admin action?",
    answer:
      "Each update post explicitly flags whether action is required, including administrative configuration steps, required role permissions, and recommended deployment timelines.",
  },
  {
    id: "faq-4",
    question: "Can I subscribe by role?",
    answer:
      "Yes, you can customize notifications based on your specific stakeholder focus—such as Executive summaries, Admin & Ops updates, or Security & Compliance advisories.",
  },
  {
    id: "faq-5",
    question: "Where are governance and security updates?",
    answer:
      "Governance and security enhancements are tagged separately in the release notes and accompanied by detailed compliance impacts and policy enforcement guidelines.",
  },
  {
    id: "faq-6",
    question: "Do updates expose sensitive details?",
    answer:
      "No, release announcements detail capability improvements and functional enhancements without exposing sensitive architecture details, customer data, or internal system vulnerabilities.",
  },
];

export default function ProductUpdatesFaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative min-h-[800px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1000px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-[#E8B768]"></span>
            <span className="text-[11px] font-mono tracking-[1px] text-[#E8B768] uppercase">
              PRODUCT UPDATES FAQ
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Answers for buyers, admins &amp; governance.
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
