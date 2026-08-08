"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    id: "faq-1",
    question: "How is ZoikoVertex different from project management software?",
    answer:
      "Unlike standard project management tools that track task progress and assignments, ZoikoVertex acts as an agentic execution governance layer—enforcing policy rules, capturing immutable decision evidence, and binding identity across every automated workflow node.",
  },
  {
    id: "faq-2",
    question: "Is ZoikoVertex a marketing automation platform?",
    answer:
      "No. Marketing automation platforms manage campaign scheduling and delivery, whereas ZoikoVertex governs agentic content execution—ensuring approval chains, brand guidelines, and legal hold requirements are programmatically enforced.",
  },
  {
    id: "faq-3",
    question: "Does ZoikoVertex replace AI copilot tools?",
    answer:
      "No. AI copilots excel at generating drafts and summaries. ZoikoVertex sits alongside copilots to route work through enterprise approval chains, seal evidence records, and bridge the governance gap between assistance and execution.",
  },
  {
    id: "faq-4",
    question: "Can we compare ZoikoVertex to our current stack?",
    answer:
      "Yes. You can bring your current tool stack into a 45-minute benchmark walkthrough where we evaluate your governance gap, evidence readiness, and ROI case against structured enterprise criteria.",
  },
  {
    id: "faq-5",
    question: "Is the benchmark legally reviewed?",
    answer:
      "Yes. Our evaluation framework incorporates standard DPA requirements, compliance regulations, auditability standards, and legal hold controls designed for enterprise procurement review.",
  },
  {
    id: "faq-6",
    question: "What makes ZoikoVertex different in one sentence?",
    answer:
      "ZoikoVertex turns fragmented AI assistance and task tracking into a fully governed, evidence-led operating layer built for enterprise execution.",
  },
];

const tags = [
  "Agentic Architecture",
  "Approval Workflows",
  "Auditability",
  "Responsible AI",
  "Contact Sales",
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function BuyerQuestionsFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-[#F4F6FB] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-slate-900">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Subheader & Title */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#68758A]" />
            <span
              className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase"
              style={{ color: "#68758A" }}
            >
              COMMON EVALUATION QUESTIONS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0B101D]">
            Buyer questions answered directly.
          </h2>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: FAQ Accordion List */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 bg-white rounded-2xl shadow-sm divide-y divide-[#E2E8F0] overflow-hidden"
          >
            {faqData.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div key={faq.id} className="transition-colors duration-150">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-[#F8FAFC] transition-colors gap-4"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#0F172A]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden bg-[#F8FAFC]/50"
                      >
                        <div className="p-5 pt-0 text-xs text-[#64748B] leading-relaxed font-normal">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>

          {/* Right Column: CTA Box Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 bg-[#0B101D] text-white rounded-2xl p-7 sm:p-9 border border-slate-800 shadow-xl flex flex-col justify-between"
          >
            <div>
              {/* Top Eyebrow Tag */}
              <div className="mb-3">
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: "#C9A84CB2" }}
                >
                  EVALUATION-STAGE BUYERS
                </span>
              </div>

              {/* Main Heading */}
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug mb-4">
                Compare ZoikoVertex against your current stack — with evidence,
                not claims.
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#8EA0B8] leading-relaxed mb-8 font-normal">
                Book a 45-minute benchmark walkthrough. Bring your existing
                tools. We will walk through the governance gap, evidence
                readiness, and ROI case.
              </p>

              {/* Primary Green CTA Button */}
              <button
                type="button"
                style={{ backgroundColor: "#20E7F2" }}
                className="w-full text-[#090D16] font-bold text-xs sm:text-sm py-3.5 px-6 rounded-xl hover:opacity-90 transition-opacity duration-150 shadow-md mb-3 cursor-pointer"
              >
                Book a benchmark walkthrough
              </button>

              {/* Secondary Outline CTA Button */}
              <button
                type="button"
                className="w-full bg-[#161F33] hover:bg-[#1E2A45] border border-slate-700/80 text-white font-semibold text-xs sm:text-sm py-3 px-6 rounded-xl transition-colors duration-150 mb-8 cursor-pointer"
              >
                View ROI & Governance Audit
              </button>
            </div>

            {/* Bottom Tech/Feature Badges */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[9px] text-[#64748B] bg-[#101726] border border-slate-800/90 px-2.5 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
