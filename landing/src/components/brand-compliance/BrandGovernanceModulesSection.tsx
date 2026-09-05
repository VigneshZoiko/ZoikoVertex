"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function BrandGovernanceModulesSection() {
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
    <section className="relative w-full bg-[#0A0E17] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
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
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              BRAND GOVERNANCE MODULES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl max-w-160 font-bold tracking-tight leading-[1.15] text-white"
          >
            Every dimension of brand and compliance governance — in one
            platform.
          </motion.h2>
        </div>

        {/* Bento Grid Container */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {/* Card 1: BRAND VOICE ENGINE (Tall Left Card) */}
          <div className="relative group lg:col-span-4 min-h-[520px] bg-[#0C1422] flex flex-col justify-end p-6 sm:p-8">
            <Image
              src="/images/marketing-ops/1.png"
              alt="Brand Voice Engine"
              fill
              className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/80 to-transparent" />

            <div className="relative z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-3">
                BRAND VOICE ENGINE
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-tight mb-3 text-white">
                Tone, vocabulary, and messaging standards enforced at the
                content generation layer.
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                Configure approved tone-of-voice, permitted vocabulary, brand
                messaging frameworks, and prohibited language — applied as
                policy checks to every AI-generated asset before it enters the
                approval workflow.
              </p>
              <a
                href="/resources-hub"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#00E5FF] hover:underline"
              >
                <span>Explore Brand Voice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area Grid Container */}
          <div className="lg:col-span-8 flex flex-col gap-px bg-[#0C1422]">
            {/* Top Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 2: CLAIMS & COMPLIANCE POLICY ENGINE (Top Left, 2 Cols) */}
              <a href="/governance" className="relative group sm:col-span-2 min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6 block">
                <Image
                  src="/images/marketing-ops/2.png"
                  alt="Claims & Compliance Policy Engine"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/70 to-transparent" />

                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    CLAIMS & COMPLIANCE POLICY ENGINE
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    Pricing, performance, and regulated claims checked before
                    approval.
                  </h3>
                </div>
              </a>

              {/* Card 3: REGIONAL RULE SCOPING (Top Right, 1 Col) */}
              <a href="/governance" className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6 block">
                <Image
                  src="/images/marketing-ops/3.png"
                  alt="Regional Rule Scoping"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/70 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    REGIONAL RULE SCOPING
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Rules per region, language, channel, and category.
                  </h3>
                </div>
              </a>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 4: RISK-BASED APPROVAL ROUTING */}
              <a href="/approval-workflows" className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6 block">
                <Image
                  src="/images/marketing-ops/4.png"
                  alt="Risk-Based Approval Routing"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/70 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    RISK-BASED APPROVAL ROUTING
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Route by brand risk, claim type, and channel.
                  </h3>
                </div>
              </a>

              {/* Card 5: BRAND EVIDENCE VAULT */}
              <a href="/auditability" className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6 block">
                <Image
                  src="/images/marketing-ops/6.png"
                  alt="Brand Evidence Vault"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/70 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    BRAND EVIDENCE VAULT
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Policy check history, approval decisions, final artifacts.
                  </h3>
                </div>
              </a>

              {/* Card 6: LEGAL HOLDS & REPORTING */}
              <a href="/auditability" className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6 block">
                <Image
                  src="/images/marketing-ops/5.png"
                  alt="Legal Holds & Reporting"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/70 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    LEGAL HOLDS & REPORTING
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Preserved evidence for legal proceedings and audits.
                  </h3>
                </div>
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}