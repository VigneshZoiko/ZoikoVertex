"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, Sparkles, Scale, Database } from "lucide-react";

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

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface ProcurementItem {
  icon: React.ElementType;
  label: string;
}

const procurementItems: ProcurementItem[] = [
  { icon: ShieldCheck, label: "Security overview" },
  { icon: FileText, label: "Data Processing Addendum (DPA)" },
  { icon: Sparkles, label: "Responsible AI" },
  { icon: Scale, label: "Compliance & Governance" },
  { icon: Database, label: "Auditability & evidence" },
];

export default function BusinessCaseAndProcurementSection() {
  return (
    <section className="relative min-h-[900px] w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              BUSINESS CASE &amp; PROCUREMENT
            </span>
            <span className="w-4 h-[2px] bg-cyan-400"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Justify it internally. Pass every review.
          </h2>
        </div>

        {/* Main Grid: Left (ROI Business Case Builder) & Right (Procurement & Security Pack) */}
        <motion.div
          className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Card: ROI Business Case Builder */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl bg-[#131C2B] border border-slate-800/80 p-8 md:p-10 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono  tracking-[1px] text-[#20E7F2] uppercase block mb-3">
                ROI BUSINESS CASE BUILDER
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3 tracking-tight">
                Turn the case into numbers.
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed mb-8">
                Model savings, payback, and risk reduction with the same engine
                your CFO will scrutinize.
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="p-4 rounded-xl bg-[#131C2B] border border-[#7AA0BE24]">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#20E7F2] tracking-tight block mb-1">
                    $2.4M
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Annual value
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#131C2B] border border-[#7AA0BE24]">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#20E7F2] tracking-tight block mb-1">
                    7.2 mo
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Payback
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#131C2B] border border-[#7AA0BE24]">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#20E7F2] tracking-tight block mb-1">
                    +41%
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider block">
                    Approval velocity
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button className="w-full py-4 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#00cce6] transition-all shadow-[0_0_25px_rgba(0,229,255,0.3)] active:scale-[0.98]">
              Run ROI &amp; Governance Audit
            </button>
          </motion.div>

          {/* Right Card: Procurement & Security Pack */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl bg-gradient-to-b from-[#111D2E] to-[#0B1524] border border-[#7AA0BE42] p-8 md:p-10 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#E8B768] uppercase block mb-3">
                PROCUREMENT &amp; SECURITY PACK
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3 tracking-tight">
                Everything reviewers ask for.
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md font-normal leading-relaxed mb-8">
                Controlled-access documentation for security, legal, privacy,
                and procurement teams.
              </p>

              {/* List of Security Items */}
              <div className="flex flex-col gap-3 mb-8">
                {procurementItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="group flex items-center justify-between p-4 rounded-xl hover:border-slate-700 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[#E8B768] stroke-[2]" />
                        <span className="text-xs sm:text-sm font-medium text-[#EEF2F6] group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[#E8B768] text-xs font-mono group-hover:translate-x-1 transition-transform">
                        &rarr;
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA Button */}
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-[#E8B768] to-[#C8954A] text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98]">
              Contact Sales for Access
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
