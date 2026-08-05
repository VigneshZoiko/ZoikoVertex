"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AgencyCampaignLifecycleSection() {
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
      title: "Brief intake",
      description:
        "Structured brief with client brand rules, compliance requirements, channel specs, and approval chain pre-loaded.",
      evidence: "Evidence: brief_id · client_rules_version · owner · timestamp",
    },
    {
      number: "02",
      numberColor: "text-gray-400",
      borderColor: "border-white/10",
      title: "AI-assisted content generation",
      description:
        "AI generates copy, variants, and localizations. Brand voice and compliance rules checked before routing to agency review.",
      evidence: "Evidence: gen_event · prompt · output · brand_check_result",
    },
    {
      number: "03",
      numberColor: "text-[#E2A03F]",
      borderColor: "border-[#E2A03F]/20",
      title: "Agency internal review",
      description:
        "Account and creative teams review AI output. Policy trigger history visible. Edits tracked as revision events.",
      evidence: "Evidence: review_event · reviewer_id · changes · version",
    },
    {
      number: "04",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Client approval",
      description:
        "Client reviews directly in the workflow. Approval captured in Decision Ledger with rationale and identity binding.",
      evidence:
        "Evidence: client_approval · decision_id · approver · timestamp",
    },
    {
      number: "05",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Publication to channel",
      description:
        "Approved content activates. Integration confirmation and final artifact sealed in Evidence Vault.",
      evidence:
        "Evidence: publish_event · channel_ref · final_artifact · confirmation",
    },
    {
      number: "06",
      numberColor: "text-[#25CA7B]",
      borderColor: "border-[#25CA7B]/20",
      title: "Delivery evidence package",
      description:
        "Complete evidence bundle: brief, generation events, reviews, client approval, final artifact — ready for client reporting.",
      evidence:
        "Evidence: campaign_evidence_id · export_ready · all_stages_linked",
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
            src="/images/marketing-ops/left.png"
            alt="Agency team working through a client campaign"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#080C10]/60" />
        </div>

        {/* Right Column - Lifecycle Content */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-14 max-w-2xl mx-auto lg:mx-0">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-2.5"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#20E7F2]">
              AGENCY CAMPAIGN LIFECYCLE
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl max-w-85 lg:text-[34px] font-bold tracking-tight leading-[1.15] mb-3 text-white"
          >
            From client brief to approved delivery — governed at every stage.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm max-w-90 text-gray-400 leading-relaxed font-normal mb-5"
          >
            Every agency campaign in ZoikoVertex follows a six-stage governed
            lifecycle. Evidence is created at each stage — not assembled after
            the fact.
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
