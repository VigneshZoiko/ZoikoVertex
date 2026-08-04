"use client";

import React from "react";
import { motion } from "framer-motion";
import { Network, Check, Plug, BarChart3 } from "lucide-react";

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
    icon: Network,
    title: "AI workflow orchestration",
    description:
      "Brief to approval to publication — one governed workflow across AI agents, human reviewers, and channel integrations.",
    colors: {
      border: "border-[#00E5FF]/30",
      background: "bg-[#0B1E28]",
      icon: "text-[#00E5FF]",
    },
  },
  {
    id: 2,
    icon: Check,
    title: "SLA-controlled approval routing",
    description:
      "Approval workflows with configured SLAs, escalation paths, and owner accountability — surfacing bottlenecks before they become delays.",
    colors: {
      border: "border-[#25CA7B]/30",
      background: "bg-[#142621]",
      icon: "text-[#25CA7B]",
    },
  },
  {
    id: 3,
    icon: Plug,
    title: "Enterprise stack integrations",
    description:
      "CRM, DAM, CDP, social, paid media, email, analytics, and collaboration tools — connected through the governed orchestration layer.",
    colors: {
      border: "border-[#EAB308]/30",
      background: "bg-[#252319]",
      icon: "text-[#EAB308]",
    },
  },
  {
    id: 4,
    icon: BarChart3,
    title: "MarOps performance measurement",
    description:
      "Campaign throughput, cycle-time, rework reduction, SLA adherence, and governance coverage — measured and reportable through the ROI Engine.",
    colors: {
      border: "border-[#A855F7]/30",
      background: "bg-[#201B2E]",
      icon: "text-[#A855F7]",
    },
  },
];

export default function MarketingOpsFeaturesSection() {
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
