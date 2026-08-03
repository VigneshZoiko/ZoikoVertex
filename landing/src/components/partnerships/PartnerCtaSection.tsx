"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Building2 } from "lucide-react";

export default function PartnerCtaSection() {
  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center bg-[#050B14] text-white overflow-hidden py-24 px-6 sm:px-12 md:px-16 font-sans antialiased">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/partnerships/cta.jpg"
          alt="ZoikoVertex Team Meeting Background"
          fill
          priority
          className="object-cover object-center opacity-40 mix-blend-luminosity scale-105"
        />
        {/* Dark Vignette Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 via-[#050B14]/90 to-[#050B14]" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#050B14]/50 to-[#050B14]" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Subtitle Accent Line & Text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <span className="w-6 h-[2px] bg-[#2DD4BF]" />
          <span className="text-[#2DD4BF] text-xs sm:text-sm tracking-[0.2em] font-medium uppercase font-mono">
            ZOIKOVERTEX PARTNER ECOSYSTEM
          </span>
        </motion.div>

        {/* Main Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-[44px] lg:text-[44px] font-semibold tracking-tight text-white mb-6"
        >
          Build governed AI <br />
          execution <span className="text-[#00E5FF]">with</span> <br />
          <span className="text-[#00E5FF]">ZoikoVertex.</span>
        </motion.h1>

        {/* Hero Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#FFFFFF6B] text-base sm:text-lg md:text-xl max-w-xl mx-auto font-normal leading-relaxed mb-10"
        >
          Help enterprise teams deploy accountable agentic workflows — with
          approval controls, evidence, auditability, and measurable ROI.
          Selective program. Enterprise standards apply to every partnership.
        </motion.p>

        {/* CTA Buttons Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-10"
        >
          {/* Primary CTA Button */}
          <button
            type="button"
            className="w-full sm:w-auto bg-[#C9A84C] hover:bg-[#B45309] text-black font-medium text-sm py-3.5 px-7 rounded-full transition-all duration-200 shadow-lg shadow-[#D97706]/15 hover:shadow-[#D97706]/25"
          >
            Become a Partner
          </button>

          {/* Secondary Cyan CTA Button */}
          <button
            type="button"
            className="w-full sm:w-auto bg-[#20E7F2] hover:bg-[#00B8D4] text-[#050B14] font-medium text-sm py-3.5 px-7 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#00E5FF]/15 hover:shadow-[#00E5FF]/25"
          >
            <Users className="w-4 h-4 stroke-[2.5]" />
            <span>Talk to Alliances</span>
          </button>

          {/* Outlined Contact Sales Button */}
          <button
            type="button"
            className="w-full sm:w-auto border border-[#334155] hover:border-[#64748B] hover:bg-[#0F172A]/80 text-white font-medium text-sm py-3.5 px-7 rounded-full transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            <Building2 className="w-4 h-4 text-[#94A3B8]" />
            <span>Contact Sales</span>
          </button>
        </motion.div>

        {/* Footer Fine Print Tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-[#FFFFFF38] text-xs font-mono tracking-wider max-w-lg text-center"
        >
          Selective partner program &bull; Enterprise governance standards apply
          &bull; Participation subject to qualification, legal, and security
          review.
        </motion.p>
      </div>
    </section>
  );
}
