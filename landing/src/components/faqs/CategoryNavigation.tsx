"use client";

import React from "react";
import { motion } from "framer-motion";

interface NavigationItem {
  label: string;
  href: string;
}

const navItems: NavigationItem[] = [
  { label: "Platform Overview", href: "#" },
  { label: "Agentic Architecture", href: "#" },
  { label: "Workflows & Approvals", href: "#" },
  { label: "Governance & Auditability", href: "#" },
  { label: "Security, Privacy & Data", href: "#" },
  { label: "Integrations", href: "#" },
  { label: "ROI", href: "#" },
];

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
} as const;

export default function CategoryNavigation() {
  return (
    <section className="w-full bg-[#F5F4EE] border-b border-[#E6E4DC] py-8 px-4 sm:px-8 overflow-hidden font-mono flex items-center justify-center">
      <motion.div
        className="w-full max-w-7xl overflow-x-auto no-scrollbar scroll-smooth"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <div className="flex items-center justify-center min-w-max gap-3 px-4">
          {navItems.map((item, index) => (
            <motion.a
              key={index}
              href={item.href}
              variants={itemVariants}
              className="px-5 py-2.5 rounded-[20px] border border-[#DFDBCB] bg-[#F5F4EE] text-[#4A5568] hover:text-[#0F172A] hover:border-[#B8B5A6] hover:bg-[#EFECE3] transition-all duration-200 text-[13px] tracking-wide whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-[#B8B5A6]"
            >
              {item.label}
            </motion.a>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
