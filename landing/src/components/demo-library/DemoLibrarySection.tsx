"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  Diamond,
  Sparkles,
  Box,
  Activity,
  AlertTriangle,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
} as const;

export default function DemoLibrarySection() {
  return (
    <section className="relative min-h-screen w-full bg-[#030710] text-white px-6 py-12 md:px-16 lg:px-24 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-900/15 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-teal-900/20 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center z-10">
        {/* Left Content Column */}
        <motion.div
          className="lg:col-span-6 flex flex-col items-start"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Breadcrumb */}
          <motion.div
            variants={itemVariants}
            className="text-xs font-mono tracking-wider text-slate-400 mb-8 flex items-center gap-2"
          >
            <span>Home</span>
            <span className="text-slate-600">/</span>
            <span>Resources</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">Demo Library</span>
          </motion.div>

          {/* Section Sub-heading */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-5 h-[2px] bg-cyan-400"></span>
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              DEMO LIBRARY
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
          >
            See ZoikoVertex <br />
            <span className="text-cyan-400">in action.</span>
          </motion.h1>

          {/* Body Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mb-10 font-normal"
          >
            Explore product demos showing how ZoikoVertex orchestrates AI
            agents, approval workflows, governance controls, integrations,
            retail execution, and ROI measurement across enterprise teams.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 mb-12"
          >
            <button className="px-6 py-3.5 rounded-lg bg-[#00E5FF] text-slate-950 font-bold text-sm hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.4)]">
              Book a Live Enterprise Demo
            </button>
            <button className="px-6 py-3.5 rounded-lg border border-slate-800 bg-[#070E18]/80 text-slate-200 font-semibold text-sm hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-200">
              Browse Product Demos
            </button>
          </motion.div>

          {/* Divider Line */}
          <div className="w-full h-[1px] bg-slate-800/60 mb-8" />

          {/* Bullet Feature List */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs font-mono text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Governed agentic workflows</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Audit-ready execution</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Enterprise-grade controls</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Console Card Column */}
        <motion.div
          className="lg:col-span-6 w-full"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* Main Card Container */}
          <div
            className="relative rounded-2xl border border-cyan-500/20 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            style={{
              background: `
    radial-gradient(circle at 20% 20%, rgba(235,183,104,0.06) 0%, rgba(235,183,104,0) 35%),
    radial-gradient(circle at 80% 80%, rgba(32,231,242,0.13) 0%, rgba(32,231,242,0) 40%),
    linear-gradient(180deg, #050A17 0%, #08101F 100%)
  `,
            }}
          >
            {/* Header Bar */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/60" />
                </div>

                <span className="font-mono text-xs font-semibold tracking-[0.2em] text-cyan-300/80">
                  DEMO CONSOLE
                </span>
              </div>

              <div
                className="rounded px-2.5 py-1 text-[11px] font-mono"
                style={{
                  border: "1px solid #E8B76852",
                  color: "#E8B768",
                  background: "rgba(232,183,104,0.08)",
                }}
              >
                Synthetic data
              </div>
            </div>

            {/* Video Preview Container */}
            <div className="group relative mb-4 flex aspect-[4] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-b from-[#041219] to-[#02090F]">
              {/* Internal Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent opacity-80" />

              {/* Play Button */}
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/20 shadow-[0_0_35px_rgba(0,229,255,0.35)] transition-transform duration-300 group-hover:scale-105">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00E5FF] text-slate-950 shadow-inner">
                  <Play className="ml-0.5 h-5 w-5 fill-slate-950" />
                </div>
              </div>

              {/* Caption */}
              <div className="absolute bottom-3 left-4 z-10 font-mono text-[11px] tracking-wide text-slate-400/80">
                Governed execution · captures an
              </div>
            </div>

            {/* Status List */}
            <div className="space-y-0">
              {/* Row 1 */}
              <div className="flex items-center justify-between border-b border-cyan-500/10 px-1 py-3">
                <div className="flex items-center gap-3">
                  <Diamond className="h-4 w-4 stroke-[1.75] text-cyan-400" />
                  <span className="font-mono text-xs text-slate-300">
                    Agent task - draft campaign asset
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-cyan-400">
                  Running
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between border-b border-cyan-500/10 px-1 py-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 stroke-[1.75] text-amber-300/80" />
                  <span className="font-mono text-xs text-slate-300">
                    Approval step - reviewer sign-off
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-amber-300/90">
                  Awaiting
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between border-b border-cyan-500/10 px-1 py-3">
                <div className="flex items-center gap-3">
                  <Box className="h-4 w-4 stroke-[1.75] text-emerald-400/80" />
                  <span className="font-mono text-xs text-slate-300">
                    Evidence record - sealed package
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-emerald-400">
                  Sealed
                </span>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between border-b border-cyan-500/10 px-1 py-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 stroke-[1.75] text-cyan-400" />
                  <span className="font-mono text-xs text-slate-300">
                    ROI metric - +41% approval velocity
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-cyan-400">
                  Live
                </span>
              </div>

              {/* Row 5 */}
              <div className="flex items-center justify-between px-1 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 stroke-[1.75] text-amber-400/90" />
                  <span className="font-mono text-xs text-slate-300">
                    Risk status - within policy
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-emerald-400">
                  Clear
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
