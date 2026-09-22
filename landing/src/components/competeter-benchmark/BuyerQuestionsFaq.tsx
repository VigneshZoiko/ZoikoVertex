"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

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
  hidden: {
    opacity: 0,
    y: 20,
  },
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
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function BuyerQuestionsFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-[#F4F6FB] px-4 py-20 font-sans text-slate-900 sm:px-8 md:px-12 lg:px-20">
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          margin: "-50px",
        }}
      >
        {/* Section Subheader & Title */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-[1.5px] w-4 bg-[#68758A]" />

            <span
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: "#68758A" }}
            >
              COMMON EVALUATION QUESTIONS
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#0B101D] sm:text-4xl md:text-5xl">
            Buyer questions answered directly.
          </h2>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Column: FAQ Accordion List */}
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-2xl bg-white shadow-sm lg:col-span-7"
          >
            {faqData.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={faq.id}
                  className="divide-y divide-[#E2E8F0] transition-colors duration-150"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#F8FAFC]"
                  >
                    <span className="text-xs font-bold leading-snug text-[#0F172A] sm:text-sm">
                      {faq.question}
                    </span>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 text-[#0F172A]"
                          : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{
                          height: 0,
                          opacity: 0,
                        }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.25,
                          ease: "easeInOut",
                        }}
                        className="overflow-hidden bg-[#F8FAFC]/50"
                      >
                        <div className="p-5 pt-0 text-xs font-normal leading-relaxed text-[#64748B]">
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
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0B101D] p-7 text-white shadow-xl sm:p-9 lg:col-span-5"
          >
            <div>
              {/* Top Eyebrow Tag */}
              <div className="mb-3">
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "#C9A84CB2" }}
                >
                  EVALUATION-STAGE BUYERS
                </span>
              </div>

              {/* Main Heading */}
              <h3 className="mb-4 text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                Compare ZoikoVertex against your current stack — with
                evidence, not claims.
              </h3>

              {/* Description */}
              <p className="mb-6 text-xs font-normal leading-relaxed text-[#8EA0B8] sm:text-sm">
                Book a 45-minute benchmark walkthrough. Bring your existing
                tools. We will walk through the governance gap, evidence
                readiness, and ROI case.
              </p>

              {/* CTA Buttons */}
              <div className="flex w-full flex-col gap-3">
                {/* Primary CTA */}
                <Link
                  href="#benchmark"
                  className="block w-full whitespace-nowrap rounded-xl bg-[#20E7F2] px-6 py-3.5 text-center text-xs font-bold text-[#090D16] transition-opacity duration-150 hover:opacity-90 sm:text-sm"
                >
                  Book a benchmark walkthrough
                </Link>

                {/* Secondary CTA */}
                <Link
                  href="/roi-governance-audit"
                  className="block w-full whitespace-nowrap rounded-xl border border-slate-700/80 bg-[#161F33] px-6 py-3 text-center text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#1E2A45] sm:text-sm"
                >
                  View ROI &amp; Governance Audit
                </Link>
              </div>
            </div>

            {/* Bottom Tech/Feature Badges */}
            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-slate-800/90 bg-[#101726] px-2.5 py-1 font-mono text-[9px] text-[#64748B]"
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