"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  ShieldCheck,
  GraduationCap,
  Rocket,
} from "lucide-react";

interface ProcessStep {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  footerTag: string;
}

const steps: ProcessStep[] = [
  {
    number: "01",
    icon: FileText,
    title: "Apply",
    description:
      "Submit the partner application with company profile, partner type, market focus, capability description, and commercial intent.",
    footerTag: "~15 minutes to submit",
  },
  {
    number: "02",
    icon: Search,
    title: "Qualification",
    description:
      "Alliances team reviews against enterprise fit, delivery capability, security posture, and market relevance. Qualified applicants move to a call.",
    footerTag: "Response within 5 business days",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Legal & security",
    description:
      "Privacy, security, responsible AI, brand, and commercial terms reviewed and agreed before activation. Non-negotiable stage for all partner types.",
    footerTag: "2-4 weeks for full review",
  },
  {
    number: "04",
    icon: GraduationCap,
    title: "Enablement",
    description:
      "Approved partners complete certification, access the partner portal, receive implementation playbooks, and finish a guided onboarding with the alliances team.",
    footerTag: "Guided partner onboarding",
  },
  {
    number: "05",
    icon: Rocket,
    title: "Launch & co-sell",
    description:
      "First customer engagement, co-sell pipeline, or integration deployment. QBR cadence and co-marketing approval process established at activation.",
    footerTag: "QBR set at launch",
  },
];

export default function PartnerApplicationProcess() {
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
          className=" mb-16 text-start max-w-xl"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center justify-start gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              APPLICATION PROCESS
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Five steps. Selective. <br className="hidden sm:inline" />
            Governed. Transparent.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg mx-auto font-normal leading-relaxed">
            Every application goes through qualification, legal review, and
            security review. We respond to all applicants — no ghosting. Timing
            depends on partner type, complexity, and region.
          </p>
        </motion.div>

        {/* 5-Column Grid Container with Border Dividers */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#0A111E] border border-[#1E293B] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-[#1E293B]"
        >
          {steps.map((step, index) => {
            const IconComponent = step.icon;

            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="p-6 sm:p-8 flex flex-col justify-between hover:bg-[#0F192B]/50 transition-colors duration-300 group"
              >
                <div>
                  {/* Step Number */}
                  <span className="text-3xl font-mono font-bold text-[#1E293B] group-hover:text-[#2DD4BF]/40 transition-colors mb-4 block">
                    {step.number}
                  </span>

                  {/* Icon Box */}
                  <div className="w-10 h-10 rounded-lg bg-[#083344]/60 border border-[#0891B2]/40 flex items-center justify-center text-[#00E5FF] mb-6 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#FFFFFF85] text-sm sm:text-sm leading-relaxed font-normal mb-8">
                    {step.description}
                  </p>
                </div>

                {/* Footer Tag */}
                <div className="pt-4 border-t border-[#1E293B]/60 mt-auto">
                  <span className="text-[#64748B] text-[11px] font-mono tracking-wide block">
                    {step.footerTag}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
