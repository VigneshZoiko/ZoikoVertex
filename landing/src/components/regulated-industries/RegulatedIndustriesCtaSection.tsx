"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, Shield, FileText } from "lucide-react";

export default function RegulatedIndustriesCtaSection() {
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

  return (
    <section className="relative w-full bg-[#080C10] text-white py-24 px-6 sm:px-10 lg:px-16 overflow-hidden flex items-center justify-center min-h-[520px]">
      {/* Background Image Container with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/regulated-industries/cta.png"
          alt="Office background"
          className="w-full h-full object-cover object-center grayscale contrast-125 opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080C10] via-[#080C10]/80 to-[#080C10]" />
      </div>

      {/* Background Subtle Watermark Text */}


      {/* Main Content */}
      <motion.div
        className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Badge Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2 mb-5"
        >
          <span className="w-3 h-[2px] bg-[#00E5FF]" />
          <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
            REGULATED INDUSTRIES · ZOIKOVERTEX
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.1] mb-6 text-white max-w-3xl"
        >
          AI marketing at enterprise speed.{" "}
          <span className="text-[#00E5FF]">
            Regulatory <br /> evidence at every stage.
          </span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal mb-10 max-w-xl"
        >
          ZoikoVertex makes governed AI marketing execution possible in
          regulated industries — with configurable compliance rules, approval
          workflows, and forensic-grade evidence by design.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {/* Primary CTA Button */}
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-semibold text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-[#00E5FF]/20"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Demo</span>
          </a>

          {/* Secondary Button - Governance Platform */}
          <a
            href="#"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-xs sm:text-sm transition-all duration-200 backdrop-blur-sm"
          >
            <Shield className="w-4 h-4 text-gray-400" />
            <span>Governance Platform</span>
          </a>

          {/* Secondary Button - Audit Engine */}
          <a
            href="#"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-xs sm:text-sm transition-all duration-200 backdrop-blur-sm"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            <span>Audit Engine</span>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
