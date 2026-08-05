"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AuditEngineDeepDiveSection() {
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

  const layers = [
    {
      tag: "AUDIT TRAIL",
      tagColors:
        "bg-[#20E7F2]/5 border-[#20E7F2]/20 text-[#20E7F2]",
      title: "Complete event-by-event system log",
      description:
        "Every AI task, workflow transition, approval action, policy check, integration call, and user action — timestamped and actor-referenced. Immutable append-only record.",
      image: "/images/audit-engine/Audit Trail.png",
    },
    {
      tag: "DECISION LEDGER",
      tagColors:
        "bg-[#E2A03F]/5 border-[#E2A03F]/25 text-[#E2A03F]",
      title: "Human-readable decision record",
      description:
        "Approval rationale, rejection reasons, override justifications, exception notes, and policy waivers — capturing the reasoning behind every material governance decision.",
      image: "/images/audit-engine/Decision Ledger.png",
    },
    {
      tag: "EVIDENCE VAULT",
      tagColors:
        "bg-[#25CA7B]/10 border-[#25CA7B]/20 text-[#25CA7B]",
      title: "Sealed campaign evidence packages",
      description:
        "Prompts, AI outputs, policy check results, approved content artifacts, integration confirmations, and exportable bundles — sealed per campaign for legal readiness.",
      image: "/images/audit-engine/Evidence Vault.png",
    },
    {
      tag: "FORENSIC HUB",
      tagColors: "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]",
      title: "Cross-referenced dispute reconstruction",
      description:
        "Reconstruct any disputed, failed, escalated, or anomalous event from linked Audit Trail, Decision Ledger, Evidence Vault, and Identity Ledger records in a single forensic view.",
      image: "/images/audit-engine/Forensic Hub.png",
    },
    {
      tag: "IDENTITY LEDGER",
      tagColors:
        "bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7]",
      title: "Privileged action identity binding",
      description:
        "Every privileged action — approval, override, policy exception, configuration change — bound to actor identity, role, authority level, and session context. Accountability made undeniable.",
      image: "/images/audit-engine/Container3.png",
    },
    {
      tag: "RETENTION & LEGAL HOLDS",
      tagColors:
        "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]",
      title: "Configurable retention and hold management",
      description:
        "Retention classes per record type, jurisdiction-aware policies, and legal-hold controls that suspend deletion for records under litigation or regulatory review.",
      image: "/images/audit-engine/RETENTION-LEGAL-HOLDS.png",
    },
  ];

  const stats = [
    {
      value: "100%",
      label: "EVENT COVERAGE",
      description:
        "Every material action across the governed workflow produces an evidence record — no sampling, no gaps, no opt-out paths.",
    },
    {
      value: "<30s",
      label: "EVIDENCE RETRIEVAL",
      description:
        "Cross-layer evidence for any campaign, decision, or disputed event surfaces in seconds rather than days of manual reconstruction.",
    },
    {
      value: "Export ready",
      label: "REGULATOR & LEGAL FORMATS",
      description:
        "Evidence bundles are assembled continuously and exportable on demand for auditors, regulators, and legal proceedings.",
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
        <div className="mb-12">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#20E7F2]">
              EVIDENCE ARCHITECTURE DEEP-DIVE
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.15] text-white max-w-2xl"
          >
            What each layer captures, stores, and enables.
          </motion.h2>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {layers.map((layer, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-[#0B1117] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-white/20 transition-colors duration-200"
            >
              {/* Card Image with Bottom Fade */}
              <div className="relative w-full h-[160px] overflow-hidden">
                <img
                  src={layer.image}
                  alt={layer.tag}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1117]/40 to-[#0B1117]" />
              </div>

              {/* Card Copy */}
              <div className="px-5 pt-6 pb-6 flex flex-col gap-2">
                <span
                  className={`self-start px-2 py-[3px] rounded-full border text-[9px] font-mono tracking-widest uppercase ${layer.tagColors}`}
                >
                  {layer.tag}
                </span>

                <h3 className="text-base font-bold tracking-tight leading-snug text-white">
                  {layer.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed font-normal">
                  {layer.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stat Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-10 border-t border-white/10">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col justify-start"
            >
              <span className="text-3xl sm:text-[34px] font-bold text-[#20E7F2] tracking-tight leading-none mb-2.5">
                {stat.value}
              </span>
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-gray-500 mb-3 block leading-tight">
                {stat.label}
              </span>
              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
