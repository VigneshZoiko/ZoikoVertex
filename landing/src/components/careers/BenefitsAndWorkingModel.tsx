"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, Sliders, Wrench, Heart, Award } from "lucide-react";

interface BenefitCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  footerNote?: string;
}

const benefitCards: BenefitCard[] = [
  {
    id: "mission-driven",
    icon: Globe,
    title: "Mission-driven work",
    description:
      "Work on infrastructure that makes AI execution accountable. Enterprise governance, evidence systems, and responsible automation — problems that matter at scale.",
  },
  {
    id: "growth-mentorship",
    icon: TrendingUp,
    title: "Growth and mentorship",
    description:
      "Clear paths to progression based on impact and ownership. Access to senior builders, peer review culture, and a documented operating standard that grows with you.",
    footerNote: "Specific programs vary by team and role level.",
  },
  {
    id: "flexible-collaboration",
    icon: Sliders,
    title: "Flexible collaboration",
    description:
      "Remote-first where the role and team structure permits. Async-capable culture with clear documentation standards and structured synchronous time for high-stakes decisions.",
    footerNote: "Remote eligibility varies by role and jurisdiction.",
  },
  {
    id: "tools-learning",
    icon: Wrench,
    title: "Tools and learning",
    description:
      "Access to the tools you need to do precise work. Learning budget for courses, conferences, certifications, and research directly relevant to your role and ZoikoVertex's product.",
    footerNote: "Confirmed in offer documentation.",
  },
  {
    id: "inclusive-standards",
    icon: Heart,
    title: "Inclusive working standards",
    description:
      "A working environment where performance is evaluated on impact and behavior — not hours visible or volume of output. We hire for precision and trust the people we hire.",
  },
  {
    id: "performance-progression",
    icon: Award,
    title: "Performance and progression",
    description:
      "Regular performance conversations anchored to operating principles and impact. Compensation reviewed against role contribution and market — not negotiation skill.",
    footerNote: "Compensation structure confirmed per offer.",
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

export default function BenefitsAndWorkingModel() {
  return (
    <section className="w-full bg-[#06090F] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
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
            <span className="w-4 h-[1.5px] bg-[#20E7F2]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#20E7F2]">
              BENEFITS & WORKING MODEL
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-3xl leading-tight">
            Meaningful work with practical support.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed font-normal">
            Specifics vary by location and role. We will confirm all benefits in
            the offer stage.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefitCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0C1422] p-6 flex flex-col justify-between hover:bg-[#0E1526]/80 transition-colors duration-150"
              >
                <div>
                  {/* Icon Badge */}
                  <div className="w-9 h-9 rounded-[10px] bg-[#C9A84C1F] border border-[#C9A84C40] flex items-center justify-center text-[#20E7F2] mb-5 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Card Title */}
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug mb-3">
                    {card.title}
                  </h3>

                  {/* Card Description */}
                  <p className="text-sm text-[#FFFFFF85] leading-relaxed font-normal mb-6">
                    {card.description}
                  </p>
                </div>

                {/* Optional Footer Note */}
                {card.footerNote && (
                  <p className="font-mono text-[13px] text-[#FFFFFF42] leading-relaxed">
                    {card.footerNote}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
