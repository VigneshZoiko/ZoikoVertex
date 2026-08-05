"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AuditEngineArchitectureSection() {
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

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#20E7F2]">
              FIVE-LAYER EVIDENCE ARCHITECTURE
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white mb-4"
          >
            One evidence engine. Five components. Complete accountability.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal max-w-2xl"
          >
            Each layer serves a distinct governance function. Together they
            create an interlocked evidence system that covers every dimension of
            enterprise AI accountability.
          </motion.p>
        </div>

        {/* Bento Grid Container */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {/* Component 01: AUDIT TRAIL (Tall Left Card) */}
          <div className="relative group lg:col-span-4 min-h-[520px] bg-[#0C1422] flex flex-col justify-end p-6 sm:p-8">
            <img
              src="/images/audit-engine/COMPONENT 01.png"
              alt="Audit Trail"
              className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/80 to-transparent" />

            <div className="relative z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#C5A059] block mb-3">
                COMPONENT 01 · AUDIT TRAIL
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-tight mb-3 text-white">
                The complete event log of everything that happened.
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                Records every material system event — AI agent tasks, workflow
                transitions, approval actions, policy checks, integration calls,
                user actions, and system state changes — with precise
                timestamps, actor references, and cross-links to related
                evidence records.
              </p>
              <a
                href="/auditability"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A059] hover:underline"
              >
                <span>Explore Audit Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area Grid Container */}
          <div className="lg:col-span-8 flex flex-col gap-px bg-[#0C1422]">
            {/* Top Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Component 02: DECISION LEDGER (2 Cols) */}
              <div className="relative group sm:col-span-2 min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/audit-engine/COMPONENT 02.png"
                  alt="Decision Ledger"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    COMPONENT 02 · DECISION LEDGER
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    The record of why every material decision was made.
                  </h3>
                </div>
              </div>

              {/* Component 03: EVIDENCE VAULT */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/audit-engine/COMPONENT 03.png"
                  alt="Evidence Vault"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    COMPONENT 03 · EVIDENCE VAULT
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Sealed, exportable evidence packages per campaign.
                  </h3>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Component 04: FORENSIC HUB */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/audit-engine/COMPONENT 04.png"
                  alt="Forensic Hub"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    COMPONENT 04 · FORENSIC HUB
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Event chain reconstruction for disputes and investigations.
                  </h3>
                </div>
              </div>

              {/* Component 05: IDENTITY LEDGER */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/audit-engine/COMPONENT 05.png"
                  alt="Identity Ledger"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    COMPONENT 05 · IDENTITY LEDGER
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Every privileged action bound to actor, role, and session.
                  </h3>
                </div>
              </div>

              {/* CROSS-LAYER LINKAGE */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/audit-engine/COMPONENT 06.png"
                  alt="Cross-layer linkage"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    CROSS-LAYER LINKAGE
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Every event linked across all five evidence layers.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
