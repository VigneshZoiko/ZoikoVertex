"use client";

import React from "react";
import { motion } from "framer-motion";

export default function BrandComplianceBusinessValueSection() {
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
      subtitle: "CONTENT GOVERNANCE",
      description:
        "Brand and compliance rules run before every approval — reducing the legal escalations, revisions, and brand incidents that occur when issues are caught after publication.",
    },
    {
      title: "Zero",
      subtitle: "UNCHECKED PUBLISHES",
      description:
        "No AI-generated content reaches a distribution channel without at least one policy check and one human approval — by architecture, not relying on team discipline.",
    },
    {
      title: "Per region",
      subtitle: "RULE PRECISION",
      description:
        "Brand and compliance rules scoped per region, channel, language, and product category — global standards maintained without blocking local relevance.",
    },
    {
      title: "Audit ready",
      subtitle: "LEGAL PREPAREDNESS",
      description:
        "Every compliance check, policy trigger, and approval decision sealed in the Evidence Vault — ready for legal review, regulatory inquiry, or dispute resolution without manual assembly.",
    },
  ];

  return (
    <section className="relative w-full bg-[#0A0E17] text-white py-16 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto flex flex-col gap-5"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Top Hero Banner Card */}
        <motion.div
          variants={itemVariants}
          className="relative w-full rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[380px] flex items-center p-8 sm:p-12 lg:p-14 bg-[#111D2E]"
        >
          {/* Background Image */}
          <img
            src="/images/brand-compliance/image.png"
            alt="Brand protection and compliance analytics dashboard"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
          />

          {/* Gradient Overlay matching dark theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C1422]/90 via-[#0C1422]/60 to-transparent z-[1]" />

          {/* Banner Content */}
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-[2px] bg-[#00E5FF]" />
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#00E5FF]">
                BUSINESS VALUE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-bold tracking-tight leading-[1.12] text-white mb-4">
              Brand protection and compliance are now measurable, not assumed.
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 max-w-110 leading-relaxed font-normal">
              Policy triggers blocked, compliance incidents prevented, brand
              consistency maintained — all measurable through the ZoikoVertex
              ROI Engine.
            </p>
          </div>
        </motion.div>

        {/* Bottom 4-Column Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-[#111D2E]/80 border border-white/5 hover:border-white/10 rounded-xl p-6 sm:p-7 flex flex-col justify-start transition-all duration-200"
            >
              <h3 className="text-2xl sm:text-[28px] font-bold text-[#00E5FF] tracking-tight leading-none mb-2.5">
                {card.title}
              </h3>
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-gray-400 mb-3.5 block leading-tight">
                {card.subtitle}
              </span>
              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
