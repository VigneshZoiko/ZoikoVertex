"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function MarOpsExecutionModelSection() {
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
      title: "Structured brief intake",
      description:
        "Campaign brief inherits brand rules, compliance profile, approval chain, channel specs, and evidence requirements — from one source of truth.",
      evidence: null,
    },
    {
      number: "02",
      numberColor: "text-gray-400",
      title: "AI-assisted planning and content creation",
      description:
        "AI agents handle planning, content generation, localisation, and QA — operating within governance guardrails, handing off to human review at configured thresholds.",
      evidence: null,
    },
    {
      number: "03",
      numberColor: "text-[#E2A03F]",
      title: "Approval routing with SLA visibility",
      description:
        "Content routed to the right reviewer by brand, risk, channel, and spend. SLA timers visible. Escalation paths triggered automatically when thresholds approach.",
      evidence:
        "Evidence: routing_decision · reviewer · SLA_status · escalation_log",
    },
    {
      number: "04",
      numberColor: "text-[#25CA7B]",
      title: "Approved and published",
      description:
        "Approved content activates across connected channels. Integration confirmation sealed in Evidence Vault.",
      evidence:
        "Evidence: approval · publish_confirmation · final_artifact · channel_refs",
    },
    {
      number: "05",
      numberColor: "text-[#25CA7B]",
      title: "ROI Engine measures outcomes",
      description:
        "Campaign throughput, cycle-time, rework reduction, and performance metrics captured and reportable for executive review.",
      evidence:
        "Evidence: roi_record · performance_summary · governance_coverage",
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
          <Image
            src="/images/marketing-ops/left.png"
            alt="Marketing operations team meeting"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Right Column - MarOps Execution Content */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-14 max-w-2xl mx-auto lg:mx-0">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#00E5FF]">
              MAROPS EXECUTION MODEL
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl max-w-85 lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            From brief intake to campaign evidence — one governed execution
            model.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm max-w-90 text-gray-400 leading-relaxed font-normal mb-5"
          >
            ZoikoVertex gives marketing operations teams a repeatable, governed
            execution model — visible from brief to evidence in the Command
            Center, measurable in the ROI Engine.
          </motion.p>

          {/* Compact Cards List */}
          <div className="flex flex-col gap-2.5 w-full">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#111D2E] border border-white/5 rounded-lg p-3.5 sm:p-4 transition-all duration-200 hover:border-white/10"
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
                    <p className="text-[11px] max-w-xl sm:text-xs text-gray-400 leading-normal font-normal">
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
