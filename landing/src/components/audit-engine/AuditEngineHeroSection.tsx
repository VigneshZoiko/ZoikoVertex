"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export default function AuditEngineHeroSection() {
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
    { value: "5-layer", label: "EVIDENCE ARCHITECTURE" },
    { value: "100%", label: "EVENT COVERAGE" },
    { value: "<30s", label: "EVIDENCE RETRIEVAL" },
    { value: "Zero", label: "BLIND SPOTS" },
  ];

  return (
    <section className="relative min-h-screen w-full bg-[#080C10] text-white overflow-hidden flex flex-col justify-between">
      {/* Background Image Layer with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/audit-engine/hero.png"
          alt="Audit engine evidence dashboard"
          fill
          className="w-full h-full object-cover object-center contrast-125 opacity-35 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C10] via-[#080C10]/85 to-transparent w-full lg:w-3/4 h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#20E7F2]/5 to-transparent" />
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#021B24]/80 border border-[#20E7F2]/30 text-[11px] tracking-wider uppercase font-mono text-[#20E7F2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
              <span>AUDIT ENGINE</span>
              <span className="text-gray-500">•</span>
              <span>EVIDENCE ARCHITECTURE</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-white"
          >
            Every AI action. Every approval. Every decision.{" "}
            <span className="text-[#20E7F2] block mt-1">
              Completely traceable.
            </span>
          </motion.h1>

          {/* Subtitle / Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-400 leading-relaxed mb-8 max-w-xl font-normal"
          >
            The ZoikoVertex Audit Engine is a five-layer evidence architecture
            built into every governed workflow — Audit Trail, Decision Ledger,
            Evidence Vault, Forensic Hub, and Identity Ledger. Not a log. Not a
            report. A forensic-grade record of everything.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="mb-12">
            <a
              href="/request-demo"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#20E7F2] text-[#05111A] text-sm font-semibold tracking-wide hover:bg-[#4AECF5] transition-all duration-200 shadow-[0_0_20px_rgba(32,231,242,0.3)] hover:shadow-[0_0_28px_rgba(32,231,242,0.5)]"
            >
              <Calendar className="w-4 h-4 text-[#05111A]" />
              <span>Book Integration Demo</span>
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
              <span className="text-2xl sm:text-3xl font-bold text-[#20E7F2] tracking-tight">
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
