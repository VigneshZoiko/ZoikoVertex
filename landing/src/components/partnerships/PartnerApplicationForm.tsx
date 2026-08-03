"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Search,
  ShieldCheck,
  GraduationCap,
  MessageSquare,
  Check,
  X,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

export default function PartnerApplicationForm() {
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
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#F2F4F9] text-[#050B14] py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#0891B2] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNER APPLICATION
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#050B14] mb-4">
            Apply to become a <br className="hidden sm:inline" />
            ZoikoVertex partner.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#475569] text-base sm:text-lg max-w-xl font-normal leading-relaxed">
            Applications reviewed within 5 business days. Selective program
            &mdash; subject to qualification, legal, and security review. All
            applicants receive a response.
          </p>
        </motion.div>

        {/* Form and Sidebar Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left Side: Main Form Container (Light/White Card) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Top Cyan Accent Line */}
            <div className="w-full h-1 bg-[#2DD4BF]" />

            <div className="p-8 sm:p-10">
              {/* Form Subheader */}
              <span className="text-[#64748B] text-[10px] font-mono tracking-widest uppercase font-semibold block mb-2">
                ZOIKOVERTEX PARTNER PROGRAM &ndash; APPLICATION
              </span>

              {/* Form Title */}
              <h3 className="text-2xl font-bold text-[#050B14] mb-1">
                Partner application form
              </h3>

              {/* Form Meta details */}
              <p className="text-[#64748B] text-xs font-mono mb-6">
                Three steps &bull; 5-day response &bull; Selective partner
                program
              </p>

              {/* Step Progress Bar */}
              <div className="flex items-center gap-2 mb-8 shadow-xl-t shadow-xl-[#20E7F2] pt-6">
                <span className="w-8 h-1.5 bg-[#2DD4BF] rounded-full" />
                <span className="w-8 h-1.5 bg-[#E2E8F0] rounded-full" />
                <span className="w-8 h-1.5 bg-[#E2E8F0] rounded-full" />
              </div>

              {/* Step Header Indicator */}
              <span className="text-[#64748B] text-[11px] font-mono tracking-wider uppercase font-semibold block mb-6">
                STEP 1 OF 3 &ndash; COMPANY & CONTACT
              </span>

              {/* Form Inputs Grid */}
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      First name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Alex"
                      className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      Last name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Johnson"
                      className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                    />
                  </div>
                </div>

                {/* Work email */}
                <div>
                  <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                    Work email <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="alex@company.com"
                    className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                  />
                </div>

                {/* Company Name & Company Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      Company name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Acme Corp"
                      className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      Company website <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://"
                      className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                    />
                  </div>
                </div>

                {/* HQ Country & Company Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      HQ country <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="United States"
                      className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#050B14] placeholder-[#94A3B8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#050B14] mb-1.5">
                      Company size
                    </label>
                    <div className="relative">
                      <select className="w-full bg-[#F2F4F9] shadow-sm focus:shadow-xl-[#2DD4BF] focus:bg-white focus:outline-none rounded-lg px-4 py-2.5 text-sm text-[#64748B] appearance-none cursor-pointer transition-colors">
                        <option value="">Select</option>
                        <option value="1-50">1-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-3.5 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Action Footer */}
            <div className="bg-[#F2F4F9] s shadow-sm px-8 py-5 flex justify-end">
              <button
                type="button"
                className="bg-[#050B14] hover:bg-[#0F172A] text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all group shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Right Side: 4 Dark Info Cards Stack */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card 1: What happens after you apply */}
            <motion.div
              variants={itemVariants}
              className="bg-[#0A111E] shadow-xl shadow-xl-[#1E293B] rounded-2xl p-6 text-white"
            >
              <h4 className="text-base font-semibold mb-4 text-white">
                What happens after you apply
              </h4>
              <ul className="space-y-3 text-xs text-[#94A3B8]">
                <li className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>Alliances team reviews within 5 business days</span>
                </li>
                <li className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>
                    Qualification call to assess enterprise fit and intent
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>Legal and security review for approved applicants</span>
                </li>
                <li className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>
                    Certification and onboarding for accepted partners
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>
                    All applicants receive a response &mdash; no ghosting
                  </span>
                </li>
              </ul>
            </motion.div>

            {/* Card 2: Strong fit for this program */}
            <motion.div
              variants={itemVariants}
              className="bg-[#0A111E] shadow-xl shadow-xl-[#1E293B] rounded-2xl p-6 text-white"
            >
              <h4 className="text-base font-semibold mb-4 text-white">
                Strong fit for this program
              </h4>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Enterprise delivery or market access capability</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Security and compliance maturity</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Genuine customer demand or integration value</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Responsible AI standards alignment</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Enterprise-grade commercial conduct</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 3: Not a fit for this program */}
            <motion.div
              variants={itemVariants}
              className="bg-[#0A111E] shadow-xl shadow-xl-[#1E293B] rounded-2xl p-6 text-white"
            >
              <h4 className="text-base font-semibold mb-4 text-white">
                Not a fit for this program
              </h4>
              <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>Consumer or SMB-only focused organizations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>No verifiable enterprise customer base</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>Unresolved compliance or legal issues</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>Seeking certification before review</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 4: Legal / Privacy Note */}
            <motion.div
              variants={itemVariants}
              className="bg-[#0A111E] shadow-xl shadow-xl-[#1E293B] rounded-2xl p-5 text-white"
            >
              <p className="text-[11px] font-mono text-[#64748B] leading-relaxed">
                Data submitted is handled under our{" "}
                <a href="#privacy" className="underline">
                  Privacy Policy
                </a>{" "}
                and retained for partner evaluation. You may request deletion at
                any time. Applications are reviewed by the ZoikoVertex Alliances
                team and are not shared publicly.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
