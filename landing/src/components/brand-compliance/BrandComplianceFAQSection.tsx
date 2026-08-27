"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function BrandComplianceFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
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
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const faqs = [
    {
      question: "What does ZoikoVertex do for brand governance?",
      answer:
        "ZoikoVertex enforces brand standards directly at the content generation and workflow layers—ensuring tone, messaging, visual rules, and brand guidelines are maintained consistently across all execution channels.",
    },
    {
      question:
        "How does ZoikoVertex handle compliance checking for marketing content?",
      answer:
        "Content is evaluated against predefined legal, regulatory, and policy rule sets before entering approval workflows, catching potential claims, disclosures, and compliance issues automatically.",
    },
    {
      question:
        "Can ZoikoVertex handle regulated marketing categories like finance or healthcare?",
      answer:
        "Yes. ZoikoVertex supports category-specific compliance rulesets tailored for highly regulated industries like financial services, healthcare, pharmaceuticals, and sustainability claims.",
    },
    {
      question: "What happens when a brand or compliance policy is triggered?",
      answer:
        "When a rule is triggered, the asset is automatically flagged with severity context and routed to the designated legal, compliance, or brand reviewer before it can move to publishing.",
    },
    {
      question: "Does ZoikoVertex replace legal review for marketing content?",
      answer:
        "No, it complements legal teams by eliminating obvious violations upfront and giving reviewers pre-screened assets with clear audit trails, significantly reducing review cycle times.",
    },
    {
      question:
        "Can brand rules be configured per region, channel, and product line?",
      answer:
        "Yes, rules can be scoped precisely by jurisdiction, language, distribution channel, and product category to ensure local relevance without compromising central governance.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-[#0A0E17] text-white py-16 lg:py-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="w-full">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
              BRAND & COMPLIANCE QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-xl"
          >
            Common questions about brand governance and compliance.
          </motion.h2>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Side - FAQ Accordion Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 bg-[#0C1422] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5"
          >
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="w-full transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-4 focus:outline-none"
                  >
                    <span className="text-xs sm:text-[13px] font-bold text-white tracking-tight leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#00E5FF]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-5 sm:px-5 sm:pb-5 text-[11px] sm:text-xs text-gray-400 leading-relaxed font-normal">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>

          {/* Right Side - Live Workflow Demo Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 bg-[#0C1422] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Top Image with Fade Overlay */}
            <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden">
              <Image
                src="/images/brand-compliance/paper.png"
                alt="Brand and compliance governance live workflow demo"
                fill
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/40 to-transparent" />
            </div>

            {/* Bottom Card Copy */}
            <div className="p-6 sm:p-7 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
                  BRAND & COMPLIANCE DEMO
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                See brand and compliance governance in a live workflow.
              </h3>

              <p className="text-[16px] max-w-95 text-gray-400 leading-relaxed font-normal">
                A focused walkthrough showing brand voice enforcement, claims
                checking, regional rule scoping, and evidence capture across a
                real marketing campaign.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
