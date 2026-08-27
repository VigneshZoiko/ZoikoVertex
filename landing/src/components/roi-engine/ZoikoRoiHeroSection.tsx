"use client";

import React from "react";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Calculator, FileText } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoRoiHeroSection() {
  return (
    <section className="relative w-full min-h-[600px] lg:min-h-[680px] flex items-center bg-[#0d0f12] overflow-hidden py-16 px-6 font-sans text-white">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/roi-engine/hero.png"
          alt="Laptop background with overlay"
          fill
          className="w-full h-full object-cover object-center opacity-40"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8"
        >
          {/* Left Text Content Area */}
          <div className="w-full lg:w-[55%] space-y-6">
            {/* Pill Badge */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C9A84C1F] border border-[#C9A84C40] text-[#20E7F2] text-xs font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                ROI Engine for Governed AI Execution
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-[64px] max-w-130 font-bold tracking-tight text-white leading-[1.1]"
            >
              Prove the business value of every{" "}
              <span className="text-[#20E7F2] text-[60px]">AI workflow.</span>
            </motion.h1>

            {/* Description Paragraph */}
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-base leading-relaxed text-[#FFFFFF80] max-w-xl"
            >
              Estimate the ROI of ZoikoVertex across workflow speed, approval
              efficiency, content throughput, governance evidence, and executive
              oversight — with conservative scenarios built for serious
              enterprise buyers.
            </motion.p>

            {/* Glass Disclaimer Box */}
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-[8px] bg-[#C9A84C0F] border border-[#C9A84C26] backdrop-blur-sm max-w-xl"
            >
              <p className="text-xs leading-relaxed text-[#C9A84C99]">
                No inflated claims. No black-box assumptions. A clear business
                case for governed AI execution based on your operating model.
                All estimates are directional and depend on adoption,
                implementation scope, and operating costs.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <button className="inline-flex items-center gap-3 px-10 py-3 rounded-full bg-[#20E7F2] text-[#0d0f12] font-semibold text-sm hover:bg-[#1cd4de] transition-colors shadow-lg shadow-[#20E7F2]/20">
                <Calculator className="w-4 h-4" />
                Calculate ROI
              </button>
              <button className="inline-flex items-center gap-3 px-10 py-3 rounded-full border border-[#FFFFFF1A] text-white font-semibold text-sm hover:bg-white/10 transition-colors backdrop-blur-sm">
                <FileText className="w-4 h-4" />
                Request a Demo
              </button>
            </motion.div>
          </div>

          {/* Right Card Widget */}
          <motion.div
            variants={itemVariants}
            className="w-full lg:w-[42%] max-w-[460px]"
          >
            <div className="rounded-2xl bg-[#0f1723]/90 border border-white/10 p-6 shadow-2xl backdrop-blur-md space-y-6">
              {/* Header / Tabs */}
              <div className="flex items-center justify-between text-xs text-[#858d9a]">
                <span className="font-mono uppercase tracking-wider text-[10px]">
                  ROI PREVIEW - 500-PERSON TEAM
                </span>
                <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded-lg border border-white/5">
                  <span className="px-2.5 py-0.5 rounded bg-[#12282e] text-[#20E7F2] font-medium text-[11px]">
                    Conservative
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[#858d9a] font-medium text-[11px]">
                    Expected
                  </span>
                </div>
              </div>

              {/* Main Metric */}
              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-extrabold text-[#20E7F2] tracking-tight">
                  $1.2M
                </div>
                <div className="text-[11px] font-mono text-[#858d9a] tracking-wider uppercase">
                  ESTIMATED ANNUAL VALUE
                </div>
                <div className="text-xs text-[#6b7280]">
                  Range: $828K – $1.6M
                </div>
              </div>

              {/* 2x2 Grid of Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#141e2e]/60 border border-white/5 space-y-1">
                  <div className="text-xl font-bold text-white">8 mo</div>
                  <div className="text-[10px] font-mono text-[#858d9a] uppercase">
                    PAYBACK
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141e2e]/60 border border-white/5 space-y-1">
                  <div className="text-xl font-bold text-white">4,200 hrs</div>
                  <div className="text-[10px] font-mono text-[#858d9a] uppercase">
                    HOURS SAVED / YR
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141e2e]/60 border border-white/5 space-y-1">
                  <div className="text-xl font-bold text-white">-38%</div>
                  <div className="text-[10px] font-mono text-[#858d9a] uppercase">
                    APPROVAL CYCLE
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141e2e]/60 border border-white/5 space-y-1">
                  <div className="text-xl font-bold text-white">+47%</div>
                  <div className="text-[10px] font-mono text-[#858d9a] uppercase">
                    CONTENT VELOCITY
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#858d9a]">Governance ROI</span>
                  <span className="text-[#20E7F2] font-mono font-semibold">
                    $180K
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#141e2e] overflow-hidden">
                  <div className="h-full bg-[#20E7F2] rounded-full w-[65%]" />
                </div>
              </div>

              {/* Bottom Widget Button */}
              <button className="w-full py-3 px-4 rounded-xl bg-[#20E7F2] text-[#0d0f12] font-semibold text-sm hover:bg-[#1cd4de] transition-colors flex items-center justify-center gap-2">
                <Calculator className="w-4 h-4" />
                Calculate your ROI
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
