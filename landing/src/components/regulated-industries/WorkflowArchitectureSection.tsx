"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function WorkflowArchitectureSection() {
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

  const steps = [
    {
      number: "01",
      numberColor: "text-[#00E5FF]",
      title: "Campaign scope with regulatory profile",
      description:
        "Campaign inherits industry vertical, jurisdiction, product category, and regulatory framework — policy rules pre-loaded at brief creation.",
      evidence: null,
    },
    {
      number: "02",
      numberColor: "text-[#E2A03F]",
      title: "AI generation with compliance guardrails",
      description:
        "AI agents generate content within industry-specific guardrails. Prohibited language, restricted claims, and required disclosures enforced at generation.",
      evidence: null,
    },
    {
      number: "03",
      numberColor: "text-[#E2A03F]",
      title: "Policy engine runs pre-approval checks",
      description:
        "Compliance rules check the generated content against the regulatory profile. Triggers route to legal, compliance, or senior approval as required.",
      evidence:
        "Evidence: rule_id · severity · trigger_context · routing_decision",
    },
    {
      number: "04",
      numberColor: "text-[#25CA7B]",
      title: "Compliant content approved and published",
      description:
        "Approved content activates. Integration evidence sealed. Complete regulatory evidence package available for inquiry or audit.",
      evidence:
        "Evidence: campaign_evidence_id · regulatory_check_results · approvals · artifact",
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
        {/* Left Column - Image Container with relative aspect alignment */}
        <div className="relative w-full min-h-[320px] lg:min-h-0 lg:h-full overflow-hidden">
          <Image
            src="/images/regulated-industries/paper.png"
            alt="Newspaper texture background"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center grayscale contrast-125 opacity-70"
          />
          {/* Subtle blend edge for seamless integration */}
        </div>

        {/* Right Column - Compact Content Layout */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-12 max-w-xl mx-auto lg:mx-0">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#00E5FF]">
              REGULATED WORKFLOW ARCHITECTURE
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            Compliance built into every workflow stage — not checked at the end.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal mb-5"
          >
            ZoikoVertex positions regulatory compliance checks at the workflow
            layer — before content reaches human review, before channel
            activation, with complete audit evidence.
          </motion.p>

          {/* Compact Cards List */}
          <div className="flex flex-col gap-2.5 w-full">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#111923] border border-white/5 rounded-lg p-3.5 sm:p-4 transition-all duration-200 hover:border-white/10"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-mono text-sm font-bold ${step.numberColor} pt-0.5`}
                  >
                    {step.number}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight mb-1">
                      {step.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-400 leading-normal font-normal">
                      {step.description}
                    </p>
                    {step.evidence && (
                      <p className="mt-1.5 text-[10px] font-mono text-gray-500 tracking-tight">
                        {step.evidence}
                      </p>
                    )}
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
