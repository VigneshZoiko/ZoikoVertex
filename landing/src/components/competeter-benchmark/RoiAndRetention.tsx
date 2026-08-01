"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ChevronDown } from "lucide-react";

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

export default function RoiAndRetention() {
  const [email, setEmail] = useState("");
  const [selectedTool, setSelectedTool] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
  };

  return (
    <section className="w-full bg-[#080C14] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#00D2B4]">
              ROI & RETENTION
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl">
            Convert your evaluation into a measurable business case.
          </h2>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Image Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 relative group overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0C121E] min-h-[380px] sm:min-h-[440px]"
          >
            <Image
              src="/images/competeter-benchmark/audit.png"
              alt="Measurable business case dashboard preview"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Subtle overlay gradient to match theme */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080C14]/60 via-transparent to-transparent" />
          </motion.div>

          {/* Right Column: Benchmark Updates Form Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-[#0B101D] p-6 sm:p-10 flex flex-col justify-between"
          >
            <div>
              {/* Tag */}
              <div className="mb-3">
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#20E7F2] uppercase">
                  QUARTERLY BENCHMARK UPDATES
                </span>
              </div>

              {/* Card Heading */}
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-3">
                Stay current as the AI governance category evolves.
              </h3>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-[#8EA0B8] leading-relaxed mb-8 font-normal">
                Receive quarterly updates when the benchmark is reviewed — new
                capability categories, framework alignment changes, and
                evaluation criteria updates.
              </p>

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Work email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-800/90 rounded-xl px-4 py-3.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#00D2B4] transition-colors"
                  />
                </div>

                {/* Dropdown Select */}
                <div className="relative">
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-800/90 rounded-xl px-4 py-3.5 text-xs text-[#94A3B8] appearance-none focus:outline-none focus:border-[#00D2B4] transition-colors cursor-pointer pr-10"
                  >
                    <option value="" disabled hidden>
                      Which tool are you evaluating against?
                    </option>
                    <option
                      value="project-management"
                      className="bg-[#101726] text-white"
                    >
                      Project / Work Management Tools
                    </option>
                    <option
                      value="marketing-automation"
                      className="bg-[#101726] text-white"
                    >
                      Marketing Automation Platform
                    </option>
                    <option
                      value="ai-copilots"
                      className="bg-[#101726] text-white"
                    >
                      AI Copilots & Assistants
                    </option>
                    <option
                      value="workflow-automation"
                      className="bg-[#101726] text-white"
                    >
                      Workflow Automation Tools
                    </option>
                    <option
                      value="bi-analytics"
                      className="bg-[#101726] text-white"
                    >
                      BI & Analytics Dashboards
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-[#20E7F2] hover:bg-[#00BFA3] text-[#090D16] font-bold text-xs sm:text-sm py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-md shadow-[#00D2B4]/10 cursor-pointer mt-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Subscribe to benchmark updates</span>
                </button>
              </form>
            </div>

            {/* Micro-copy Footer Note */}
            <p className="font-mono text-[9px] text-[#475569] text-center mt-6 leading-relaxed">
              One email per quarter. No sales emails. Unsubscribe any time. Data
              handled under our{" "}
              <a
                href="#"
                className="underline hover:text-[#94A3B8] transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
