"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface PillarCard {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageSrc: string;
}

interface StepItem {
  number: string;
  title: string;
  description: string;
}

const pillarCards: PillarCard[] = [
  {
    id: "governance",
    badge: "GOVERNANCE",
    title: "Governance architecture",
    description:
      "Responsible AI, Compliance & Governance, Auditability, and DPA documentation for legal, governance committee, and security review.",
    imageSrc: "/images/competeter-benchmark/paper.png",
  },
  {
    id: "evidence",
    badge: "EVIDENCE",
    title: "Evidence posture",
    description:
      "Audit Trail, Evidence Vault, Decision Ledger, Forensic Hub, and Identity Ledger — five linked records per governed decision, exportable for legal review.",
    imageSrc: "/images/competeter-benchmark/pen.png",
  },
  {
    id: "security",
    badge: "SECURITY",
    title: "Security posture",
    description:
      "Access controls, tenant isolation, export controls, evidence access logging, retention policy, MFA-aware permissions, and SOC 2 readiness language.",
    imageSrc: "/images/competeter-benchmark/code.png",
  },
  {
    id: "implementation",
    badge: "IMPLEMENTATION",
    title: "Implementation confidence",
    description:
      "Structured 6-phase onboarding: discovery, workspace setup, workflow mapping, governance config, pilot, and enterprise rollout.",
    imageSrc: "/images/competeter-benchmark/building.png",
  },
];

const implementationSteps: StepItem[] = [
  {
    number: "01",
    title: "Discovery",
    description:
      "Map current tools, governance gaps, workflow patterns, and enterprise requirements.",
  },
  {
    number: "02",
    title: "Workspace setup",
    description:
      "Configure roles, permissions, brands, workspaces, and integration connections.",
  },
  {
    number: "03",
    title: "Workflow mapping",
    description:
      "Design approval paths, policy rules, SLAs, and escalation logic for each workflow type.",
  },
  {
    number: "04",
    title: "Governance config",
    description:
      "Activate evidence capture, audit trails, risk tiers, and responsible AI controls.",
  },
  {
    number: "05",
    title: "Pilot",
    description:
      "Run a controlled workflow with sandbox evidence, approval tests, and ROI baseline.",
  },
  {
    number: "06",
    title: "Rollout",
    description:
      "Expand across teams, regions, and executive dashboards with success metrics in place.",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function ProcurementAndTrust() {
  return (
    <section className="w-full bg-[#080C14] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#00D2B4]">
              PROCUREMENT & TRUST
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-3xl">
            Built for enterprise procurement review.
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
            Every serious evaluation asks the same questions about governance,
            evidence, security, and implementation. Here is where to find the
            answers.
          </p>
        </div>

        {/* Top 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {pillarCards.map((card) => (
            <motion.div
              key={card.id}
              variants={itemVariants}
              className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-[#0C121E] flex flex-col justify-between"
            >
              {/* Image Box Container */}
              <div className="relative w-full h-44 overflow-hidden">
                <Image
                  src={card.imageSrc}
                  alt={card.title}
                  fill
                  className="object-cover object-center"
                />
                {/* Gradient blend to match bottom background */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C121E] via-[#0C121E]/30 to-transparent" />
              </div>

              {/* Card Body Content */}
              <div className="p-5 pt-1 flex-1 flex flex-col">
                {/* Pill Badge */}
                <div className="mb-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-full border border-[#00D2B4]/30 bg-[#00D2B4]/10 font-mono text-[9px] font-bold tracking-wider text-[#00D2B4] uppercase">
                    {card.badge}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-sm font-bold text-white tracking-tight leading-snug mb-2">
                  {card.title}
                </h3>

                {/* Card Description */}
                <p className="text-[11px] text-[#8EA0B8] leading-relaxed font-normal mt-auto">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom 6-Step Implementation Strip */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-2xl border border-slate-800/80 bg-[#0C121E]/60 backdrop-blur-md overflow-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80"
        >
          {implementationSteps.map((step) => (
            <div key={step.number} className="p-5 flex flex-col justify-start">
              {/* Step Number */}
              <div className="font-mono text-2xl font-bold text-[#1E293B] mb-2 leading-none">
                {step.number}
              </div>

              {/* Step Title */}
              <h4 className="text-xs font-bold text-white tracking-tight mb-2">
                {step.title}
              </h4>

              {/* Step Description */}
              <p className="text-[10px] text-[#64748B] leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
