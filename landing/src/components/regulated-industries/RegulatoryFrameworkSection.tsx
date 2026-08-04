"use client";

import React from "react";
import { motion } from "framer-motion";

export default function RegulatoryFrameworkSection() {
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

  const frameworks = [
    {
      framework: "NIST AI RMF",
      coverage:
        "Risk identification, management, oversight, and evidence documentation",
      status: "Aligned",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
    },
    {
      framework: "GDPR / CCPA",
      coverage:
        "Data processing controls, tenant isolation, DPA execution, data subject rights",
      status: "Supported",
      statusStyle: "text-[#25CA7B] border-[#25CA7B]/40 bg-[#25CA7B]/10",
    },
    {
      framework: "FCA (UK financial promotions)",
      coverage:
        "Financial promotion detection, fair balance, risk warning enforcement",
      status: "Configurable",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
    },
    {
      framework: "SEC / FINRA (US marketing)",
      coverage:
        "Investment promotion restrictions, past performance rules, disclaimer enforcement",
      status: "Configurable",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
    },
    {
      framework: "HIPAA (healthcare marketing)",
      coverage:
        "PHI handling controls, marketing consent, patient data workflow isolation",
      status: "Configurable",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
    },
    {
      framework: "ASA / CAP (UK advertising)",
      coverage:
        "Substantiation, misleading claims, and CAP code enforcement by category",
      status: "Configurable",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
    },
    {
      framework: "ISO 27001 / SOC 2",
      coverage:
        "Security controls, access management, audit logging, and evidence retention",
      status: "In process",
      statusStyle: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
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
        {/* Left Column - Full Bleed Image Container */}
        <div className="relative w-full min-h-[320px] lg:min-h-0 lg:h-full overflow-hidden">
          <img
            src="/images/regulated-industries/laptop.png"
            alt="Workspace documentation"
            className="absolute inset-0 w-full h-full object-cover object-center grayscale contrast-125 opacity-60"
          />
          {/* Edge gradients for seamless transitions */}
        </div>

        {/* Right Column - Table & Content Layout */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-12 max-w-2xl mx-auto lg:mx-0">
          {/* Section Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#00E5FF]">
              REGULATORY FRAMEWORK ALIGNMENT
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            Aligned with the governance standards enterprise compliance teams
            require.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal mb-6"
          >
            ZoikoVertex’s governance architecture is designed to support
            compliance obligations across multiple regulatory frameworks
            simultaneously.
          </motion.p>

          {/* Framework Table */}
          <motion.div variants={itemVariants} className="w-full mb-6">
            <div className="grid grid-cols-12 text-[10px] font-mono tracking-wider uppercase text-gray-500 pb-2 border-b border-white/10 mb-2">
              <span className="col-span-4 sm:col-span-3">
                FRAMEWORK / REGULATION
              </span>
              <span className="col-span-6 sm:col-span-7">
                ZOIKOVERTEX COVERAGE
              </span>
              <span className="col-span-2 text-right">STATUS</span>
            </div>

            <div className="divide-y divide-white/5">
              {frameworks.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 items-center py-2.5 text-xs gap-1"
                >
                  <span className="col-span-4 sm:col-span-3 font-mono font-semibold text-[#00E5FF]">
                    {row.framework}
                  </span>
                  <span className="col-span-6 sm:col-span-7 text-gray-400 font-normal pr-2 text-[11px] sm:text-xs">
                    {row.coverage}
                  </span>
                  <div className="col-span-2 flex justify-end">
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border ${row.statusStyle}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Legal Disclaimer Note */}
          <motion.p
            variants={itemVariants}
            className="text-[10px] font-mono text-gray-500 leading-relaxed tracking-tight"
          >
            Regulatory alignment details confirmed during enterprise onboarding.
            This overview is for reference only and does not constitute legal
            advice. Configuration requirements vary by jurisdiction, sector, and
            specific regulatory obligation.
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
