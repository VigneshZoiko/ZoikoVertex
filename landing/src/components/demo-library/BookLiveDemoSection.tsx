"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

const formVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
  },
} as const;

export default function BookLiveDemoSection() {
  const [useCase, setUseCase] = useState<string>("");
  const [govReqs, setGovReqs] = useState<string[]>([]);
  const [agreed, setAgreed] = useState<boolean>(false);

  const toggleGovReq = (req: string) => {
    setGovReqs((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req],
    );
  };

  return (
    <section className="relative min-h-screen w-full bg-[#030711] text-white px-6 py-16 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-900/10 blur-[160px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Information Column */}
        <div className="lg:col-span-5 flex flex-col items-start pt-4">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-4"
          >
            <span className="w-4 h-[2px] bg-[#C59B6C]"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#C59B6C] uppercase">
              BOOK A LIVE ENTERPRISE DEMO
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
          >
            See it on your workflows.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-slate-300 text-sm leading-relaxed max-w-md mb-8 font-normal"
          >
            Tell us your context{" "}
            <span className="italic text-slate-400">
              and we&apos;ll tailor a live walkthrough
            </span>{" "}
            — governance, workflows, integrations, or ROI, mapped to your team.
          </motion.p>

          {/* Routing Card Info Box */}
          <motion.div
            variants={itemVariants}
            className="w-full rounded-2xl border border-slate-800/80 bg-[#070E18]/60 p-6 backdrop-blur-md"
          >
            <p className="text-xs leading-relaxed text-slate-400 font-normal">
              <span className="text-cyan-400 font-semibold">Routing.</span>{" "}
              Enterprise and high-governance requests route to senior sales;
              technical requests route to a solutions architect. We reply within
              one business day.
            </p>
          </motion.div>
        </div>

        {/* Right Interactive Form Panel */}
        <motion.div className="lg:col-span-7 w-full" variants={formVariants}>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative rounded-2xl border border-slate-800/80 bg-[#131C2B] p-6 sm:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col gap-5"
          >
            {/* Input Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Work email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Input Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Company"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Company size
                </label>
                <select className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer">
                  <option value="1-200">1-200</option>
                  <option value="201-1000">201-1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </div>
            </div>

            {/* Input Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Role
                </label>
                <select className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer">
                  <option value="Executive">Executive</option>
                  <option value="Engineering">
                    Engineering / Architecture
                  </option>
                  <option value="Legal">Legal & Compliance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Timeline
                </label>
                <select className="w-full px-4 py-2.5 rounded-lg bg-[#030711] border border-slate-800/90 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer">
                  <option value="Now">Now</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="Evaluating">Just evaluating</option>
                </select>
              </div>
            </div>

            {/* Primary use case section */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2.5">
                Primary use case
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Agentic workflows",
                  "Approvals",
                  "Governance",
                  "Retail execution",
                  "Integrations",
                  "ROI",
                  "Auditability",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setUseCase(item)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-mono transition-colors ${
                      useCase === item
                        ? "bg-[#00E5FF]/20 text-cyan-300 border border-cyan-500/50"
                        : "bg-[#030711] text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Governance requirements section */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <label className="text-xs font-mono text-slate-300">
                  Governance requirements
                </label>
                <span className="text-[10px] font-mono text-slate-500 italic">
                  optional
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Audit trail",
                  "Approval evidence",
                  "Responsible AI",
                  "Data retention",
                  "DPA",
                  "Security review",
                  "SOC 2 readiness",
                ].map((req) => {
                  const isSelected = govReqs.includes(req);
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => toggleGovReq(req)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-mono transition-colors ${
                        isSelected
                          ? "bg-[#00E5FF]/20 text-cyan-300 border border-cyan-500/50"
                          : "bg-[#030711] text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {req}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start gap-3 mt-1">
              <input
                type="checkbox"
                id="consent"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-800 bg-[#030711] text-cyan-400 focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="consent"
                className="text-[11px] font-mono text-slate-400 leading-snug cursor-pointer"
              >
                I agree to be contacted about this request and accept the{" "}
                <a href="#" className="text-cyan-400 hover:underline">
                  Privacy Policy
                </a>{" "}
                &amp;{" "}
                <a href="#" className="text-cyan-400 hover:underline">
                  DPA
                </a>
                . Prototype — no data is submitted.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#00E5FF] text-slate-950 font-bold text-sm hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_25px_rgba(0,229,255,0.4)] mt-2"
            >
              Request Live Demo
            </button>

            {/* Footer Routing Info */}
            <div className="text-center text-[10px] font-mono text-slate-500 mt-1">
              Routed to privacy-compliant CRM · senior sales / solutions
              architect routing
            </div>
          </form>
        </motion.div>
      </motion.div>
    </section>
  );
}
