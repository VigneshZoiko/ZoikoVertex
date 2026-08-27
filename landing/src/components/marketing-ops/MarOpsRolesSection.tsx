"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function MarOpsRolesSection() {
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
      role: "VP MARKETING OPERATIONS",
      headline: "One operating model for the entire marketing function.",
      description:
        "Governed workflows, unified execution visibility, and measurable performance — replacing the coordination overhead of fragmented marketing operations.",
      image: "/images/competeter-benchmark/coa.png",
    },
    {
      role: "CAMPAIGN MANAGER",
      headline: "AI-assisted campaign execution without process breakdown.",
      description:
        "Structured workflows, AI content generation, approval visibility, and performance tracking — from brief intake to published campaign.",
      image: "/images/competeter-benchmark/cmo.png",
    },
    {
      role: "MARTECH LEAD",
      headline: "Governed orchestration across the existing technology estate.",
      description:
        "ZoikoVertex integrates with the tools you already operate — adding the governance and evidence layer that connects them.",
      image: "/images/competeter-benchmark/co.png",
    },
    {
      role: "CMO",
      headline: "AI marketing velocity without operational breakdown.",
      description:
        "Scale AI-assisted campaign execution without the accountability gaps, brand drift, and compliance exposure that uncontrolled automation creates.",
      image: "/images/competeter-benchmark/cto.png",
    },
    {
      role: "AGENCY MANAGER",
      headline: "Governed brief-to-delivery for external agency relationships.",
      description:
        "Structured intake, approval flows, and evidence handoffs for agencies — reducing revision cycles and accountability gaps in external partner work.",
      image: "/images/competeter-benchmark/legal.png",
    },
    {
      role: "PERFORMANCE ANALYST",
      headline: "Campaign evidence tied to measurable performance outcomes.",
      description:
        "ROI Engine connects campaign execution records to performance data — enabling attribution analysis that links governance decisions to business outcomes.",
      image: "/images/competeter-benchmark/man.png",
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
        {/* Header Section bounded by max-w-6xl */}
        <div className="max-w-6xl w-full mx-auto px-6 sm:px-10 lg:px-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
              MARKETING OPS ROLES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-2xl"
          >
            The six marketing operations roles that ZoikoVertex is built for.
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
                <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-[#00E5FF] mb-2 block leading-none font-semibold">
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
