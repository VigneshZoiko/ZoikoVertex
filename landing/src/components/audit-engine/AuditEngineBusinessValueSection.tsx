"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function AuditEngineBusinessValueSection() {
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
      title: "<30s",
      subtitle: "EVIDENCE RETRIEVAL",
      description:
        "Answer auditor, regulator, and legal questions in seconds — replacing the multi-week evidence reconstruction projects that follow every inquiry.",
    },
    {
      title: "Zero",
      subtitle: "UNTRACEABLE ACTIONS",
      description:
        "No AI action, approval, override, or publication occurs outside the evidence architecture. There is no path that bypasses the record.",
    },
    {
      title: "Export ready",
      subtitle: "REGULATOR & LEGAL FORMATS",
      description:
        "Evidence bundles assemble continuously and export on demand — no scramble to reconstruct a defensible record after the fact.",
    },
    {
      title: "Board ready",
      subtitle: "GOVERNANCE REPORTING",
      description:
        "Evidence coverage, decision volumes, override rates, and policy trigger history reportable as governance KPIs for executive and board audiences.",
    },
  ];

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 px-6 sm:px-10 lg:px-16 overflow-hidden">
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
          className="relative w-full rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[380px] flex items-center p-8 sm:p-12 lg:p-14"
        >
          {/* Background Image */}
          <Image
            src="/images/audit-engine/BUSINESS-VALUE.png"
            alt="Governance reporting dashboard"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Dark Overlay Vignette */}
          <div className="absolute inset-0 bg-[#000000]/60 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/80 via-[#000000]/50 to-transparent z-[1]" />

          {/* Banner Content */}
          <div className="relative z-10 max-w-120">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-[2px] bg-[#C5A059]" />
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#C5A059]">
                AUDIT ENGINE BUSINESS VALUE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-bold tracking-tight leading-[1.12] text-white mb-4">
              Auditability is not a cost. It is a governance asset.
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal max-w-lg">
              Enterprises that can evidence their AI governance move faster
              through procurement, regulatory review, and security assessment —
              turning the audit layer from overhead into competitive advantage.
            </p>
          </div>
        </motion.div>

        {/* Bottom 4-Column Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="border border-white/5 hover:border-white/10 rounded-xl p-6 sm:p-7 flex flex-col justify-start transition-all duration-200"
            >
              <h3 className="text-2xl sm:text-[30px] font-bold text-[#20E7F2] tracking-tight leading-none mb-2.5">
                {card.title}
              </h3>
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-gray-500 mb-3.5 block leading-tight">
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
