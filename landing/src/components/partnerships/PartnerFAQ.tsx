"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Who can become a ZoikoVertex partner?",
    answer:
      "Organizations that deliver enterprise capabilities, possess security/compliance maturity, or provide complementary technology solutions can qualify for the ZoikoVertex partner network.",
  },
  {
    question: "Is the partner program open to everyone?",
    answer:
      "No. The partner program is selective and governed. We screen applicants against strict enterprise readiness, security compliance, and market alignment standards before approval.",
  },
  {
    question: "What types of partnerships are available?",
    answer:
      "We offer Implementation, Technology, Agency, Integration, Referral / Co-Sell, and Strategic Alliance tracks depending on your business model and capabilities.",
  },
  {
    question: "Can technology partners build integrations into ZoikoVertex?",
    answer:
      "Yes. Technology and integration partners get access to API documentation, sandbox test environments, and dedicated support to build enterprise-grade integrations.",
  },
  {
    question: "Does ZoikoVertex support co-selling with partners?",
    answer:
      "Yes. Qualified co-sell and referral partners receive joint pipeline support, co-marketing enablement, and dedicated alliances team guidance.",
  },
  {
    question: "Are partners required to complete certification?",
    answer:
      "Selected partner tiers (such as Implementation and Strategic Alliances) require team certification to ensure delivery quality and governance compliance.",
  },
  {
    question: "What compliance expectations apply to all partners?",
    answer:
      "All partners must adhere to data privacy standards, execute DPA terms, respect responsible AI messaging, and pass anti-corruption screening.",
  },
  {
    question: "How long does the full partner review process take?",
    answer:
      "Initial responses are sent within 5 business days. Complete qualification, legal, and security review typically takes 2 to 4 weeks.",
  },
];

export default function PartnerFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
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
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#050B14] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNER QUESTIONS
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white max-w-2xl leading-tight">
            Common questions from prospective partners.
          </h2>
        </motion.div>

        {/* Content Layout: FAQ List + CTA Box */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left Side: Accordion Group */}
          <div className="lg:col-span-7 bg-[#0A111E] border border-[#1E293B] rounded-2xl overflow-hidden divide-y divide-[#1E293B]">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div key={index} className="transition-colors duration-200">
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full py-5 px-6 sm:px-8 flex items-center justify-between text-left hover:bg-[#0F192B]/50 transition-colors group"
                  >
                    <span className="text-sm sm:text-base font-medium text-white group-hover:text-[#2DD4BF] transition-colors pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#2DD4BF]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 sm:px-8 pb-5 pt-1 text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-normal border-t border-[#1E293B]/40">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right Side: Featured Alliances Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 bg-[#0A111E] border border-[#1E293B] rounded-2xl overflow-hidden flex flex-col justify-between h-full"
          >
            {/* Top Image Box */}
            <div className="relative w-full h-48 sm:h-56 overflow-hidden">
              <Image
                src="/images/partnerships/last.png"
                alt="World Business News background"
                fill
                className="object-cover object-top opacity-90"
              />
              {/* Gradient transition into card content */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A111E] via-[#0A111E]/40 to-transparent" />
            </div>

            {/* Card Content & Actions */}
            <div className="p-6 sm:p-8 pt-0 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[#D97706] text-[10px] font-mono tracking-widest uppercase font-semibold block mb-3">
                  ZOIKOVERTEX ALLIANCES
                </span>

                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 leading-snug">
                  Talk to alliances before applying if it&apos;s a strategic
                  discussion.
                </h3>

                <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed font-normal mb-8">
                  For strategic alliances, complex co-sell, or deep product
                  integration &mdash; speak with the alliances team before
                  submitting a formal application.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full bg-[#C9A84C] text-start hover:bg-[#B45309] text-black font-medium text-sm py-3 px-6 rounded-full transition-colors duration-200 text-center block shadow-lg shadow-[#D97706]/10"
                >
                  Become a Partner
                </button>

                <button
                  type="button"
                  className="w-full bg-[#20E7F2] hover:bg-[#00B8D4] text-black font-medium text-sm py-3 px-6 rounded-full transition-colors duration-200 flex items-center justify-start gap-2 shadow-lg shadow-[#00E5FF]/10"
                >
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  <span>Talk to Alliances</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
