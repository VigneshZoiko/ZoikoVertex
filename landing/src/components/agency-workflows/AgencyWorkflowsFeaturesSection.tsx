"use client";

import React from "react";
import { motion } from "framer-motion";

type Feature = {
  id: number;
  icon: string;
  title: string;
  description: string;
  colors: {
    border: string;
    background: string;
  };
};

const features: Feature[] = [
  {
    id: 1,
    icon: "/images/agency-workflows/AI-assisted-brief-to-delivery.png",
    title: "AI-assisted brief-to-delivery",
    description:
      "Structured brief intake, AI-assisted content generation, variant creation, and QA — all within a governed, client-specific workflow.",
    colors: {
      border: "border-[#20E7F2]/30",
      background: "bg-[#0B1E28]",
    },
  },
  {
    id: 2,
    icon: "/images/agency-workflows/Client-approval-workflows.png",
    title: "Client approval workflows",
    description:
      "Client reviewers participate directly in structured approval flows — replacing email chains and untracked sign-offs with governed Decision Ledger records.",
    colors: {
      border: "border-[#25CA7B]/30",
      background: "bg-[#142621]",
    },
  },
  {
    id: 3,
    icon: "/images/agency-workflows/Brand-compliance-per-client.png",
    title: "Brand compliance per client",
    description:
      "Each client's brand voice, compliance rules, and approval chain configured separately — enforced at the content generation layer, not the review layer.",
    colors: {
      border: "border-[#E2A03F]/30",
      background: "bg-[#252319]",
    },
  },
  {
    id: 4,
    icon: "/images/agency-workflows/IP-attribution-evidence.png",
    title: "IP and attribution evidence",
    description:
      "Every AI-assisted deliverable carries an Evidence Vault record — AI generation event, human modifications, client approval, and final artifact — for clear IP provenance.",
    colors: {
      border: "border-[#A855F7]/30",
      background: "bg-[#201B2E]",
    },
  },
];

export default function AgencyWorkflowsFeaturesSection() {
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

  return (
    <section className="relative w-full bg-[#111D2E] px-10 text-white border-t border-b border-white/10">
      <motion.div
        className="relative z-10 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-h-[200px]"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            variants={itemVariants}
            className={`flex flex-col justify-start px-6 py-8 border-b sm:border-b-0 border-white/10 ${
              index !== features.length - 1 ? "lg:border-r" : ""
            }`}
          >
            {/* Icon Container */}
            <div
              className={`w-10 h-10 rounded-lg ${feature.colors.background} ${feature.colors.border} border flex items-center justify-center mb-4 flex-shrink-0`}
            >
              <img
                src={feature.icon}
                alt=""
                aria-hidden="true"
                className="max-w-[18px] max-h-[18px]"
              />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold tracking-tight leading-snug mb-2 text-white">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-gray-400 leading-relaxed font-normal">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
