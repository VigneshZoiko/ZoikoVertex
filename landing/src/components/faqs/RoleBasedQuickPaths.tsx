"use client";

import React from "react";
import { motion } from "framer-motion";

interface RoleCardProps {
  category: string;
  question: string;
  description: string;
}

const roleData: RoleCardProps[] = [
  {
    category: "EXECUTIVES",
    question:
      "How does ZoikoVertex improve control, ROI, and visibility across AI work?",
    description:
      "Executive-level reporting, spend visibility, and governed autonomy across every workflow.",
  },
  {
    category: "MARKETING & OPERATIONS",
    question:
      "How do teams plan, approve, publish, and measure AI-assisted campaigns?",
    description:
      "End-to-end workflow from draft to publish, with approvals at every gate.",
  },
  {
    category: "IT & SECURITY",
    question: "How is access controlled, logged, integrated, and monitored?",
    description:
      "Role-based permissions, SSO, audit logging, and integration security controls.",
  },
  {
    category: "LEGAL & COMPLIANCE",
    question:
      "How are approvals, evidence, audit trails, and responsible AI handled?",
    description:
      "Every decision is captured, attributable, and retrievable for review.",
  },
  {
    category: "PROCUREMENT",
    question: "How do we evaluate value, risk, implementation, and vendor fit?",
    description:
      "Structured evaluation materials built for procurement review cycles.",
  },
  {
    category: "ADMINS & SUPPORT",
    question:
      "How do we configure users, roles, workflows, and support routes?",
    description:
      "Admin documentation, configuration guides, and direct support access.",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
} as const;

export default function RoleBasedQuickPathsSection() {
  return (
    <section className="w-full bg-[#F9F8F3] min-h-screen py-16 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-[#111827] flex flex-col items-center justify-center">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={containerVariants}
      >
        {/* Header Section */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-4 h-[1px] bg-[#5B6B7C]"></span>
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#5B6B7C]">
              ROLE-BASED QUICK PATHS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight text-[#0F172A] leading-tight">
            Find the answer built for your role.
          </h2>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-[#F5F3EC] shadow-sm">
          {roleData.map((item, index) => (
            <a key={index} href="#" className="block group">
              <motion.div
                variants={itemVariants}
                className={`p-8 sm:p-10 h-full flex flex-col shadow-sm justify-between transition-colors duration-200 hover:bg-[#F3F1EA]/60
                `}
              >
                <div>
                  {/* Category Subtitle */}
                  <span className="block text-[11px] font-mono tracking-[0.15em] uppercase text-[#4F6272] mb-4 font-semibold">
                    {item.category}
                  </span>

                  {/* Question Heading */}
                  <h3 className="font-bold text-[#0F172A] leading-snug mb-4 group-hover:text-black">
                    {item.question}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-[14px] text-[#5B6472] leading-relaxed font-normal mt-2">
                  {item.description}
                </p>
              </motion.div>
            </a>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
