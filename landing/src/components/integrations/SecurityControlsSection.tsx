"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Shield,
  Building2,
  Lock,
  Database,
  ClipboardList,
  FileSearch,
  FileText,
  Globe,
} from "lucide-react";

interface ControlCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const CONTROLS: ControlCard[] = [
  {
    id: "1",
    icon: Shield,
    title: "Least-privilege scopes",
    description:
      "Role-scoped and connector-scoped access — never broad access by default.",
  },
  {
    id: "2",
    icon: Building2,
    title: "Tenant isolation",
    description: "Integrations are scoped to tenant and workspace boundaries.",
  },
  {
    id: "3",
    icon: Lock,
    title: "Credential protection",
    description: "Encrypted credential storage with rotation support.",
  },
  {
    id: "4",
    icon: Database,
    title: "Data processing controls",
    description: "DPA, privacy, retention, and subprocessor transparency.",
  },
  {
    id: "5",
    icon: ClipboardList,
    title: "Auditability",
    description: "Every integration action can create an Audit Trail event.",
  },
  {
    id: "6",
    icon: FileSearch,
    title: "Evidence capture",
    description: "High-risk or governed actions generate evidence records.",
  },
  {
    id: "7",
    icon: FileText,
    title: "Access logs",
    description: "Admin and export actions are logged for security review.",
  },
  {
    id: "8",
    icon: Globe,
    title: "Region-aware controls",
    description:
      "Region-aware handling where available or enterprise-configurable.",
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

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1.0] as const,
    },
  },
};

export default function SecurityControlsSection() {
  return (
    <section className="relative w-full bg-[#05080E] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-20 lg:py-28 flex flex-col items-center justify-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.header
          className="text-center space-y-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center space-x-2 text-[#D9A755] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#D9A755]/80 inline-block -translate-y-[1px]" />
            <span>SECURITY, PERMISSIONS & DATA CONTROLS</span>
          </div>

          <h2 className="text-[28px] leading-[1.2] md:text-[42px] font-bold text-white tracking-[-0.02em]">
            Each integration is scoped, monitored, and governed.
          </h2>

          <p className="text-[14px] leading-[1.6] max-w-xl text-[#8E9AAB] font-normal mx-auto">
            Sensitive actions can be logged, retained, redacted, reviewed, and
            exported through controlled evidence workflows.
          </p>
        </motion.header>

        {/* 4-Column Grid for Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {CONTROLS.map((item) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={item.id}
                variants={cardVariants}
                whileHover={{
                  y: -4,
                  borderColor: "rgba(217, 167, 85, 0.3)",
                  boxShadow: "0 10px 30px -10px rgba(217, 167, 85, 0.08)",
                  transition: { duration: 0.25 },
                }}
                className="group bg-[#0B121E] rounded-2xl border border-[#162032] p-6 flex flex-col justify-start transition-all duration-300 relative"
              >
                {/* Icon */}
                <div className="mb-5 text-[#D9A755]">
                  <IconComponent className="w-5 h-5 stroke-[1.75]" />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-white tracking-tight group-hover:text-[#D9A755] transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-[12px] leading-[1.6] text-[#6E7C90] font-normal">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer Note */}
        <motion.div
          className="text-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-[11px] font-mono text-[#425066] max-w-100 mx-auto leading-relaxed">
            Compliance references (e.g., SOC 2, GDPR, data residency) describe
            control readiness and are confirmed by legal and product status
            during evaluation — not asserted as certifications on this page.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
