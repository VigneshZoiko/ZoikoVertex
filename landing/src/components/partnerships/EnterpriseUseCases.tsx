"use client";

import React from "react";
import { motion } from "framer-motion";
import { Store, Scale, GitMerge, Globe, FileCheck, Cpu } from "lucide-react";

interface UseCaseItem {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const useCases: UseCaseItem[] = [
  {
    number: "01",
    icon: Store,
    title: "Retail campaign execution",
    description:
      "Governed AI-assisted promotions, seasonal campaigns, product launches, and store-level localization across brands, regions, and agencies.",
  },
  {
    number: "02",
    icon: Scale,
    title: "Regulated content approvals",
    description:
      "Claims review, legal sign-off, disclosure management, and audit evidence for financial services, healthcare, and regulated marketing communications.",
  },
  {
    number: "03",
    icon: GitMerge,
    title: "Omnichannel workflow orchestration",
    description:
      "Coordinated execution across social, paid media, email, commerce, DAM, and retail media — with governance at every stage and channel.",
  },
  {
    number: "04",
    icon: Globe,
    title: "Social governance at scale",
    description:
      "Brand-safe AI-assisted social content, approval routing, policy enforcement, and evidence capture for enterprise social operations teams.",
  },
  {
    number: "05",
    icon: FileCheck,
    title: "Compliance evidence management",
    description:
      "Audit Trail, Evidence Vault, and Decision Ledger implementations for legal, compliance, and procurement teams requiring defensible AI records.",
  },
  {
    number: "06",
    icon: Cpu,
    title: "Marketing operations automation",
    description:
      "End-to-end agentic workflows from brief to approval to publication — replacing fragmented manual marketing operations processes.",
  },
];

export default function EnterpriseUseCases() {
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
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#0C1422] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              ENTERPRISE USE CASES
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Six deployable customer opportunities for partners.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-xl mx-auto font-normal leading-relaxed">
            Every use case is a partner deployment opportunity — connecting your
            capability to a concrete enterprise customer problem ZoikoVertex is
            built to solve.
          </p>
        </motion.div>

        {/* 6-Card Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {useCases.map((useCase) => {
            const IconComponent = useCase.icon;

            return (
              <motion.div
                key={useCase.number}
                variants={itemVariants}
                className="bg-[#0C1422] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  {/* Top Section: Number & Icon */}
                  <div className="flex flex-col items-start gap-4 mb-6">
                    <span className="text-3xl font-mono font-bold text-[#1E293B] group-hover:text-[#2DD4BF]/40 transition-colors">
                      {useCase.number}
                    </span>

                    <div className="w-10 h-10 rounded-lg bg-[#083344]/60 border border-[#0891B2]/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-white mb-3 leading-snug">
                    {useCase.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                    {useCase.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
