"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function PartnerPathways() {
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
    <section className="w-full bg-[#050B14] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 min-h-screen flex flex-col justify-center font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#20E7F2]" />
            <span className="text-[#20E7F2] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNER PROFILES
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Six partnership pathways. One governance standard.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            ZoikoVertex partners with organizations capable of deploying
            governed agentic execution responsibly, measurably, and securely for
            enterprise customers.
          </p>
        </motion.div>

        {/* Bento Box Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-2xl"
        >
          {/* Column 1: Featured Card (Takes 2 rows height on large screens) */}
          <motion.div
            variants={itemVariants}
            className="relative lg:col-span-1 lg:row-span-2 rounded-xl overflow-hidden min-h-[520px] lg:min-h-full group flex flex-col justify-between p-8 border border-white/10"
          >
            {/* Background Image */}
            <Image
              src="/images/partnerships/paper.png"
              alt="Implementation Partner"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/80 to-[#050B14]/40 z-10" />

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-between">
              <div>
                <span className="text-[#DDBE5C] text-xs font-mono tracking-widest uppercase font-semibold block mb-4">
                  IMPLEMENTATION PARTNER
                </span>
                <h3 className="text-2xl font-bold text-white leading-tight mb-4">
                  System integrators, consultancies, and transformation firms.
                </h3>
              </div>

              <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed font-normal mt-auto">
                Deploy ZoikoVertex for enterprise customers across workflow
                design, governance configuration, approval setup, integration,
                change management, and adoption. The highest-value partner
                motion — for organizations with enterprise delivery capability
                and security maturity.
              </p>
            </div>
          </motion.div>

          {/* Column 2 - Top Card: Technology Partner */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-xl overflow-hidden min-h-[250px] group p-6 flex flex-col justify-end border border-white/10"
          >
            <Image
              src="/images/partnerships/pen.png"
              alt="Technology Partner"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/70 to-transparent z-10" />

            <div className="relative z-20">
              <span className="text-[#20E7F2] text-[11px] font-mono tracking-widest uppercase font-semibold block mb-2">
                TECHNOLOGY PARTNER
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                SaaS, AI tooling, data, and platform vendors.
              </h3>
            </div>
          </motion.div>

          {/* Column 3 - Top Card: Agency Partner */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-xl overflow-hidden min-h-[250px] group p-6 flex flex-col justify-end border border-white/10"
          >
            <Image
              src="/images/partnerships/guy.png"
              alt="Agency Partner"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/70 to-transparent z-10" />

            <div className="relative z-20">
              <span className="text-[#20E7F2] text-[11px] font-mono tracking-widest uppercase font-semibold block mb-2">
                AGENCY PARTNER
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                Enterprise marketing, social, and brand agencies.
              </h3>
            </div>
          </motion.div>

          {/* Column 4 - Top Card: Integration Partner */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-xl overflow-hidden min-h-[250px] group p-6 flex flex-col justify-end border border-white/10"
          >
            <Image
              src="/images/partnerships/group.jpg"
              alt="Integration Partner"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/70 to-transparent z-10" />

            <div className="relative z-20">
              <span className="text-[#20E7F2] text-[11px] font-mono tracking-widest uppercase font-semibold block mb-2">
                INTEGRATION PARTNER
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                Connectors, CRM, ERP, DAM, CDP, and data systems.
              </h3>
            </div>
          </motion.div>

          {/* Column 2 & 3 Span - Bottom Left Card: Referral / Co-Sell */}
          <motion.div
            variants={itemVariants}
            className="relative lg:col-span-1 rounded-xl overflow-hidden min-h-[250px] group p-6 flex flex-col justify-end border border-white/10"
          >
            <Image
              src="/images/partnerships/laptop.jpg"
              alt="Referral / Co-Sell"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/70 to-transparent z-10" />

            <div className="relative z-20">
              <span className="text-[#20E7F2] text-[11px] font-mono tracking-widest uppercase font-semibold block mb-2">
                REFERRAL / CO-SELL
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                Advisors, consultants, and enterprise ecosystem vendors.
              </h3>
            </div>
          </motion.div>

          {/* Column 3 & 4 Span - Bottom Right Card: Strategic Alliance */}
          <motion.div
            variants={itemVariants}
            className="relative lg:col-span-1 rounded-xl overflow-hidden min-h-[250px] group p-6 flex flex-col justify-end border border-white/10"
          >
            <Image
              src="/images/partnerships/builidings.png"
              alt="Strategic Alliance"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/70 to-transparent z-10" />

            <div className="relative z-20">
              <span className="text-[#20E7F2] text-[11px] font-mono tracking-widest uppercase font-semibold block mb-2">
                STRATEGIC ALLIANCE
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug max-w-md">
                Global platforms, advisory firms, and enterprise service
                providers.
              </h3>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
