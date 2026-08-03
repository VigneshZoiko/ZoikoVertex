"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Database, Ban, Check } from "lucide-react";

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

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface SecurityCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const cards: SecurityCard[] = [
  {
    id: "what-we-collect",
    icon: FileText,
    title: "What we collect",
    description:
      "Company and role details, workflow estimates, cost assumptions, and governance answers.",
  },
  {
    id: "what-we-store",
    icon: Database,
    title: "What we store",
    description:
      "Report inputs and consent records — retained per CRM and privacy policy, deletable on request.",
  },
  {
    id: "what-we-minimize",
    icon: Ban,
    title: "What we minimize",
    description:
      "Free-text sensitive descriptions. Prompts steer you away from secrets, PII, and confidential facts.",
  },
  {
    id: "your-controls",
    icon: Check,
    title: "Your controls",
    description:
      "Consent-aware analytics, deletion and anonymization requests, and privacy-safe tracking.",
  },
];

export default function SecurityPrivacyDataRetentionSection() {
  return (
    <section className="relative min-h-[520px] w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Header Content */}
        <div className="mb-14 flex flex-col items-center">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              SECURITY, PRIVACY &amp; DATA RETENTION
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            We collect only what the estimate needs.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-lg">
            Calculator inputs are separated from retained business evidence.
            Sensitive descriptions are minimized by design.
          </p>
        </div>

        {/* 4 Cards Grid with bg-[#131C2B] */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={cardVariants}
                className="group relative flex flex-col justify-start p-7 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-slate-700 hover:bg-[#162235] transition-all duration-300 cursor-pointer backdrop-blur-sm min-h-[200px]"
              >
                {/* Icon Container */}
                <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="w-4 h-4 text-cyan-400 stroke-[2]" />
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-100 mb-2.5 tracking-tight group-hover:text-white transition-colors">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
