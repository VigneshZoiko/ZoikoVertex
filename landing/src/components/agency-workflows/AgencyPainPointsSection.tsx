"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AgencyPainPointsSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const painPoints = [
    {
      icon: "/images/agency-workflows/Revision=cycles.png",
      title: "Revision cycles that compound",
      description:
        "AI-generated content that bypasses brand checks reaches client review with avoidable misalignments — creating revision cycles that erode margin and damage relationships.",
    },
    {
      icon: "/images/agency-workflows/Approval-chaos.png",
      title: "Approval chaos across email and Slack",
      description:
        "Client approvals tracked across email threads, shared drives, and Slack messages — no single record of who approved what version when, creating disputes and compliance gaps.",
    },
    {
      icon: "/images/agency-workflows/Brand-rule.png",
      title: "Brand rule drift at scale",
      description:
        "Style guides communicated in PDFs do not travel with AI-generated content. Brand drift accumulates across clients, campaigns, and team members without enforcement at the workflow layer.",
    },
    {
      icon: "/images/agency-workflows/AI-attribution.png",
      title: "AI attribution and IP exposure",
      description:
        "AI-assisted deliverables without provenance records create IP attribution risk — both for the agency and the client — as AI-generated and human-authored content becomes increasingly difficult to distinguish.",
    },
  ];

  return (
    <section className="relative w-full bg-[#080C10] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Section Header */}
        <div className="mb-12">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#20E7F2]">
              AGENCY PAIN POINTS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.15] text-white max-w-3xl"
          >
            Why agency AI workflows break down without governance.
          </motion.h2>
        </div>

        {/* Outer Grid Card with Seamless Border Divide */}
        <motion.div
          variants={itemVariants}
          className="w-full bg-[#111D2E] border border-white/10 rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-white/10"
        >
          {painPoints.map((item, index) => (
            <div
              key={index}
              className="p-8 flex flex-col justify-start transition-colors duration-200 hover:bg-white/[0.02]"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center mb-6 shrink-0">
                <img
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                  className="max-w-[18px] max-h-[18px]"
                />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold tracking-tight leading-snug mb-3 text-white">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
