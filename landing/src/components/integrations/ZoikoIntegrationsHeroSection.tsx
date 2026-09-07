"use client";

import React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Database,
  Share2,
  FileText,
  BarChart2,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ZoikoIntegrationsHeroSection() {
  const router = useRouter();
  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div
      style={{
        background: `
    radial-gradient(circle at 20% 20%, rgba(235,183,104,0.06) 0%, rgba(235,183,104,0) 35%),
    radial-gradient(circle at 80% 80%, rgba(32,231,242,0.13) 0%, rgba(32,231,242,0) 40%),
    linear-gradient(180deg, #050A17 0%, #08101F 100%)
  `,
      }}
      className="relative min-h-screen w-full text-slate-300 font-sans antialiased overflow-hidden flex items-center justify-center p-6 md:p-12 lg:p-16"
    >
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#20E7F2]/10 via-transparent to-transparent pointer-events-none" />

      <motion.div
        className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Column: Text & CTA */}
        <div className="lg:col-span-6 flex flex-col items-start space-y-8">
          {/* Breadcrumb */}
          <motion.div
            variants={itemVariants}
            className="text-xs tracking-wider text-slate-500 font-mono flex items-center space-x-1"
          >
            <Link href="/">Home</Link>
            <span>/</span>
            <a href="/platform">Platform</a>
            <span>/</span>
            <span className="text-slate-400">Integrations</span>
          </motion.div>

          {/* Tagline */}
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-2 text-[#20E7F2] font-mono text-xs font-semibold tracking-widest uppercase"
          >
            <span className="w-4 h-[1px] bg-[#20E7F2] inline-block" />
            <span>Enterprise AI Workflow Integrations</span>
          </motion.div>

          {/* Main Headline */}

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-[64px] max-w-130 font-bold tracking-tight text-white leading-[1.1]"
          >
            Connect every execution system{" "}
            <span className="text-[#20E7F2] text-[60px]">without losing control.</span>
          </motion.h1>

          {/* Subtitle Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg text-slate-400 max-w-xl leading-relaxed font-normal"
          >
            ZoikoVertex integrates with the systems your enterprise already uses
            — while preserving approvals, evidence, role permissions, policy
            controls, and audit-ready execution records.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            <button onClick={()=>router.push("/request-demo")} className="px-6 py-3.5 cursor-pointer bg-[#20E7F2] hover:bg-[#1cd2dc] text-[#030914] font-semibold text-sm rounded-lg transition-all shadow-[0_0_20px_rgba(32,231,242,0.25)] hover:shadow-[0_0_25px_rgba(32,231,242,0.4)] active:scale-[0.98]">
              Book Integration Demo
            </button>
            <button onClick={()=>router.push("/resources-hub")} className="px-6 py-3.5 text-white font-medium text-sm rounded-lg border cursor-pointer border-slate-800 transition-all active:scale-[0.98]">
              Get Stack Assessment
            </button>
          </motion.div>

          {/* Bottom Divider Line */}
          <motion.div
            variants={itemVariants}
            className="w-full pt-8 border-t border-slate-800/60"
          >
            {/* Feature Pills / Badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                Audit-ready
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                Role-scoped
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                API-first
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                SOC 2-ready controls
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                DPA support
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Governed Integration Fabric Visual */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-6 w-full flex justify-center lg:justify-end"
        >
          {/* Main Card Container with Linear Gradient #131C2B -> #0B1524 & Border #7AA0BE 26% Opacity */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(32,231,242,0.5) 0%, rgba(32,231,242,0) 35%, rgba(32,231,242,0) 70%, rgba(235,183,104,0.32) 100%)",
            }}
            className="w-full max-w-lg rounded-2xl border border-[#7AA0BE24] p-5 md:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between pb-5">
              <span className="text-[11px] font-mono tracking-widest text-[#20E7F2] uppercase font-semibold">
                Governed Integration Fabric
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#20E7F2] animate-pulse" />
                <span className="text-[10px] font-mono tracking-wider text-[#20E7F2] font-medium">
                  SCOPED
                </span>
              </div>
            </div>

            {/* Inner Top Core Box (ZoikoVertex) */}
            <div className="w-full rounded-xl bg-[#20E7F20D] border border-[#7AA0BE24] p-6 flex flex-col items-center justify-center text-center mb-4 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <h3 className="text-lg font-bold tracking-wider text-[#20E7F2] mb-1">
                ZOIKO<span className="text-white">VERTEX</span>
              </h3>
              <p className="text-[11px] font-mono text-[#FFFFFF]/50 tracking-[2px]">
                identity &bull; policy &bull; workflow &bull; evidence
              </p>
            </div>

            {/* Grid of Integration Items */}
            <div className="grid grid-cols-2 gap-3">
              {/* Item 1: CRM */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      CRM
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      OAuth &bull; scoped
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>

              {/* Item 2: Social */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      Social
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Approval-gated
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>

              {/* Item 3: Content / DAM */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      Content / DAM
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Role-scoped
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>

              {/* Item 4: Analytics / BI */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      Analytics / BI
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Read &bull; governed
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>

              {/* Item 5: Approvals */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      Approvals
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      HITL &bull; Logged
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>

              {/* Item 6: Identity / IAM */}
              <div className="bg-[#FFFFFF04] rounded-xl border border-[#7AA0BE24] p-3.5 flex items-center justify-between hover:border-[#20E7F2]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg text-[#20E7F2] group-hover:text-[#20E7F2] bg-[#17222F]/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      Identity / IAM
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      SSO &bull; SCIM
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  EV
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
