"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Database,
  ShieldCheck,
  Building2,
  Globe,
  Trash2,
  FileText,
} from "lucide-react";

interface GlanceCard {
  id: string;
  category: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borcol: string;
}

const cardsData: GlanceCard[] = [
  {
    id: "processor",
    category: "WHO IS THE PROCESSOR",
    description:
      "ZoikoVertex generally acts as processor or service provider for customer personal data processed through the service. Customers are generally the controller or business for customer content and user data.",
    icon: Users,
    iconBg: "bg-[#20E7F20F]",
    iconColor: "text-[#20E7F2]",
    borcol: "border-[#20E7F22E]",
  },
  {
    id: "data-processed",
    category: "WHAT DATA IS PROCESSED",
    description:
      "Account data, user data, workflow content, prompts, outputs, approval records, audit logs, integration metadata, support data, and billing contact data depending on customer use and configuration.",
    icon: Database,
    iconBg: "bg-[#C9A84C0F]",
    iconColor: "text-[#C9A84C]",
    borcol: "border-[#C9A84C40]",
  },
  {
    id: "security",
    category: "SECURITY COMMITMENTS",
    description:
      "Encryption in transit and at rest, role-based access, tenant isolation, audit logging, secure development, incident response, and business continuity safeguards are documented in the security schedule.",
    icon: ShieldCheck,
    iconBg: "bg-[#22C55E1A]",
    iconColor: "text-[#22C55E]",
    borcol: "border-[#22C55E38]",
  },
  {
    id: "subprocessors",
    category: "SUBPROCESSORS",
    description:
      "Material subprocessors are listed, notification of changes is provided, customers may raise objections, and equivalent data protection terms bind each material subprocessor.",
    icon: Building2,
    iconBg: "bg-[#8B5CF61A]",
    iconColor: "text-[#8B5CF6]",
    borcol: "border-[#8B5CF638]",
  },
  {
    id: "transfers",
    category: "INTERNATIONAL TRANSFERS",
    description:
      "Cross-border transfers are supported through Standard Contractual Clauses, UK transfer documentation, and transfer impact assessment support where applicable.",
    icon: Globe,
    iconBg: "bg-[#F59E0B1A]",
    iconColor: "text-[#F59E0B]",
    borcol: "border-[#F59E0B38]",
  },
  {
    id: "deletion",
    category: "DELETION AND RETURN",
    description:
      "Customers have a defined window to export data at termination. Deletion applies subject to backup cycles, legal holds, retention obligations, security logs, and dispute exceptions.",
    icon: Trash2,
    iconBg: "bg-[#20E7F20F]",
    iconColor: "text-[#20E7F2]",
    borcol: "border-[#20E7F22E]",
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
      staggerChildren: 0.08,
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

export default function DpaAtAGlance() {
  return (
    <section className="w-full bg-[#F0F2F6] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-[#0F172A]">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 justify-center mb-3">
            <FileText className="w-3.5 h-3.5 text-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-[#20E7F2]">
              DPA AT A GLANCE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0F1929] mb-4">
            Plain English, first.
          </h2>
          <p className="text-xs sm:text-sm text-[#3A4558] font-normal mx-auto leading-relaxed">
            Six things enterprise buyers, legal counsel, and privacy teams
            should know about the ZoikoVertex DPA before reading the full
            document.
          </p>
        </div>

        {/* 3x2 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardsData.map((card) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex gap-4 justify-start"
              >
                {/* Top Row: Icon + Eyebrow Header */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.borcol} flex items-center justify-center shrink-0`}
                  >
                    <IconComponent className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="font-mono text-[10px] font-bold tracking-[1px] text-[#68758A] uppercase pt-2">
                    {card.category}
                  </div>
                  <p className="text-sm text-[#3A4558] max-w-58 leading-relaxed font-normal">
                    {card.description}
                  </p>
                </div>
                {/* Card Description */}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
