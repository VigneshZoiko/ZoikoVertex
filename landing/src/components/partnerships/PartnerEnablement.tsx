"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Laptop,
  LayoutGrid,
  Megaphone,
  Calendar,
  Map,
  Headphones,
} from "lucide-react";

interface EnablementCard {
  icon: React.ElementType;
  title: string;
  description: string;
}

const enablementItems: EnablementCard[] = [
  {
    icon: Award,
    title: "Certification",
    description:
      "Structured certification covering governed AI, approval workflows, evidence architecture, and ROI modeling — for implementation, technical, and solution-selling roles.",
  },
  {
    icon: BookOpen,
    title: "Implementation playbooks",
    description:
      "Detailed guides for workflow mapping, governance configuration, integration setup, pilot design, and enterprise rollout — for every deployment pattern.",
  },
  {
    icon: Laptop,
    title: "Partner demo environments",
    description:
      "Sandbox access to demonstrate governed workflows, approval flows, evidence capture, and command center dashboards to enterprise prospects.",
  },
  {
    icon: LayoutGrid,
    title: "Partner portal",
    description:
      "Deal registration, technical documentation, co-marketing assets, support escalation, and roadmap briefing access for all approved partners.",
  },
  {
    icon: Megaphone,
    title: "Co-marketing assets",
    description:
      "Approved joint marketing materials, case study templates, battle cards, and co-branded content — subject to brand usage review and written approval.",
  },
  {
    icon: Calendar,
    title: "Quarterly business reviews",
    description:
      "Structured QBRs covering pipeline health, customer adoption, roadmap alignment, and partner performance for every active partner.",
  },
  {
    icon: Map,
    title: "Roadmap briefings",
    description:
      "Early-access product briefings for select partners — enabling better implementation planning, customer advisory, and joint solution development.",
  },
  {
    icon: Headphones,
    title: "Dedicated support path",
    description:
      "Partner-specific support escalation for implementation, technical, and customer-affecting issues — separate from the standard support queue.",
  },
];

export default function PartnerEnablement() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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
    <section className="w-full bg-[#050B14] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 border-b border-[#1E293B] pb-10"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNER ENABLEMENT
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-6">
            What approved partners receive.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-3xl font-normal leading-relaxed">
            Partnership is not a logo exchange. Approved partners receive the
            infrastructure to deploy, demonstrate, and grow governed agentic
            execution for enterprise customers — and to build a sustainable
            practice around it.
          </p>
        </motion.div>

        {/* 8-Card Grid (4 cols x 2 rows on large screens) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {enablementItems.map((item, index) => {
            const IconComponent = item.icon;

            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#0A111E] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  {/* Icon Box */}
                  <div className="w-10 h-10 rounded-lg bg-[#083344]/60 border border-[#0891B2]/40 flex items-center justify-center text-[#00E5FF] mb-6 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Card Title */}
                  <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
                    {item.title}
                  </h3>

                  {/* Card Description */}
                  <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed font-normal">
                    {item.description}
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
