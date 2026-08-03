"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users2, ShieldCheck } from "lucide-react";

export default function PartnerHeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
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
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="relative w-full min-h-screen bg-[#050B14] text-white overflow-hidden flex flex-col justify-center py-20 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/partnerships/bg.png"
          alt="Partner Ecosystem Background"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Dark overlay gradient to ensure high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050B14]/95 via-[#050B14]/80 to-[#050B14]/40" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline, Copy, CTAs */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7 flex flex-col items-start"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#2DD4BF]/30 bg-[#07242B]/60 backdrop-blur-md mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#20E7F21F] border border-[#20E7F22E]" />
            <span className="text-[#20E7F2] text-xs font-mono tracking-widest uppercase font-medium">
              ZOIKOVERTEX PARTNER ECOSYSTEM
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-[50px] font-bold tracking-tight text-white mb-6"
          >
            Partner with <br/> ZoikoVertex to deploy{" "} <br/>
            <span className="text-[#00E5FF]">governed agentic execution.</span>
          </motion.h1>

          {/* Subtitle / Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-[#FFFFFFCC] text-sm max-w-xl font-normal leading-relaxed mb-10"
          >
            Join the ecosystem helping enterprise teams automate marketing,
            social operations, approvals, integrations, and workflow execution —
            with AI governance, auditability, and measurable ROI built in at
            every stage.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 mb-10 w-full sm:w-auto"
          >
            <a
              href="#"
              className="w-full sm:w-auto px-7 py-3.5 bg-[#20E7F2] hover:bg-[#00D0E6] text-[#050B14] font-semibold text-sm rounded-full transition-all duration-200 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center"
            >
              Become a Partner
            </a>

            <a
              href="#"
              className="w-full sm:w-auto px-6 py-3.5 border border-[#334155] hover:border-[#475569] hover:bg-[#1E293B] text-white text-sm font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Users2 className="w-4 h-4 text-[#94A3B8]" />
              <span>Talk to Alliances</span>
            </a>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-2.5 text-[#64748B] text-xs font-mono leading-relaxed max-w-lg"
          >
            <ShieldCheck className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
            <span>
              Selective partner program. Enterprise-grade review, enablement,
              and governance standards apply.
            </span>
          </motion.div>
        </motion.div>

        {/* Right Column: Interactive Ecosystem Graphic Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <Image
              src="/images/partnerships/ecosystem.png"
              alt="ZoikoVertex Ecosystem Diagram"
              fill
              className="object-contain p-4"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
