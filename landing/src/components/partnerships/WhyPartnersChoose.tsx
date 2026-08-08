"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface FeatureCardProps {
  badge: string;
  badgeColor?: "teal" | "purple" | "blue" | "amber" | "rose";
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

interface StatCardProps {
  stat: string;
  label: string;
  description: string;
  statColor?: string;
}

const topGridData: FeatureCardProps[] = [
  {
    badge: "ARCHITECTURE",
    badgeColor: "teal",
    title: "Governed agentic architecture",
    description:
      "AI agents operating within policy boundaries, approval gates, and autonomy limits — built into the platform, not bolted on after deployment.",
    imageSrc: "/images/partnerships/11.png",
    imageAlt: "Governed Agentic Architecture Dashboard",
  },
  {
    badge: "APPROVAL LAYER",
    badgeColor: "purple",
    title: "Role-based approval workflows",
    description:
      "Multi-step approval, escalation paths, SLA controls, and evidence linkage — removing bottlenecks while preserving full accountability.",
    imageSrc: "/images/partnerships/22.png",
    imageAlt: "Role-based Approval Workflows",
  },
  {
    badge: "EVIDENCE",
    badgeColor: "teal",
    title: "Five-layer evidence architecture",
    description:
      "Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger — every governed action traceable, defensible, and audit-ready.",
    imageSrc: "/images/partnerships/33.png",
    imageAlt: "Five-layer Evidence Architecture",
  },
  {
    badge: "COMMAND",
    badgeColor: "blue",
    title: "Executive Command Center",
    description:
      "Leadership visibility into agent activity, workflow health, approval queues, risk signals, and ROI — without technical drill-down.",
    imageSrc: "/images/partnerships/44.png",
    imageAlt: "Executive Command Center City Skyline",
  },
  {
    badge: "ROI",
    badgeColor: "amber",
    title: "ROI Engine with execution proof",
    description:
      "Campaign throughput, cycle-time, rework reduction, risk savings, and governance maturity — all measurable and board-reportable.",
    imageSrc: "/images/partnerships/55.png",
    imageAlt: "ROI Engine Mobile Interface",
  },
  {
    badge: "RESPONSIBLE AI",
    badgeColor: "rose",
    title: "Responsible AI posture",
    description:
      "NIST AIRMF-aligned governance, policy enforcement, oversight controls, and evidence preservation — enterprise-ready and procurement-safe.",
    imageSrc: "/images/partnerships/66.png",
    imageAlt: "Responsible AI Posture Leader",
  },
];

const bottomGridData: StatCardProps[] = [
  {
    stat: "6",
    label: "PARTNER PATHWAYS",
    description:
      "Impl, technology, integration, agency, referral/co-sell, and strategic alliance — each with distinct commercial terms and qualification criteria.",
    statColor: "text-[#2DD4BF]",
  },
  {
    stat: "5-layer",
    label: "EVIDENCE ARCHITECTURE",
    description:
      "Every governed action creates linked evidence across Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger.",
    statColor: "text-[#2DD4BF]",
  },
  {
    stat: "Selective",
    label: "PARTNER ADMISSION",
    description:
      "Participation subject to qualification, legal, security, and commercial review — preserving ecosystem quality and enterprise credibility.",
    statColor: "text-[#00E5FF]",
  },
];

export default function WhyPartnersChoose() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  // Helper function for dynamic badge pill colors
  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case "purple":
        return "bg-[#1E1B4B] text-[#A78BFA] border-[#4C1D95]/40";
      case "blue":
        return "bg-[#0C2A4A] text-[#60A5FA] border-[#1E3A8A]/40";
      case "amber":
        return "bg-[#2E210D] text-[#FBBF24] border-[#78350F]/40";
      case "rose":
        return "bg-[#3B1219] text-[#FB7185] border-[#881337]/40";
      case "teal":
      default:
        return "bg-[#083344] text-[#00E5FF] border-[#0891B2]/40";
    }
  };

  return (
    <section className="w-full bg-[#080E18] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-20 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Subtitle Accent Line & Label */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-5 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.22em] font-medium uppercase font-mono">
              WHY PARTNERS CHOOSE ZOIKOVERTEX
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Governed agentic execution <br className="hidden sm:inline" />
            is a new category. Deploy it first.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Six differentiation points that make ZoikoVertex the platform
            partners build on — and enterprise customers want deployed.
          </p>
        </motion.div>

        {/* Outer Cards Animation Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Top Grid: 6 Feature Cards (3x2 on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topGridData.map((card, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-[#0A1220] border border-[#1E293B] rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-[#334155] transition-colors duration-300"
              >
                <div>
                  {/* Image Container with Gradient Fade */}
                  <div className="relative w-full h-[210px] overflow-hidden">
                    <Image
                      src={card.imageSrc}
                      alt={card.imageAlt}
                      fill
                      className="object-cover object-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1220] via-[#0A1220]/40 to-transparent" />
                  </div>

                  {/* Text Content */}
                  <div className="p-6 sm:p-7 pt-2">
                    <span
                      className={`inline-block px-2.5 py-1 rounded border text-[10px] font-mono tracking-wider font-semibold uppercase mb-3 ${getBadgeStyle(
                        card.badgeColor,
                      )}`}
                    >
                      {card.badge}
                    </span>

                    <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
                      {card.title}
                    </h3>

                    <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed font-normal">
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Grid: Seamless Connected Stat Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 rounded-2xl overflow-hidden border border-[#1E293B] bg-[#0A1220]"
          >
            {bottomGridData.map((item, idx) => {
              const isLast = idx === bottomGridData.length - 1;

              return (
                <div
                  key={idx}
                  className={`p-8 sm:p-10 flex flex-col justify-between group ${
                    !isLast
                      ? "md:border-r border-b md:border-b-0 border-[#1E293B]"
                      : ""
                  }`}
                >
                  <div>
                    {/* Big Stat Value */}
                    <div
                      className={`text-4xl sm:text-5xl font-semibold tracking-tight mb-3 ${
                        item.statColor || "text-white"
                      }`}
                    >
                      {item.stat}
                    </div>

                    {/* Sub Label */}
                    <div className="text-xs font-mono tracking-widest text-[#64748B] font-semibold uppercase mb-3">
                      {item.label}
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
