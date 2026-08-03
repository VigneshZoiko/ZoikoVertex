"use client";

import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Users2, ShieldCheck } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function GovernedAgenticHero() {
  return (
    <section className="w-full bg-[#06090F] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white relative overflow-hidden">
      <motion.div
        className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Left Column: Content & CTAs */}
        <motion.div variants={itemVariants} className="lg:col-span-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D1826] border border-[#00D2B4]/30 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D2B4]" />
            <span className="font-mono text-[10px] sm:text-[11px] font-medium tracking-wider text-[#00D2B4] uppercase">
              Now hiring • Multiple disciplines
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Build governed agentic AI
          </h1>

          {/* Subtitle */}
          <p className="text-3xl max-w-120 font-bold text-[#FFFFFFB8] mb-6 leading-snug">
            for teams that cannot afford black-box execution.
          </p>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#FFFFFF7A] leading-relaxed max-w-100 mb-8 font-normal">
            Join the team building AI workflows, approval systems, evidence
            trails, and executive controls for serious enterprise execution. We
            value evidence, ownership, precision, speed, and responsible
            autonomy.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <button
              type="button"
              className="bg-[#20E7F2] hover:bg-[#1CD0DA] text-[#06090F] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl inline-flex items-center gap-2 transition-all duration-150 shadow-lg shadow-[#20E7F2]/10 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>View Open Roles</span>
            </button>

            <button
              type="button"
              className="bg-[#0D1524] hover:bg-[#142036] border border-slate-800 text-white font-medium text-xs sm:text-sm px-6 py-3.5 rounded-xl inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
            >
              <Users2 className="w-4 h-4 text-[#64748B]" />
              <span>Join Talent Network</span>
            </button>
          </div>

          {/* Footer Note Link */}
          <a
            href="#responsible-ai"
            className="inline-flex items-center gap-2 font-mono text-[11px] text-[#64748B] hover:text-[#94A3B8] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>How we build responsible AI</span>
          </a>
        </motion.div>

        {/* Right Column: Interactive UI Mock Window */}
        <motion.div variants={itemVariants} className="lg:col-span-6">
          <div className="w-full bg-[#0B101D] border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            {/* Top Window Bar */}
            <div className="flex items-center gap-35 pb-4 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF1F]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF1F]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF1F]" />
              </div>
              <span className="font-mono tracking-[1px] text-[12px] text-[#FFFFFF42]">
                ZoikoVertex · Governed Execution
              </span>
            </div>

            {/* Workflow Header Status */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                CAMPAIGN APPROVAL WORKFLOW • ACTIVE
              </span>
            </div>

            {/* Stage Pills */}
            <div className="flex flex-wrap max-w-60 gap-2 mb-6">
              <span className="px-3 py-1 rounded-md bg-[#0D2838] border border-[#00D2B4]/30 font-mono text-[11px] text-[#00D2B4]">
                &lt; AI Draft
              </span>
              <span className="px-3 py-1 rounded-md bg-[#332200] border border-[#F59E0B]/40 font-mono text-[11px] text-[#F59E0B]">
                Risk check
              </span>
              <span className="px-3 py-1 rounded-md bg-[#161F33] text-[#64748B] font-mono text-[11px]">
                Review
              </span>
              <span className="px-3 py-1 rounded-md bg-[#161F33] text-[#64748B] font-mono text-[11px]">
                Review
              </span>
              <span className="px-3 py-1 rounded-md bg-[#2D2100] border border-[#D97706]/40 font-mono text-[11px] text-[#F59E0B]">
                Approve
              </span>
              <span className="px-3 py-1 rounded-md bg-[#0A2E1F] border border-[#10B981]/40 font-mono text-[11px] text-[#10B981]">
                Publish
              </span>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[#0F172A]/70 border border-slate-800">
                <div className="font-mono text-lg font-bold text-[#10B981]">
                  14
                </div>
                <div className="font-mono text-[9px] text-[#64748B] uppercase">
                  APPROVED TODAY
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0F172A]/70 border border-slate-800">
                <div className="font-mono text-lg font-bold text-[#F59E0B]">
                  3
                </div>
                <div className="font-mono text-[9px] text-[#64748B] uppercase">
                  PENDING REVIEW
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0F172A]/70 border border-slate-800">
                <div className="font-mono text-lg font-bold text-[#EF4444]">
                  1
                </div>
                <div className="font-mono text-[9px] text-[#64748B] uppercase">
                  BLOCKED
                </div>
              </div>
            </div>

            {/* Evidence Records List */}
            <div>
              <div className="font-mono text-[10px] font-bold text-[#64748B] uppercase mb-3">
                RECENT EVIDENCE RECORDS
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-[#0F172A]/50 border border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8]">Campaign #412 approved</span>
                  <span className="px-2 py-0.5 rounded bg-[#0A2E1F] text-[#10B981] font-mono text-[9px]">
                    Sealed
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0F172A]/50 border border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8]">Policy gate passed</span>
                  <span className="px-2 py-0.5 rounded bg-[#0A2E1F] text-[#10B981] font-mono text-[9px]">
                    Logged
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0F172A]/50 border border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8]">
                    Identity bound: Senior Approver
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0A2E1F] text-[#10B981] font-mono text-[9px]">
                    Identity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
