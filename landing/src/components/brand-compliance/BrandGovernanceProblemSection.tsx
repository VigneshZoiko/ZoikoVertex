"use client";

import React from "react";
import { motion } from "framer-motion";

export default function BrandGovernanceProblemSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const points = [
    {
      number: "01",
      numberColor: "text-[#00E5FF]",
      title: "AI generates at speed — reviews can't keep up",
      description:
        "AI content velocity outpaces human review capacity, creating pressure to skip brand and compliance checks to meet deadlines.",
    },
    {
      number: "02",
      numberColor: "text-[#00E5FF]",
      title: "Brand drift across regions, agencies, and channels",
      description:
        "Without enforced standards, AI-generated content adapts to local interpretations of brand — creating inconsistency that erodes global brand equity.",
    },
    {
      number: "03",
      numberColor: "text-[#00E5FF]",
      title: "Regulated claims bypass legal review",
      description:
        "Pricing, performance, and category-specific claims in AI-generated content reach channels without the compliance review the business legally requires.",
    },
    {
      number: "04",
      numberColor: "text-[#25CA7B]",
      title: "ZoikoVertex: policy checks before every approval",
      description:
        "Brand voice, claims, offers, and regional rules checked at the workflow layer — before human review, before channel activation, with full evidence.",
    },
  ];

  return (
    <section className="relative w-full bg-[#080C10] text-white overflow-hidden">
      <motion.div
        className="w-full grid grid-cols-1 lg:grid-cols-2 min-h-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Left Column - Image Container */}
        <div className="relative w-full min-h-[360px] lg:min-h-0 lg:h-full overflow-hidden">
          <img
            src="/images/brand-compliance/left.png"
            alt="Brand governance problem concept"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Right Column - Brand Governance Content Container */}
        <div className="flex flex-col bg-[#0C1422] justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-14 max-w-3xl mx-auto lg:mx-0">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#00E5FF]">
              THE BRAND GOVERNANCE PROBLEM
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl max-w-85 lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            AI accelerates content. Brand and compliance exposure accelerates
            with it.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm max-w-90 text-gray-400 leading-relaxed font-normal mb-5"
          >
            Without governed AI execution, every content channel becomes a brand
            and compliance risk vector — moving faster than the controls
            designed to protect the business.
          </motion.p>

          {/* Compact Cards List */}
          <div className="flex flex-col gap-2.5 w-full">
            {points.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#111D2E] border border-white/5 rounded-lg p-3.5 sm:p-4 transition-all duration-200 hover:border-white/10"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-mono text-sm font-bold ${item.numberColor} pt-0.5 shrink-0`}
                  >
                    {item.number}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[13px] max-w-120 sm:text-xs text-gray-400 leading-normal font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
