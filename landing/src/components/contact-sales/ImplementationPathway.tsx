"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ImplementationPathway() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  const phases = [
    {
      phase: "PHASE 01",
      title: "Insight\nMode",
      description:
        "Recommendations only, no autonomous execution. See what ZoikoVertex would do with your data.",
      timeline: "Day 1–7",
      highlight: "Insights in 24h",
    },
    {
      phase: "PHASE 02",
      title: "Assisted\nMode",
      description:
        "Human approval required before every action. The system proposes, your team decides.",
      timeline: "Week 2–4",
      highlight: "Signal in 72h",
    },
    {
      phase: "PHASE 03",
      title: "Autonomous\nMode",
      description:
        "Full governed execution within your policy thresholds, with override always available.",
      timeline: "Month 2+",
      highlight: "ROI in 30 days",
    },
  ];

  return (
    <section className="w-full bg-[#050B14] text-white py-20 px-6 sm:px-12 md:px-16 lg:px-24 flex flex-col justify-center font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#4FCFC6]" />
            <span className="text-[#4FCFC6] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              AFTER THE CALL — IMPLEMENTATION PATHWAY
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4 max-w-3xl leading-[1.15]">
            Sales is the start of a phased rollout, not a one-time pitch.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
            The same three-phase model your deployment team will use, so what
            you hear in discovery matches what you&apos;ll run.
          </p>
        </motion.div>

        {/* Outer Cards Grid Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 border border-[#1E293B] bg-[#070D18]/80 divide-y md:divide-y-0 md:divide-x divide-[#1E293B]"
        >
          {phases.map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="p-8 sm:p-10 flex flex-col justify-between hover:bg-[#0A1324]/50 transition-colors duration-300"
            >
              {/* Top Content */}
              <div>
                {/* Phase Number Label */}
                <span className="text-[#DDBE5C] text-xs font-mono tracking-[0.15em] font-medium block mb-4">
                  {item.phase}
                </span>

                {/* Card Title */}
                <h3 className="text-2xl font-semibold text-white mb-4 whitespace-pre-line leading-tight">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-[#94A3B8] text-sm leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>

              {/* Bottom Footer Section */}
              <div className="mt-4 pt-6 border-t border-[#1E293B]/80 flex items-center justify-between font-mono text-xs">
                <span className="text-[#4FCFC6]">{item.timeline}</span>
                <span className="text-[#4FCFC6]">{item.highlight}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
