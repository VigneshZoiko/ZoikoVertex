"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Plug, BarChart3, Award } from "lucide-react";

export default function PartnerFeaturesGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
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

  const features = [
    {
      icon: ShieldCheck,
      iconColor: "text-[#10B981]",
      iconBg: "bg-[#064E3B]/40 border-[#059669]/30",
      title: "Governed AI execution",
      description:
        "Agentic workflows with approval gates, policy controls, audit trails, and evidence capture — not uncontrolled automation.",
    },
    {
      icon: Plug,
      iconColor: "text-[#06B6D4]",
      iconBg: "bg-[#083344]/40 border-[#0891B2]/30",
      title: "Enterprise integration surface",
      description:
        "Connect ZoikoVertex into existing commerce, CRM, DAM, PIM, social, analytics, and identity systems at enterprise scale.",
    },
    {
      icon: BarChart3,
      iconColor: "text-[#F59E0B]",
      iconBg: "bg-[#451A03]/40 border-[#D97706]/30",
      title: "Measurable ROI and auditability",
      description:
        "ROI modeling, governance audit, productivity measurement, and board-ready executive reporting for every deployment.",
    },
    {
      icon: Award,
      iconColor: "text-[#A855F7]",
      iconBg: "bg-[#3B0764]/40 border-[#9333EA]/30",
      title: "Partner enablement infrastructure",
      description:
        "Certification, playbooks, sandbox demos, partner portal, co-marketing assets, QBRs, and roadmap briefings for approved partners.",
    },
  ];

  return (
    <section className="w-full bg-[#111D2E] text-white font-sans antialiased border-y border-[#1E293B]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#1E293B]"
      >
        {features.map((feature, index) => {
          const IconComponent = feature.icon;

          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="px-8 py-5 flex flex-col items-start justify-start transition-colors duration-300"
            >
              {/* Icon Container */}
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-6 ${feature.iconBg}`}
              >
                <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
