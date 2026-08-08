"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  badgeText: string;
  badgeStyle: string; // Tailored color styles for badges
}

const features: FeatureItem[] = [
  {
    title: "Audit preparation time saved",
    description:
      "Time to compile evidence for internal audit, client review, or procurement request — eliminated by automatic evidence capture.",
    badgeText: "High value",
    badgeStyle: "bg-[#00D284]/10 text-[#00D284] border-[#00D284]/30",
  },
  {
    title: "Evidence retrieval time",
    description:
      "Time to locate prompt, output, approval, policy, decision, and publication proof — replaced by instant Evidence Vault search.",
    badgeText: "High value",
    badgeStyle: "bg-[#00D284]/10 text-[#00D284] border-[#00D284]/30",
  },
  {
    title: "Policy exception reduction",
    description:
      "Decrease in repeated brand, compliance, or restricted-claim issues — prevented by policy gates before execution.",
    badgeText: "Measurable",
    badgeStyle: "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30",
  },
  {
    title: "Approval leakage prevention",
    description:
      "High-risk items prevented from bypassing review — eliminated by mandatory approval chains with identity binding.",
    badgeText: "Measurable",
    badgeStyle: "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30",
  },
  {
    title: "Decision rationale coverage",
    description:
      "Percentage of material approvals linked to Decision Ledger entries — improves defensibility and governance maturity score.",
    badgeText: "Tracked",
    badgeStyle: "bg-[#20E7F2]/10 text-[#20E7F2] border-[#20E7F2]/30",
  },
  {
    title: "Forensic escalation readiness",
    description:
      "Ability to reconstruct disputed or suspicious events — reduces incident response time and legal exposure during disputes.",
    badgeText: "Tracked",
    badgeStyle: "bg-[#20E7F2]/10 text-[#20E7F2] border-[#20E7F2]/30",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoGovernanceRoiSection() {
  return (
    <section className="relative w-full bg-[#0C1422] py-16 md:py-24 px-6 font-sans text-white border-t border-white/5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* Header Area */}
        <div className="space-y-3">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="h-px w-6 bg-[#20E7F2]" />
            <span className="text-xs font-mono tracking-widest text-[#20E7F2] uppercase">
              GOVERNANCE ROI
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight"
          >
            The ROI layer your competitors can&apos;t model.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base leading-relaxed text-[#ffffff80]"
          >
            Productivity ROI is easy to estimate. Governance ROI — audit
            preparation, evidence retrieval, approval leakage, and decision
            coverage — is ZoikoVertex&apos;s differentiating commercial proof
            point.
          </motion.p>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Feature List with Status Badges (7 Cols) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 space-y-6"
          >
            <div className="rounded-2xl bg-[#0f1723]/90 border border-white/10 p-2 sm:p-4 divide-y divide-white/10">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors rounded-xl"
                >
                  <div className="space-y-1.5 max-w-[82%]">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#ffffff70]">
                      {feature.description}
                    </p>
                  </div>

                  {/* Badge Tag */}
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${feature.badgeStyle}`}
                  >
                    {feature.badgeText}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#20E7F2] text-[#0b121e] font-semibold text-sm hover:bg-[#1cd4de] transition-colors shadow-lg shadow-[#20E7F2]/20">
                <ShieldCheck className="w-4 h-4" />
                Run Governance ROI Audit
              </button>
            </div>
          </motion.div>

          {/* Right Column: Visual Showcase Card with Overlay Stats (5 Cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden min-h-[480px] lg:min-h-[580px] flex flex-col justify-end p-6">
              {/* Background Image / Overlay */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/images/roi-engine/laptop.png" // Add your image asset URL here (e.g., /images/governance-vault.jpg)
                  alt="Governance Vault & Evidence Interface"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b121e] via-[#0b121e]/40 to-transparent" />
              </div>

            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
