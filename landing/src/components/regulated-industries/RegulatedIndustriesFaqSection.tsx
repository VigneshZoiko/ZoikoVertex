"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function RegulatedIndustriesFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const faqs = [
    {
      question: "Which regulated industries does ZoikoVertex support?",
      answer:
        "ZoikoVertex provides governed AI execution across six key regulated sectors: Financial Services & Fintech, Healthcare & Life Sciences, Enterprise Retail, Telecommunications, B2B SaaS & Technology, and Logistics & Supply Chain.",
    },
    {
      question:
        "How does ZoikoVertex handle financial services marketing compliance?",
      answer:
        "We enforce FCA, SEC, and FINRA standards by embedding pre-approval checks, fair balance verification, risk disclosures, and mandatory promotional disclaimers directly into the AI content generation pipeline.",
    },
    {
      question: "Is ZoikoVertex appropriate for healthcare marketing?",
      answer:
        "Yes. ZoikoVertex supports HIPAA compliance, off-label claim restrictions, medical claims substantiation, and strict patient data isolation across all generated assets and marketing workflows.",
    },
    {
      question: "How does the governance framework align with NIST AI RMF?",
      answer:
        "Our governance model maps directly to NIST AI RMF core functions—Map, Measure, Manage, and Govern—providing continuous risk identification, automated audit logging, and verifiable compliance evidence.",
    },
    {
      question: "Can ZoikoVertex support GDPR-compliant marketing operations?",
      answer:
        "Absolutely. The platform enforces strict data processing controls, tenant isolation, automated DPA execution, and data subject rights management at scale.",
    },
    {
      question:
        "Does ZoikoVertex provide compliance evidence for regulatory inquiries?",
      answer:
        "Yes. Every campaign generates a sealed, exportable regulatory evidence package containing rule check history, timestamped approvals, context triggers, and published artifacts.",
    },
  ];

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              REGULATED INDUSTRIES QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.15] text-white"
          >
            Common questions from compliance and legal teams.
          </motion.h2>
        </div>

        {/* Main Grid: FAQ Accordions (Left) + Demo Card (Right) */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* FAQ Accordion Column */}
          <div className="lg:col-span-7 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className="transition-colors duration-150">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-semibold text-white/90 hover:text-white transition-colors gap-4"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#00E5FF]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed font-normal">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right Demo Feature Card */}
          <div className="lg:col-span-5 relative group border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-end min-h-[460px]">
            {/* Top Image Preview with Dark Radial Gradient Mask */}
            <div className="relative w-full h-[220px] overflow-hidden">
              <img
                src="/images/regulated-industries/faq.png"
                alt="Office architecture"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1117] via-[#0B1117]/40 to-transparent" />
            </div>

            {/* Card Content Area */}
            <div className="p-6 sm:p-7 relative z-10 flex-1 flex flex-col justify-end">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2.5">
                REGULATED INDUSTRIES DEMO
              </span>

              <h3 className="text-xl sm:text-2xl font-bold leading-snug mb-3 text-white">
                See governed AI marketing for your regulated sector.
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                A focused walkthrough for compliance and legal teams — showing
                policy rule configuration, regulated claims detection, approval
                routing, and regulatory evidence packaging for your specific
                industry vertical.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
