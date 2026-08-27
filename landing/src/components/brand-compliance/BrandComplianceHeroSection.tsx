"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export default function BrandComplianceHeroSection() {
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

  const metrics = [
    {
      title: "Policy-first",
      subtitle: "BEFORE APPROVAL",
    },
    {
      title: "Per region",
      subtitle: "RULE SCOPING",
    },
    {
      title: "Full chain",
      subtitle: "EVIDENCE PER ASSET",
    },
    {
      title: "Zero",
      subtitle: "UNREVIEWED PUBLISHES",
    },
  ];

  return (
    <section className="relative w-full min-h-[640px] lg:min-h-[720px] flex items-center bg-[#080C10] text-white overflow-hidden py-20 px-6 sm:px-10 lg:px-16">
      {/* Background Image with Dark Vignette Overlay */}
      <Image
        src="/images/brand-compliance/hero.png"
        alt="Team reviewing brand & compliance assets in conference room"
        fill
        className="absolute inset-0 w-full h-full object-cover object-center brightness-75 contrast-125 opacity-40"
      />
      {/* <div className="absolute inset-0 bg-[#080C10]/80 z-[1]" /> */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#080C10] via-[#080C10]/85 to-transparent z-[1]" />

      {/* Main Container Bounded by max-w-6xl */}
      <div className="relative z-10 max-w-6xl w-full mx-auto">
        <motion.div
          className="max-w-3xl flex flex-col justify-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Top Pill Badge Tag */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20E7F20F] border border-[#20E7F2] w-fit mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
              BRAND & COMPLIANCE • GOVERNED EXECUTION
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[54px] font-bold tracking-tight leading-[1.08] mb-5 text-white max-w-xl"
          >
            Brand standards and compliance rules enforced at the{" "}
            <span className="text-[#00E5FF]">AI workflow layer.</span>
          </motion.h1>

          {/* Subparagraph Description */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal max-w-xl mb-8"
          >
            ZoikoVertex checks every AI-generated marketing asset against brand
            voice, permitted claims, offer rules, disclosure requirements, and
            jurisdiction-specific advertising standards — before approval,
            before publication, with complete evidence.
          </motion.p>

          {/* Primary Call To Action Button */}
          <motion.div variants={itemVariants} className="mb-14">
            <a
              href="#request-demo"
              className="inline-flex items-center gap-2 bg-[#00E5FF] text-[#080C10] text-xs font-bold px-6 py-3.5 rounded-full hover:bg-[#00E5FF]/90 transition-all duration-200 shadow-lg shadow-[#00E5FF]/20"
            >
              <Calendar className="w-4 h-4 fill-[#080C10]" />
              <span>Request Brand & Compliance Demo</span>
            </a>
          </motion.div>

          {/* Bottom 4-Column Stat Summary Bar */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/10 max-w-2xl"
          >
            {metrics.map((metric, index) => (
              <div key={index} className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold text-[#00E5FF] tracking-tight leading-tight">
                  {metric.title}
                </span>
                <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-gray-500 mt-1 block">
                  {metric.subtitle}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
