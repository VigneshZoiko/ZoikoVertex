"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scale, ShieldCheck, FileSignature, Lock } from "lucide-react";

type Feature = {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  colors: {
    border: string;
    background: string;
    icon: string;
  };
};

const features: Feature[] = [
  {
    id: 1,
    icon: Scale,
    title: "Configurable compliance policy rules",
    description:
      "Per-industry, per-jurisdiction, per-category policy rules checked against every AI-generated asset before approval routing.",
    colors: {
      border: "border-[#EB4C5F]/30",
      background: "bg-[#251D24]",
      icon: "text-[#EB4C5F]",
    },
  },
  {
    id: 2,
    icon: ShieldCheck,
    title: "NIST AI RMF alignment",
    description:
      "Risk identification, management, oversight, and documentation across the AI lifecycle — aligned with the NIST Artificial Intelligence Risk Management Framework.",
    colors: {
      border: "border-[#25CA7B]/30",
      background: "bg-[#182322]",
      icon: "text-[#25CA7B]",
    },
  },
  {
    id: 3,
    icon: FileSignature,
    title: "Regulatory evidence packages",
    description:
      "Exportable evidence bundles per campaign — policy check outcomes, approval decisions, and final artifacts — formatted for regulatory inquiry and legal review.",
    colors: {
      border: "border-[#00D8F6]/30",
      background: "bg-[#162128]",
      icon: "text-[#00D8F6]",
    },
  },
  {
    id: 4,
    icon: Lock,
    title: "Privacy and data processing controls",
    description:
      "DPA-aligned data processing, tenant isolation, regional routing, and privacy-by-design workflow configurations for GDPR, CCPA, and equivalent frameworks.",
    colors: {
      border: "border-[#A855F7]/30",
      background: "bg-[#201D2E]",
      icon: "text-[#A855F7]",
    },
  },
];

export default function FeaturesSection() {
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
    <section className="relative w-full bg-[#111D2E] text-white">
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
              <feature.icon
                className={`w-5 h-5 ${feature.colors.icon}`}
                strokeWidth={1.75}
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
