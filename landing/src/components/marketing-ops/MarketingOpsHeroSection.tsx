"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export default function MarketingOpsHeroSection() {
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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const stats = [
    {
      value: "+34%",
      label: "EXECUTION VELOCITY",
    },
    {
      value: "-62%",
      label: "APPROVAL CYCLE TIME",
    },
    {
      value: "Zero",
      label: "UNTRACKED APPROVALS",
    },
    {
      value: "Full chain",
      label: "CAMPAIGN EVIDENCE",
    },
  ];

  return (
    <section className="relative min-h-screen w-full bg-[#080C10] text-white overflow-hidden flex flex-col justify-between">
      {/* Background Image Layer with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/marketing-ops/hero.png"
          alt="Modern Marketing Operations Workspace"
          className="w-full h-full object-cover object-center contrast-125 opacity-35 mix-blend-luminosity"
        />
        {/* Dark Vignette / Gradient overlays for crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C10] via-[#080C10]/85 to-transparent w-full lg:w-3/4 h-full" />
        {/* <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-transparent to-transparent" /> */}
      </div>

      {/* Main Content Container */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto px-6 lg:px-16 pt-20 md:pt-28 pb-12 w-full flex-1 flex flex-col justify-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-2xl">
          {/* Pill Badge */}
          <motion.div variants={itemVariants} className="inline-block mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#021B24]/80 border border-[#00D8F6]/30 text-[11px] tracking-wider uppercase font-mono text-[#00E5FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
              <span>MARKETING OPS</span>
              <span className="text-gray-500">•</span>
              <span>GOVERNED AI EXECUTION</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-white"
          >
            The governed AI execution platform for{" "}
            <span className="text-[#00E5FF] block mt-1">
              enterprise marketing operations.
            </span>
          </motion.h1>

          {/* Subtitle / Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-400 leading-relaxed mb-8 max-w-xl font-normal"
          >
            ZoikoVertex replaces fragmented marketing operations coordination
            with governed AI workflows, structured approval routing, tool
            integrations, performance measurement, and evidence capture — giving
            MarOps teams the infrastructure to operate at enterprise AI speed
            without losing accountability.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="mb-12">
            <a
              href="#"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#00E5FF] text-[#05111A] text-sm font-semibold tracking-wide hover:bg-[#33ECFF] transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]"
            >
              <Calendar className="w-4 h-4 text-[#05111A]" />
              <span>Request Marketing Ops Demo</span>
            </a>
          </motion.div>
        </div>

        {/* Footer Statistics Row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-6 border-t border-white/10 max-w-4xl"
        >
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col justify-start">
              <span className="text-2xl sm:text-3xl font-bold text-[#00E5FF] tracking-tight">
                {stat.value}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-gray-400 mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}