"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  TrendingUp,
  Rocket,
  GitFork,
  Database,
  Scale,
  FileText,
} from "lucide-react";

interface PersonaCard {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const personas: PersonaCard[] = [
  {
    title: "For CFOs",
    description:
      "Payback period, annualized savings, cost avoidance, and assumption transparency.",
    icon: TrendingUp,
    iconBg: "bg-[#C9A84C]/15 border-[#C9A84C]/30",
    iconColor: "text-[#C9A84C]",
  },
  {
    title: "For CMOs",
    description:
      "Cycle-time reduction, content velocity, approval efficiency, and brand control ROI.",
    icon: Rocket,
    iconBg: "bg-[#20E7F2]/15 border-[#20E7F2]/30",
    iconColor: "text-[#20E7F2]",
  },
  {
    title: "For COOs",
    description:
      "SLA performance, bottleneck removal, handoff automation, and operating visibility.",
    icon: GitFork,
    iconBg: "bg-[#C9A84C]/15 border-[#C9A84C]/30",
    iconColor: "text-[#C9A84C]",
  },
  {
    title: "For CIOs",
    description:
      "Input governance, API readiness, security boundaries, and auditability of the model.",
    icon: Database,
    iconBg: "bg-[#20E7F2]/15 border-[#20E7F2]/30",
    iconColor: "text-[#20E7F2]",
  },
  {
    title: "For Legal",
    description:
      "Evidence-backed metrics, policy exception reduction, and audit preparation savings.",
    icon: Scale,
    iconBg: "bg-[#00D284]/15 border-[#00D284]/30",
    iconColor: "text-[#00D284]",
  },
  {
    title: "For Procurement",
    description:
      "Business case export, implementation assumptions, payback, and renewal evidence.",
    icon: FileText,
    iconBg: "bg-[#C9A84C]/15 border-[#C9A84C]/30",
    iconColor: "text-[#C9A84C]",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function ZoikoAudiencePersonaGrid() {
  return (
    <section className="w-full bg-[#0b121e] border-y border-white/10 font-sans">
      <div className="max-w-[1500px] mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-white/10"
        >
          {personas.map((persona, index) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-6 flex flex-col justify-start space-y-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon Container with subtle border */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border ${persona.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${persona.iconColor}`} />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {persona.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#ffffff99]">
                    {persona.description}
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
