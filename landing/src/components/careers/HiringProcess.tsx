"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Video, Code2, Users, Building2, Check } from "lucide-react";

interface StepItem {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  timeline?: string;
}

const steps: StepItem[] = [
  {
    number: "01",
    icon: FileText,
    title: "Application review",
    description:
      "We review every application. If there's a fit, we respond within the timeframe specified in the role. No ghosting for progressed candidates.",
    timeline: "Response within 5-7 business days",
  },
  {
    number: "02",
    icon: Video,
    title: "Introductory screen",
    description:
      "30-minute call with a recruiter or hiring manager to align on role, team, expectations, and basic qualification.",
    timeline: "30 minutes",
  },
  {
    number: "03",
    icon: Code2,
    title: "Assessment",
    description:
      "Technical, portfolio, or case assessment where relevant to the role. We design assessments to reflect real work — not trick questions.",
    timeline: "3-5 days to complete",
  },
  {
    number: "04",
    icon: Users,
    title: "Team interview",
    description:
      "Structured interviews with the team you'd work with. Focused on collaboration, problem-solving, and domain judgment.",
    timeline: "2-3 hours across 1-2 sessions",
  },
  {
    number: "05",
    icon: Building2,
    title: "Leadership interview",
    description:
      "Conversation with a senior leader covering operating principles, governance culture, and long-term fit. For senior roles, may include a governance-specific scenario.",
    timeline: "45-60 minutes",
  },
  {
    number: "06",
    icon: Check,
    title: "Offer and onboarding",
    description:
      "Clear offer, timeline, and onboarding plan. First 30 days are structured to give you context, access, and early ownership without overloading you.",
    timeline: "Decision within 2-3 days of final interview",
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

export default function HiringProcess() {
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
              HIRING PROCESS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-3xl leading-tight">
            What to expect when you apply.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed font-normal">
            We move efficiently and communicate clearly. Process may vary by
            role and jurisdiction.
          </p>
        </div>

        {/* 6-Step Split Grid Strip Container */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-2xl border border-slate-800/80 bg-[#0B101D]/70 backdrop-blur-md overflow-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 mb-6"
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-5 flex flex-col justify-between hover:bg-[#0E1526]/50 transition-colors duration-150"
              >
                <div>
                  {/* Step Number */}
                  <div className="font-mono text-2xl font-bold text-[#162238] mb-3 leading-none select-none">
                    {step.number}
                  </div>

                  {/* Icon Box */}
                  <div className="w-7 h-7 rounded-lg bg-[#0F222F] border border-[#20E7F2]/30 flex items-center justify-center text-[#20E7F2] mb-4 shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Step Title */}
                  <h3 className="text-xs font-bold text-white tracking-tight mb-2">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-[13px] text-[#FFFFFF85] leading-relaxed font-normal mb-4">
                    {step.description}
                  </p>
                </div>

                {/* Step Timeline / Duration */}
                {step.timeline && (
                  <div className="font-mono text-[12px] text-[#FFFFFF42]">
                    {step.timeline}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Footer Note */}
        <p className="font-medium text-[13px] text-[#FFFFFF42] tracking-[1px] text-center leading-relaxed">
          Process steps and timelines may vary by role, location, and
          jurisdiction. We are committed to keeping you informed at every stage.
        </p>
      </motion.div>
    </section>
  );
}
