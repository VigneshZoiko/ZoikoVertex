"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function TalkToSalesSection() {
  const [selectedInterest, setSelectedInterest] = useState<string>(
    "Agentic architecture",
  );
  const [agreed, setAgreed] = useState<boolean>(false);

  const interestOptions = [
    "Agentic architecture",
    "Executive Command Center",
    "Approval workflows",
    "ROI & business case",
    "Enterprise retail",
    "DPA / security",
  ];

  const valueProps = [
    "Governed AI workflows",
    "Approval controls",
    "Evidence layer",
    "Audit-ready deployment",
  ];

  return (
    <section className="w-full bg-gradient-to-b from-[#050B14] to-[#0A1526] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* LEFT COLUMN: Heading, Description & CTAs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-5 space-y-6 lg:pt-4"
        >
          {/* Subheader Badge Tag */}
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#00D2B4] uppercase flex items-center gap-2">
            <span className="w-4 h-[1px] bg-[#00D2B4]" />
            ENTERPRISE SALES · GOVERNED AGENTIC EXECUTION
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-[62px] font-bold tracking-tight leading-[1.12]">
            Talk to the team that governs{" "}
            <span className="text-[#20E7F2]">autonomous marketing.</span>
          </h2>

          {/* Description */}
          <p className="text-sm text-[#B9C2D0] max-w-xl leading-relaxed font-normal">
            Tell us where you are — evaluation, procurement, or ready to deploy
            — and we'll route you directly to the specialist who can move you
            forward. No generic queue. No pricing pressure.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-6 pt-2">
            <div>
              <a
                href="#book-demo"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-3 rounded-xl bg-[#20E7F2] text-slate-950 font-bold text-xs hover:bg-[#20E7F2] transition-all shadow-lg shadow-[#00D2B4]/10 active:scale-95"
              >
                <span>Book an Enterprise Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div>
              <a
                href="#view-roi"
                className="inline-flex items-center justify-center w-full sm:w-auto px-15 py-3 rounded-xl border border-slate-800 text-slate-300 font-semibold text-xs hover:text-white hover:border-slate-700 transition-all"
              >
                View ROI & Governance
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="pt-4 border-t border-slate-800/80" />

          {/* Bulleted Feature Badges */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
            {valueProps.map((prop, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3px] text-slate-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
                <span>{prop}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Contact Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-7 bg-[#0A1526] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Card Header */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Talk to sales</h3>
            <p className="text-xs text-slate-400">
              Four fields to start — we'll route you to the right specialist
              automatically.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Row 1: Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  FIRST NAME <span className="text-[#DDBE5C]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Alexandra"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  LAST NAME <span className="text-[#DDBE5C]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Reyes"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Row 2: Email & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  WORK EMAIL <span className="text-[#DDBE5C]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  COMPANY <span className="text-[#DDBE5C]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Company name"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Row 3: Company Size & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  COMPANY SIZE <span className="text-[#DDBE5C]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Select company size"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  TIMELINE
                </label>
                <input
                  type="text"
                  placeholder="Deployment window"
                  className="w-full bg-[#101E36] border border-[#25395C] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#5D6B82] focus:outline-none focus:border-[#00D2B4] transition-colors"
                />
              </div>
            </div>

            {/* Primary Interest Grid Pills */}
            <div className="pt-2">
              <label className="block font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                PRIMARY INTEREST <span className="text-[#DDBE5C]">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {interestOptions.map((option) => {
                  const isSelected = selectedInterest === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedInterest(option)}
                      className={`px-4 py-2 rounded-full font-mono text-[11px] text-left transition-all border ${
                        isSelected
                          ? "bg-[#00D2B4]/10 border-[#00D2B4] text-[#00D2B4] font-semibold"
                          : "bg-[#0F172A]/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="consent"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-[#00D2B4] focus:ring-[#00D2B4] accent-[#00D2B4] cursor-pointer"
              />
              <label
                htmlFor="consent"
                className="text-[11px] text-slate-400 leading-snug cursor-pointer select-none"
              >
                I consent to be contacted by ZoikoVertex sales regarding this
                inquiry. *
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#20E7F2] hover:bg-[#20E7F2] text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-[#00D2B4]/20 flex items-center justify-center gap-2 active:scale-95 mt-4"
            >
              <span>Submit request</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Footnote */}
            <p className="text-[10px] text-slate-500 text-center pt-1 font-mono">
              Reviewed and routed by a specialist — typically within 4 business
              hours.
            </p>

            {/* Live Routing Preview Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#14ADA624] to-[#C9A22714] border border-[#20E7F2] flex items-center justify-around mt-4">
              <div>
                <div className="font-mono text-[9px] font-bold text-[#00D2B4] uppercase tracking-[1px] mb-0.5">
                  LIVE ROUTING PREVIEW
                </div>
                <div className="text-sm font-bold text-white">
                  Enterprise Sales
                </div>
              </div>
              <div className="text-right font-mono text-[10px]">
                <div className="text-slate-400">
                  Priority{" "}
                  <span className="text-[#C9A84C] font-bold">40/100</span>
                </div>
                <div className="text-slate-500">SLA: 1–2 business days</div>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
