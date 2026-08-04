"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ComplianceArchitectureSection() {
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const cards = [
    {
      badge: "PRE-APPROVAL GATE",
      title: "Policy checks run before every approval routing",
      description:
        "Content is checked against brand and compliance rules before it enters the approval workflow — reducing the likelihood that reviewers encounter policy violations for the first time at approval.",
      imgSrc: "/images/brand-compliance/2.png",
    },
    {
      badge: "CLAIMS DETECTION",
      title: "Regulated claims detected and routed automatically",
      description:
        "Pricing, performance, sustainability, health, and financial claims are detected against configured rule sets and routed to the appropriate reviewer — legal, compliance, or senior marketing — with severity context.",
      imgSrc: "/images/brand-compliance/3.png",
    },
    {
      badge: "JURISDICTION RULES",
      title: "Jurisdiction-specific advertising standards applied per region",
      description:
        "Advertising regulations, consumer protection rules, privacy disclosures, and data usage requirements vary by jurisdiction. ZoikoVertex applies the correct ruleset per market, language, and distribution channel.",
      imgSrc: "/images/brand-compliance/4.png",
    },
    {
      badge: "OVERRIDE GOVERNANCE",
      title: "Policy overrides require documented authority and rationale",
      description:
        "When a reviewer overrides a compliance trigger, the Decision Ledger captures the override actor, authority basis, justification, and risk accepted — making compliance exceptions traceable and auditable.",
      imgSrc: "/images/brand-compliance/5.png",
    },
    {
      badge: "CHANNEL RULES",
      title: "Channel-specific compliance requirements applied at activation",
      description:
        "Social, paid media, email, e-commerce, retail media, and in-store channels have distinct compliance, format, and disclosure requirements. ZoikoVertex applies channel-level rules at the activation stage.",
      imgSrc: "/images/brand-compliance/6.png",
    },
    {
      badge: "COMPLIANCE EVIDENCE",
      title: "Every compliance check result stored in the Evidence Vault",
      description:
        "Policy check outcomes, triggered rules, severity scores, reviewer decisions, and final content artifacts are sealed in the Evidence Vault per campaign — ready for legal proceedings or regulatory inquiry.",
      imgSrc: "/images/brand-compliance/7.png",
    },
  ];

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {/* Header Section */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              COMPLIANCE ARCHITECTURE
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white mb-4"
          >
            Compliance enforced at the workflow layer — not the publishing
            layer.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal"
          >
            ZoikoVertex positions compliance checks before approval, not after.
            Every AI-generated asset is evaluated before it reaches a human
            reviewer — reducing the compliance burden and improving review
            quality.
          </motion.p>
        </div>

        {/* 6 Grid Cards Layout with Gap spacing between cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="group relative flex flex-col justify-between border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20"
            >
              {/* Image Container with Rounded Corner and Gradient Overlay */}
              <div className="relative w-full h-44 mb-6 rounded-xl overflow-hidden bg-black/30">
                <img
                  src={card.imgSrc}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111D2E] via-transparent to-transparent opacity-90" />
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-start p-6">
                <span className="inline-block px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase text-[#00E5FF] bg-[#00E5FF]/10 rounded border border-[#00E5FF]/20 w-max mb-3">
                  {card.badge}
                </span>

                <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb-3">
                  {card.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
