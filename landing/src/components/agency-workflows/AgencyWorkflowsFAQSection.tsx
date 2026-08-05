"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function AgencyWorkflowsFAQSection() {
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
      question: "How does ZoikoVertex help marketing agencies?",
      answer:
        "ZoikoVertex gives agencies a governed execution platform for client work — structured brief intake, AI-assisted content generation with brand rules enforced at the generation layer, client approval flows, revision tracking, and evidence capture for every deliverable.",
    },
    {
      question:
        "Can agencies manage multiple clients with separate approval workflows?",
      answer:
        "Yes. Each client operates in an isolated workspace with its own brand voice, compliance profile, approval chain, reviewers, and Evidence Vault. Client data, rules, and evidence never cross workspace boundaries.",
    },
    {
      question: "How does ZoikoVertex reduce agency revision cycles?",
      answer:
        "Brand and compliance rules are applied when content is generated, not discovered at client review. Removing avoidable brand misalignment from the review stage eliminates the most common trigger for repeat revision rounds.",
    },
    {
      question: "Does ZoikoVertex protect agency IP and client data?",
      answer:
        "Every AI-assisted deliverable carries an Evidence Vault record covering the generation event, prompt and output, human modifications, approvals, and final artifact — giving both agency and client a clear provenance chain. Workspace isolation and role-scoped access control who can see what.",
    },
    {
      question: "Can clients participate directly in the approval workflow?",
      answer:
        "Yes. Client reviewers are invited into the governed workflow with scoped access. Approvals are captured in the Decision Ledger with identity binding, rationale, version reference, and timestamp — replacing email and Slack sign-offs.",
    },
    {
      question:
        "How does ZoikoVertex handle AI content attribution for agencies?",
      answer:
        "Each generation event is recorded with the agent, prompt, output, brand check result, and subsequent human edits. This produces an auditable record of what was AI-generated versus human-authored across every campaign deliverable.",
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
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
              AGENCY WORKFLOW QUESTIONS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-xl"
          >
            Common questions from agency teams.
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
                        isOpen ? "rotate-180 text-[#20E7F2]" : ""
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

          {/* Right Side - Live Demo Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Top Image with Bottom Fade */}
            <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden">
              <img
                src="/images/agency-workflows/Agency-Workflows-Demo.png"
                alt="Agency workflows live demo"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-[#080C10]/40 to-transparent" />
            </div>

            {/* Bottom Card Copy */}
            <div className="p-6 sm:p-7 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
                  AGENCY WORKFLOWS DEMO
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                See governed agency execution in a live client campaign.
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                A focused walkthrough showing brief intake, AI content
                generation, client approval flow, revision tracking, and
                evidence capture for a real agency campaign lifecycle.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
