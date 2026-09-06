"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function IndustryVerticalsSection() {
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
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  return (
    <section className="relative w-full bg-[#080C10] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              INDUSTRY VERTICALS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] mb-6 max-w-xl text-white"
          >
            Six regulated sectors. One governed execution platform.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-gray-400 max-w-lg leading-relaxed font-normal"
          >
            ZoikoVertex is deployed across the regulated industries where
            AI-generated marketing content creates the most significant
            compliance exposure.
          </motion.p>
        </div>

        {/* Bento Grid with Seamless Outer Border Radius and Seamless Inner Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {/* Card 1: Financial Services & Fintech (Full Height Left Card - Top Left & Bottom Left Corners) */}
          <div className="relative group lg:col-span-4 min-h-[520px] flex flex-col justify-end p-6 sm:p-8">
            <Image
              src="/images/regulated-industries/1.png"
              alt="Financial Services & Fintech"
              fill
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

            <div className="relative z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#C5A059] block mb-3">
                FINANCIAL SERVICES & FINTECH
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-snug mb-3 text-white">
                Financial promotions, disclosure requirements, and
                FCA/SEC-aligned compliance governance.
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                Policy rules for financial promotion standards, fair balance
                obligations, risk warnings, investment promotion restrictions,
                and jurisdiction-specific advertising regulations — with full
                evidence capture for regulatory readiness.
              </p>
              <a
                href="/fintech"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A059] hover:underline"
              >
                <span>FinTech solution</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area Grid Container */}
          <div className="lg:col-span-8 flex flex-col gap-px">
            {/* Top Row: 1 double-wide image + 1 single image */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 2: Healthcare & Life Sciences */}
              <div className="relative group sm:col-span-2 min-h-[250px] flex flex-col justify-end p-6">
                <Image
                  src="/images/regulated-industries/2.png"
                  alt="Healthcare & Life Sciences"
                  fill
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    HEALTHCARE & LIFE SCIENCES
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    Medical claims, off-label promotion restrictions, and patient
                    data governance for healthcare marketing.
                  </h3>
                </div>
              </div>

              {/* Card 3: Enterprise Retail (Top Right Corner) */}
              <div className="relative group min-h-[250px] bg-[#0B1117] flex flex-col justify-end p-6">
                <Image
                  src="/images/regulated-industries/3.png"
                  alt="Enterprise Retail"
                  fill
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    ENTERPRISE RETAIL
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Pricing claims, offer rules, and brand governance at store
                    scale.
                  </h3>
                </div>
              </div>
            </div>

            {/* Bottom Row: 3 equal images */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 4: Telecommunications */}
              <div className="relative group min-h-[250px] bg-[#0B1117] flex flex-col justify-end p-6">
                <Image
                  src="/images/regulated-industries/4.png"
                  alt="Telecommunications"
                  fill
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    TELECOMMUNICATIONS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Tariff claims, service commitments, and regulatory advertising
                    standards.
                  </h3>
                </div>
              </div>

              {/* Card 5: B2B SaaS & Technology */}
              <div className="relative group min-h-[250px] bg-[#0B1117] flex flex-col justify-end p-6">
                <Image
                  src="/images/regulated-industries/5.png"
                  alt="B2B SaaS & Technology"
                  fill
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    B2B SAAS & TECHNOLOGY
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Security claims, performance assertions, and enterprise
                    procurement compliance.
                  </h3>
                </div>
              </div>

              {/* Card 6: Logistics & Supply Chain (Bottom Right Corner) */}
              <div className="relative group min-h-[250px] bg-[#0B1117] flex flex-col justify-end p-6">
                <Image
                  src="/images/regulated-industries/6.png"
                  alt="Logistics & Supply Chain"
                  fill
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] block mb-2">
                    LOGISTICS & SUPPLY CHAIN
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Service commitment claims and cross-border regulatory
                    compliance.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}