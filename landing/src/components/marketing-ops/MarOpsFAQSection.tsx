"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function MarOpsFAQSection() {
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
      question: "What does ZoikoVertex do for marketing operations teams?",
      answer:
        "ZoikoVertex provides an enterprise-grade execution and governance layer for marketing operations, enabling seamless workflow orchestration, automated brand and regulatory checks, and end-to-end evidence tracking across all campaigns.",
    },
    {
      question: "How does ZoikoVertex reduce marketing operations bottlenecks?",
      answer:
        "By enforcing automated approval routing, SLA timers, and proactive escalation paths, ZoikoVertex eliminates manual follow-ups and keeps briefs moving efficiently from intake to publication.",
    },
    {
      question:
        "Can ZoikoVertex integrate with existing marketing technology stacks?",
      answer:
        "Yes. ZoikoVertex sits above your tech stack with native integrations and custom connectors for CRMs, DAMs, work management platforms, and BI tools without requiring you to replace your current software.",
    },
    {
      question:
        "How does ZoikoVertex support marketing operations teams managing multiple agencies and vendors?",
      answer:
        "It provides unified brief intake templates, standardized governance checks, and external portal views so agency deliverables meet brand and compliance rules before entering internal approval chains.",
    },
    {
      question:
        "What reporting does ZoikoVertex provide for marketing operations?",
      answer:
        "The built-in ROI Engine tracks execution velocity, cycle-time reductions, SLA adherence, rework rates, and governance coverage—delivering executive-ready KPIs for board and leadership review.",
    },
    {
      question:
        "How does ZoikoVertex support global marketing operations teams?",
      answer:
        "It supports per-jurisdiction rule sets, multi-region compliance profiles, localized workflows, and multi-currency tracking so global teams can operate consistently across diverse regulatory landscapes.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 lg:py-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
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
              MARKETING OPS QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-xl"
          >
            Common questions from marketing operations teams.
          </motion.h2>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Side - FAQ Accordion Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5"
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
            className="lg:col-span-5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Top Office Image with Bottom Fade */}
            <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden">
              <Image
                src="/images/marketing-ops/small.png"
                alt="Marketing operations live workflow demo"
                fill
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-[#080C10]/40 to-transparent" />
            </div>

            {/* Bottom Card Copy */}
            <div className="p-6 sm:p-7 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
                  MARKETING OPS DEMO
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                See governed marketing operations in a live workflow.
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                A focused walkthrough for marketing operations teams — showing
                workflow orchestration, approval routing, stack integrations,
                and performance measurement across a real campaign lifecycle.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
