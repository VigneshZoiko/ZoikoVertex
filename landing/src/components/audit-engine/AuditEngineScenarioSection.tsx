"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AuditEngineScenarioSection() {
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
      numberColor: "text-[#20E7F2]",
      borderColor: "border-[#20E7F2]/20",
      title: "Campaign brief created",
      description:
        "Audit Trail: creation event logged. Identity Ledger: creator identity, role, and session bound to brief ID.",
      evidence:
        "Evidence: event_id · actor_id · timestamp · brief_version_hash",
    },
    {
      number: "02",
      numberColor: "text-gray-400",
      borderColor: "border-white/10",
      title: "AI agent generates content",
      description:
        "Audit Trail: agent task events. Evidence Vault: prompt, model metadata, output, risk markers sealed per task.",
      evidence: "Evidence: agent_id · prompt_hash · output_ref · risk_score",
    },
    {
      number: "03",
      numberColor: "text-[#E2A03F]",
      borderColor: "border-[#E2A03F]/20",
      title: "Policy trigger fires",
      description:
        "Audit Trail: policy check event. Decision Ledger: rule matched, severity, recommended action. Evidence Vault: trigger capture.",
      evidence:
        "Evidence: policy_rule_id · severity · trigger_context · reviewer_assigned",
    },
    {
      number: "04",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Approval decision recorded",
      description:
        "Decision Ledger: decision rationale, approver identity, timestamp. Evidence Vault: decision sealed with full context.",
      evidence:
        "Evidence: decision_id · approver_id · rationale · approval_context_ref",
    },
    {
      number: "05",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Content published to channel",
      description:
        "Audit Trail: integration event. Evidence Vault: publish confirmation, final artifact, channel reference sealed.",
      evidence:
        "Evidence: integration_ref · publish_confirmation · final_artifact_id",
    },
    {
      number: "06",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Full evidence package complete",
      description:
        "Evidence Vault: exportable bundle assembled. All five layers cross-linked under a single campaign evidence ID.",
      evidence:
        "Evidence: campaign_evidence_id · export_ready · all layers linked",
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
          <img
            src="/images/audit-engine/AUDIT-ENGINE.png"
            alt="Governed campaign under audit"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#080C10]/60" />
        </div>

        {/* Right Column - Scenario Content */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-14 max-w-2xl mx-auto lg:mx-0">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#20E7F2]">
              AUDIT ENGINE · LIVE SCENARIO
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl max-w-85 lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            What the Audit Engine captures across one campaign.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm max-w-90 text-gray-400 leading-relaxed font-normal mb-5"
          >
            Every stage of a governed campaign creates evidence across all five
            layers simultaneously — automatically, without additional
            configuration.
          </motion.p>

          {/* Compact Cards List */}
          <div className="flex flex-col gap-2.5 w-full">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`bg-[#111D2E] border ${step.borderColor} rounded-lg p-3.5 sm:p-4 transition-all duration-200 hover:border-white/20`}
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
                    <p className="mt-1.5 text-[10px] font-mono text-gray-500 tracking-tight">
                      {step.evidence}
                    </p>
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
