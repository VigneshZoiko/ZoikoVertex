"use client";

import React from "react";
import { motion } from "framer-motion";

export default function RegulatedIndustryRolesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const roles = [
    {
      role: "CHIEF COMPLIANCE OFFICER",
      headline: "AI marketing governance aligned with regulatory obligations.",
      description:
        "Compliance policy rules, approval routing, evidence capture, and regulatory reporting — in one governed platform across the marketing organisation.",
      image: "/images/competeter-benchmark/legal.png",
    },
    {
      role: "LEGAL COUNSEL",
      headline:
        "Evidence on demand for regulatory inquiry and legal proceedings.",
      description:
        "Exportable evidence bundles — policy check outcomes, approval decisions, final artifacts — without manual document reconstruction.",
      image: "/images/competeter-benchmark/cmo.png",
    },
    {
      role: "CMO",
      headline: "AI marketing velocity without compliance exposure.",
      description:
        "Move at AI speed in regulated markets without bypassing the compliance controls that protect the business and the brand.",
      image: "/images/competeter-benchmark/coa.png",
    },
    {
      role: "CIO / CTO",
      headline:
        "AI governance infrastructure that meets enterprise IT standards.",
      description:
        "SSO, tenant isolation, audit event export, DPA execution, and data residency controls — meeting the technical requirements of regulated enterprise deployments.",
      image: "/images/competeter-benchmark/co.png",
    },
    {
      role: "PROCUREMENT & RISK",
      headline:
        "AI governance evidence that satisfies procurement requirements.",
      description:
        "Enterprise procurement processes in regulated sectors increasingly require AI governance documentation. ZoikoVertex produces it by design.",
      image: "/images/competeter-benchmark/cto.png",
    },
    {
      role: "MARKETING OPERATIONS",
      headline:
        "Governed campaign execution that keeps pace with compliance obligations.",
      description:
        "Structured workflows, compliance-first approval routing, and evidence capture — without the operational overhead of manual compliance management.",
      image: "/images/competeter-benchmark/man.png",
    },
  ];

  return (
    <section className="relative w-full bg-[#080C10] text-white py-16 overflow-hidden">
      <motion.div
        className="w-full flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section bounded by max-w-6xl */}
        <div className="max-w-6xl w-full mx-auto">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              REGULATED INDUSTRY ROLES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white"
          >
            The roles that carry compliance accountability in regulated
            marketing.
          </motion.h2>
        </div>

        {/* Full-width Seamless Bento/Strip Container */}
        <motion.div
          variants={itemVariants}
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {roles.map((item, index) => (
            <div
              key={index}
              className="relative group min-h-[460px] sm:min-h-[500px] bg-[#0B1117] flex flex-col justify-end p-5 sm:p-6"
            >
              {/* Background Image */}
              <img
                src={item.image}
                alt={item.role}
                className="absolute inset-0 w-full h-full object-cover contrast-110 transition-transform duration-500"
              />

              {/* Dark Overlay Gradient for Text Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-end h-full">
                <span className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-[#00E5FF] mb-2.5 block">
                  {item.role}
                </span>

                <h3 className="text-xs sm:text-sm font-bold leading-snug mb-2 text-white">
                  {item.headline}
                </h3>

                <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
