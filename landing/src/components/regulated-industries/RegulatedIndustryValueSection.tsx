"use client";

import React from "react";
import { motion } from "framer-motion";

export default function RegulatedIndustryValueSection() {
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

  const cards = [
    {
      title: "Policy-first",
      subtitle: "COMPLIANCE TIMING",
      description:
        "Regulatory rules enforced before approval — reducing the likelihood of compliant content being rejected at legal review or after publication.",
    },
    {
      title: "Export ready",
      subtitle: "REGULATORY EVIDENCE",
      description:
        "Complete evidence packages available for regulatory inquiry without manual assembly — policy checks, approvals, and final artifacts sealed per campaign.",
    },
    {
      title: "Configurable",
      subtitle: "PER-JURISDICTION RULES",
      description:
        "Rules configured per market, regulatory framework, product category, and distribution channel — supporting global organisations operating across multiple regimes simultaneously.",
    },
    {
      title: "Board ready",
      subtitle: "GOVERNANCE REPORTING",
      description:
        "AI governance maturity, compliance check coverage, and evidence completeness reportable as enterprise KPIs — for board, regulatory, and procurement audiences.",
    },
  ];

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto flex flex-col gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Top Hero Banner Card */}
        <motion.div
          variants={itemVariants}
          className="relative w-full rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[340px] flex items-center p-8 sm:p-12 lg:p-14"
        >
          {/* Background Image with Dark Gradient Overlay */}
          <img
            src="/images/regulated-industries/build.png"
            alt="City skyline"
            className="absolute inset-0 w-full h-full object-cover object-center grayscale contrast-125 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C1422]/90 via-[#0C1422]/70 to-transparent" />

          {/* Banner Content */}
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-[2px] bg-[#C5A059]" />
              <span className="text-[10px] tracking-widest uppercase font-mono text-[#C5A059]">
                REGULATED INDUSTRY VALUE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-[1.18] text-white">
              Compliance evidence reduces regulatory exposure. Governance
              maturity builds enterprise trust.
            </h2>
          </div>
        </motion.div>

        {/* Bottom 4-Column Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-[#0C1422] border border-white/5 hover:border-white/10 rounded-xl p-6 sm:p-7 flex flex-col justify-start transition-all duration-200"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-[#00E5FF] tracking-tight mb-1">
                {card.title}
              </h3>
              <span className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-4 block">
                {card.subtitle}
              </span>
              <p className="text-xs sm:text-[13px] text-gray-400 leading-relaxed font-normal">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
