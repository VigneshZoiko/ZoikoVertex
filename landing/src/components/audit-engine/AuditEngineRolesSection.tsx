"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function AuditEngineRolesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
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
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const roles = [
 {
      role: "LEGAL & COMPLIANCE",
      headline: "Defensible records ready for proceedings.",
      description:
        "Sealed evidence packages with decision rationale, retention classes, and legal-hold controls that stand up under scrutiny.",
      image: "/images/audit-engine/LEGAL-COMPLIANCE.png",
    },
   
    {
      role: "CISO & SECURITY",
      headline: "Every access, every change, every action — logged.",
      description:
        "Identity-bound records for every privileged action, with append-only integrity and cross-layer linkage for incident review.",
      image: "/images/audit-engine/CISO-SECURITY.png",
    },
    
   
    {
      role: "CEO & BOARD",
      headline: "AI accountability the board can see and sign off on.",
      description:
        "Evidence coverage, decision volumes, override rates, and policy trigger history reportable as standing governance KPIs.",
      image: "/images/audit-engine/CEO-BOARD.png",
    },

     {
      role: "CMO & MARKETING OPS",
      headline: "Campaign evidence without extra operational overhead.",
      description:
        "Evidence is created as the work happens — no separate logging step, no manual capture, no end-of-quarter scramble.",
      image: "/images/audit-engine/CMO-MARKETING-OPS.png",
    },

  {
      role: "PROCUREMENT & FINANCE",
      headline: "Governance evidence that clears vendor review faster.",
      description:
        "Audit readiness demonstrated during security and procurement assessment — shortening the review cycles that delay enterprise deals.",
      image: "/images/audit-engine/PROCUREMENT-FINANCE.png",
    },

   {
      role: "CIO & ENGINEERING",
      headline: "An evidence layer that fits the existing estate.",
      description:
        "Append-only event capture, identity binding, and export APIs that integrate with SIEM, data warehouse, and identity systems already in place.",
      image: "/images/audit-engine/CIO-ENGINEERING.png",
    },
    ];

  return (
    <section className="relative w-full bg-[#080C10] text-white py-16 overflow-hidden">
      <motion.div
        className="w-full flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="max-w-6xl w-full mx-auto px-6 sm:px-10 lg:px-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3.5"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
              WHO THE AUDIT ENGINE SERVES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-3xl"
          >
            Six roles. Six reasons the evidence layer changes everything.
          </motion.h2>
        </div>

        {/* Full-width Seamless Bento Grid */}
        <motion.div
          variants={itemVariants}
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-px bg-white/10 overflow-hidden border-y border-white/10"
        >
          {roles.map((item, index) => (
            <div
              key={index}
              className="relative group min-h-[480px] sm:min-h-[520px] bg-[#0B1117] flex flex-col justify-end p-5 sm:p-6 overflow-hidden"
            >
              {/* Background Image */}
              <Image
                src={item.image}
                alt={item.role}
                fill
                className="absolute inset-0 w-full h-full object-cover object-center contrast-125 transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark Gradient Overlay for Typography Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30 z-[1]" />

              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-end h-full">
                <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-[#20E7F2] mb-2 block leading-none font-semibold">
                  {item.role}
                </span>

                <h3 className="text-xs sm:text-[13px] font-bold leading-snug mb-2 text-white">
                  {item.headline}
                </h3>

                <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
