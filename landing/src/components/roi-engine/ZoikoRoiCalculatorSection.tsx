"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import { ChevronDown, FileText, BarChart2 } from "lucide-react";

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

export default function ZoikoRoiCalculatorSection() {
  // Interactive state variables
  const [scenario, setScenario] = useState<
    "Conservative" | "Expected" | "Accelerated"
  >("Conservative");
  const [activeTab, setActiveTab] = useState<
    "ORGANIZATION" | "WORKFLOWS" | "GOVERNANCE"
  >("ORGANIZATION");
  const [teamSize, setTeamSize] = useState<number>(500);
  const [hourlyCost, setHourlyCost] = useState<number>(75);
  const [brands, setBrands] = useState<"1 brand" | "3-5 brands" | "6+ brands">(
    "1 brand",
  );
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);

  return (
    <section className="relative w-full bg-[#F4F6FB] py-16 md:py-24 px-6 font-sans">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Section Title Header */}
        <div className="space-y-3">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="h-[2px] w-4 bg-[#20E7F2]" />
            <span className="text-[12px] font-mono tracking-widest text-[#71717A] uppercase">
              INTERACTIVE ROI CALCULATOR
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A]"
          >
            Model your business case.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-[15px] sm:text-[16px] leading-relaxed text-[#64748B] max-w-xl"
          >
            Adjust inputs below. The model updates in real time. All assumptions
            are visible and editable. No form required to see the estimate.
          </motion.p>
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Calculator Controls (7 Columns) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 space-y-6"
          >
            {/* Scenario Segmented Selector */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-wider text-[#94A3B8] uppercase">
                SCENARIO
              </span>
              <div className="flex bg-[#E2E8F0]/60 p-1 rounded-xl">
                {(["Conservative", "Expected", "Accelerated"] as const).map(
                  (sc) => (
                    <button
                      key={sc}
                      onClick={() => setScenario(sc)}
                      className={`flex-1 py-2 text-xs font-mono tracking-wide rounded-lg transition-all ${
                        scenario === sc
                          ? "bg-white text-[#0F172A] shadow-sm font-semibold"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {sc}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Input Card with Tabs */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
              {/* Category Sub-Tabs */}
              <div className="flex border-b border-[#E2E8F0] gap-8">
                {(["ORGANIZATION", "WORKFLOWS", "GOVERNANCE"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-xs font-mono tracking-wider transition-colors relative ${
                        activeTab === tab
                          ? "text-[#0F172A] font-bold"
                          : "text-[#94A3B8] hover:text-[#0F172A]"
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F172A]" />
                      )}
                    </button>
                  ),
                )}
              </div>

              {/* Slider 1: Team Size */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-[#0F172A]">
                    Team size{" "}
                    <strong className="font-bold text-[#0F172A] text-lg sm:text-xl ml-1">
                      {teamSize} people
                    </strong>
                  </span>
                  <span className="text-xs text-[#94A3B8] font-mono">
                    Marketing, ops, and content teams
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="50"
                    max="5000"
                    step="50"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0F172A]"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#94A3B8]">
                  <span>50</span>
                  <span>5,000</span>
                </div>
              </div>

              {/* Slider 2: Hourly Cost */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-[#0F172A]">
                    Avg. loaded hourly cost{" "}
                    <strong className="font-bold text-[#0F172A] text-lg sm:text-xl ml-1">
                      ${hourlyCost} / hr
                    </strong>
                  </span>
                  <span className="text-xs text-[#94A3B8] font-mono">
                    Fully loaded, including overhead
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="5"
                    value={hourlyCost}
                    onChange={(e) => setHourlyCost(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0F172A]"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#94A3B8]">
                  <span>$40</span>
                  <span>$200</span>
                </div>
              </div>

              {/* Brands Button Group */}
              <div className="space-y-3">
                <span className="text-sm text-[#0F172A] block">
                  Brands/regions
                </span>
                <div className="flex gap-3">
                  {(["1 brand", "3-5 brands", "6+ brands"] as const).map(
                    (b) => (
                      <button
                        key={b}
                        onClick={() => setBrands(b)}
                        className={`px-5 py-2 rounded-xl text-xs font-mono transition-all ${
                          brands === b
                            ? "bg-[#0F172A] text-white shadow-sm"
                            : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        {b}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Accordion: View Model Assumptions */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setIsAssumptionsOpen(!isAssumptionsOpen)}
                className="w-full p-4 flex items-center justify-between text-xs font-mono tracking-wider text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <span># VIEW MODEL ASSUMPTIONS</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isAssumptionsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isAssumptionsOpen && (
                <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs font-mono text-[#64748B] space-y-2">
                  <p>
                    • Baseline productivity speedup estimated at 24% - 38% based
                    on workflow type.
                  </p>
                  <p>
                    • Approval cycle latency reduction benchmarked against
                    enterprise SaaS averages.
                  </p>
                  <p>
                    • Governance rework savings calculated from automated
                    compliance screening logs.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Live Output Display Card (5 Columns) */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="bg-[#0D1527] text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-white/10">
              {/* Header Metric */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-[#00E5FF] uppercase">
                  ESTIMATED ANNUAL VALUE
                </span>
                <div className="text-4xl sm:text-5xl font-black text-[#00E5FF] tracking-tight">
                  $422K
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Conservative range: $287K – $569K
                </p>
              </div>

              {/* 4 Stat Rows */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[#172136]">
                  <span className="text-slate-400">Payback period</span>
                  <span className="font-bold text-white">3 months</span>
                </div>

                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[#172136]">
                  <span className="text-slate-400">Hours saved / year</span>
                  <span className="font-bold text-white">1,529 hrs</span>
                </div>

                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[#172136]">
                  <span className="text-slate-400">
                    Approval cycle reduction
                  </span>
                  <span className="font-bold text-[#00E5FF]">-29%</span>
                </div>

                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[#172136]">
                  <span className="text-slate-400">
                    Content throughput lift
                  </span>
                  <span className="font-bold text-[#00E5FF]">+33%</span>
                </div>
              </div>

              {/* Governance Breakdown Sub-Card */}
              <div className="p-4 rounded-2xl bg-[#131C2E] border border-white/5 space-y-3">
                <span className="text-[10px] font-mono tracking-wider text-[#D4AF37] uppercase block">
                  GOVERNANCE ROI
                </span>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Audit prep time saved</span>
                    <span className="text-[#00E5FF] font-semibold">
                      $8K / yr
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Policy exception reduction</span>
                    <span className="text-[#00E5FF] font-semibold">
                      $10K / yr
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Evidence retrieval savings</span>
                    <span className="text-[#00E5FF] font-semibold">
                      $12K / yr
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Rework cost avoidance</span>
                    <span className="text-[#00E5FF] font-semibold">
                      $10K / yr
                    </span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] leading-relaxed text-slate-500 font-mono">
                ROI estimates are directional and depend on actual usage,
                implementation scope, data quality, workflow complexity, and
                adoption. Not a guaranteed financial outcome.
              </p>

              {/* Bottom Action Buttons */}
              <div className="space-y-3 pt-2">
                <button className="w-full py-3.5 px-4 rounded-2xl bg-[#00E5FF] text-[#0D1527] font-bold text-xs font-mono hover:bg-[#00cce5] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00E5FF]/20">
                  <FileText className="w-4 h-4" />
                  Get full executive report
                </button>

                <button className="w-full py-3.5 px-4 rounded-2xl bg-[#1B273E] border border-white/10 text-white font-semibold text-xs font-mono hover:bg-[#23324f] transition-colors flex items-center justify-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-300" />
                  Start ROI & Governance Audit
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
