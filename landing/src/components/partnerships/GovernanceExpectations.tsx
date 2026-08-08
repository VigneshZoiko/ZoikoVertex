"use client";

import React from "react";
import { motion } from "framer-motion";

interface PolicyItem {
  number: string;
  title: string;
  description: string;
}

const policyItems: PolicyItem[] = [
  {
    number: "01",
    title: "Privacy and security obligations",
    description:
      "Partners must follow ZoikoVertex data processing, privacy, and security requirements — including DPA execution, access controls, and data retention compliance where applicable.",
  },
  {
    number: "02",
    title: "Responsible AI messaging",
    description:
      "Partners must represent ZoikoVertex as governed AI execution infrastructure — not autonomous unreviewed automation. Messaging must accurately reflect approval controls and human oversight.",
  },
  {
    number: "03",
    title: "Brand usage and co-marketing control",
    description:
      "Use of ZoikoVertex brand assets, logos, case studies, and co-marketing materials requires written approval before publication. Unapproved usage is a material breach of the partner agreement.",
  },
  {
    number: "04",
    title: "Customer data protection",
    description:
      "Partners handling customer personal data must meet equivalent protection standards, execute DPA terms, and complete security review before activation as an authorized partner.",
  },
  {
    number: "05",
    title: "Anti-corruption and sanctions screening",
    description:
      "Partner admission includes anti-bribery, anti-corruption, and sanctions screening for global program readiness. Partners in restricted jurisdictions undergo additional review.",
  },
  {
    number: "06",
    title: "Regional compliance variance",
    description:
      "Partner terms, data processing obligations, and compliance requirements may vary by country, regulated industry, customer contract, and applicable law — confirmed during legal review.",
  },
];

export default function GovernanceExpectations() {
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
    hidden: { opacity: 0, y: 15 },
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
    <section className="w-full bg-[#050B14] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
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
              GOVERNANCE & COMPLIANCE EXPECTATIONS
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Partners represent ZoikoVertex. <br className="hidden sm:inline" />
            The standard is non-negotiable.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            Every approved partner must adhere to governance, compliance,
            responsible AI, and brand standards as a binding condition of the
            partnership agreement.
          </p>
        </motion.div>

        {/* 2x3 Grid Container with Grid-style Dividers */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#0A111E] border border-[#1E293B] rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-[#1E293B]"
        >
          {policyItems.map((item, index) => {
            // Logic to calculate border styling for a clean 2-column grid layout
            const isRightColumn = index % 2 === 1;
            const isBottomRow = index >= policyItems.length - 2;

            return (
              <motion.div
                key={item.number}
                variants={itemVariants}
                className={`p-8 sm:p-10 flex flex-col justify-start hover:bg-[#0F192B]/50 transition-colors duration-300 ${
                  isRightColumn ? "md:border-l md:border-[#1E293B]" : ""
                } ${!isBottomRow ? "md:border-b md:border-[#1E293B]" : ""}`}
              >
                {/* Number Accent */}
                <span className="text-3xl font-mono font-bold text-[#1E293B] group-hover:text-[#2DD4BF] transition-colors mb-4 block">
                  {item.number}
                </span>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-3 leading-snug">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
