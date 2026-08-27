"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function MarOpsPlatformModulesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              MAROPS PLATFORM MODULES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white"
          >
            The governed marketing operations platform — from brief to evidence.
          </motion.h2>
        </div>

        {/* Bento Grid Container with #0C1422 Background and Outer Border Radius */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {/* Card 1: AI WORKFLOW ORCHESTRATION (Tall Left Card) */}
          <div className="relative group lg:col-span-4 min-h-[520px] bg-[#0C1422] flex flex-col justify-end p-6 sm:p-8">
            <Image
              src="/images/marketing-ops/1.png"
              alt="AI Workflow Orchestration"
              fill
              className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/80 to-transparent" />

            <div className="relative z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#C5A059] block mb-3">
                AI WORKFLOW ORCHESTRATION
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-tight mb-3 text-white">
                End-to-end governed campaign workflows — from brief to channel
                activation.
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                Configure campaign workflows that connect AI content generation,
                human review, brand compliance checks, approval routing,
                integration publishing, and performance measurement in a single
                governed sequence — eliminating the coordination overhead of
                manual orchestration.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A059] hover:underline"
              >
                <span>Explore Workflow Orchestration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area Grid Container */}
          <div className="lg:col-span-8 flex flex-col gap-px bg-[#0C1422]">
            {/* Top Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 2: APPROVAL WORKFLOW ENGINE (Top Left, 2 Cols) */}
              <div className="relative group sm:col-span-2 min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <Image
                  src="/images/marketing-ops/2.png"
                  alt="Approval Workflow Engine"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />
                
                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    APPROVAL WORKFLOW ENGINE
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    Multi-step approval routing with SLA controls, escalation
                    paths, and Decision Ledger capture.
                  </h3>
                </div>
              </div>

              {/* Card 3: GOVERNED AI AGENTS (Top Right, 1 Col) */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <Image
                  src="/images/marketing-ops/3.png"
                  alt="Governed AI Agents"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />
                
                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    GOVERNED AI AGENTS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    AI agents for content, localization, QA, and performance —
                    within policy boundaries.
                  </h3>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 4: ROI ENGINE */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <Image
                  src="/images/marketing-ops/4.png"
                  alt="ROI Engine"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />
                
                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    ROI ENGINE
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Campaign throughput, cycle-time, and rework reduction —
                    measured.
                  </h3>
                </div>
              </div>

              {/* Card 5: STACK INTEGRATIONS */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <Image
                  src="/images/marketing-ops/5.png"
                  alt="Stack Integrations"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />
                
                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    STACK INTEGRATIONS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    CRM, DAM, social, paid, email, analytics — all connected.
                  </h3>
                </div>
              </div>

              {/* Card 6: COMMAND CENTER */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <Image
                  src="/images/marketing-ops/6.png"
                  alt="Command Center"
                  fill
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />
                
                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    COMMAND CENTER
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Full campaign portfolio visibility for marketing leadership.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
