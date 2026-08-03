"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What are ZoikoVertex use cases?",
    answer:
      "ZoikoVertex supports campaign execution, content production, approval workflows, and governed AI operations across marketing, retail, and enterprise teams.",
  },
  {
    question: "Who uses ZoikoVertex?",
    answer:
      "Marketing operators, agencies, compliance teams, and executives who need governed, auditable AI execution at scale.",
  },
  {
    question: "How does ZoikoVertex differ from generic AI tools?",
    answer:
      "ZoikoVertex is built around governance from the ground up, with role-based access, approval workflows, and evidence capture baked into every action.",
  },
  {
    question: "Can ZoikoVertex support regulated or high-risk workflows?",
    answer:
      "Yes. ZoikoVertex offers configurable retention rules, legal-hold status, and audit trails suited for regulated industries.",
  },
  {
    question: "What is the best first use case?",
    answer:
      "Most teams start with a single approval-heavy or high-volume workflow to prove value before expanding governance across teams.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.25,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function CommonQuestions() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="w-full bg-[#0B1524] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-4 flex items-center justify-center gap-3"
        >
          <span className="h-px w-6 bg-amber-400" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-amber-400">
            COMMON QUESTIONS
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mb-12 text-center text-[28px] font-bold leading-tight text-white sm:text-[32px]"
        >
          Answers for the buying committee.
        </motion.h1>

        {/* FAQ List */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col gap-3"
        >
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.question}
                variants={itemVariants}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1220]"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(idx)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[13.5px] font-bold text-white">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center text-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[12.5px] leading-relaxed text-slate-400">
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
    </div>
  );
}
