"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "1",
    question: "What systems does ZoikoVertex integrate with?",
    answer:
      "ZoikoVertex integrates natively with leading CRM platforms, social media channels, collaboration tools (such as Slack and Microsoft Teams), analytics suites, and enterprise identity providers. We also support REST APIs, Webhooks, and Event Streams for custom integrations.",
  },
  {
    id: "2",
    question: "Are ZoikoVertex integrations auditable?",
    answer:
      "Yes. Every action executed through a connector generates an immutable Audit Trail event. Controlled evidence bundles can be exported on-demand to meet SOC 2, GDPR, and enterprise compliance requirements.",
  },
  {
    id: "3",
    question: "Can ZoikoVertex support custom integrations?",
    answer:
      "Absolutely. Beyond our native connector ecosystem, developers can build custom integrations using our REST API, webhook subscriptions, and sandbox environments, or partner with our team through our Partner Program.",
  },
  {
    id: "4",
    question: "How does ZoikoVertex protect connected data?",
    answer:
      "We enforce least-privilege scoping, tenant isolation, end-to-end encrypted credential storage with automatic rotation support, and granular redaction controls to ensure sensitive data is fully protected across all workflows.",
  },
  {
    id: "5",
    question: "Can integrations trigger approval workflows?",
    answer:
      "Yes. Connected system actions can automatically trigger human-in-the-loop or policy-based approval requests within tools like Slack or Teams before any external execution takes place.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function IntegrationsFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative w-full bg-[#0B1524] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex items-center justify-center overflow-hidden">
      <div className="max-w-[900px] w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.header
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#D9A755] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#D9A755]/80 inline-block -translate-y-[1px]" />
            <span>INTEGRATIONS FAQ</span>
          </div>

          <h2 className="text-[32px] leading-[1.2] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            Answers for IT, legal & procurement.
          </h2>
        </motion.header>

        {/* Accordion List */}
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <motion.div
                key={faq.id}
                variants={fadeUpVariants}
                className="bg-[#0B1320] border border-[#162235] rounded-xl overflow-hidden transition-colors duration-200 hover:border-[#1F314B]"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none group"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] md:text-[16px] font-bold text-white tracking-tight group-hover:text-[#20E7F2] transition-colors">
                    {faq.question}
                  </span>
                  <span className="ml-4 flex-shrink-0 text-[#20E7F2]">
                    {isOpen ? (
                      <Minus className="w-4 h-4 stroke-[2]" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[2]" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-6 pb-5 pt-1 text-[13px] leading-[1.6] text-slate-400 border-t border-[#162235]/60 font-normal">
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
