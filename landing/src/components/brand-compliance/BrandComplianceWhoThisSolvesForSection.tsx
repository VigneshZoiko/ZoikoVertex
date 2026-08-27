"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function BrandComplianceWhoThisSolvesForSection() {
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
      role: "CMO",
      headline: "Brand consistency at AI execution speed.",
      description:
        "AI accelerates campaign velocity. ZoikoVertex ensures brand standards scale with it — across every channel, region, and agency.",
      image: "/images/competeter-benchmark/cmo.png",
    },
    {
      role: "LEGAL & COMPLIANCE",
      headline: "Regulated claims caught before they reach market.",
      description:
        "Claims, pricing, disclosures, and category-specific compliance rules checked at the workflow layer — not discovered after publication.",
      image: "/images/competeter-benchmark/legal.png",
    },
    {
      role: "BRAND MANAGER",
      headline: "Brand rules that actually travel with AI-generated content.",
      description:
        "Tone, vocabulary, and messaging guidelines enforced at the generation layer — not communicated in a style guide and hoped for.",
      image: "/images/competeter-benchmark/co.png",
    },
    {
      role: "COO & OPERATIONS",
      headline: "Brand governance without operational bottlenecks.",
      description:
        "Policy checks reduce the escalations that slow marketing operations — catching issues before they reach legal or senior review.",
      image: "/images/competeter-benchmark/coa.png",
    },
    {
      role: "REGIONAL MARKETING",
      headline: "Local execution under central brand governance.",
      description:
        "Regional content moves at local speed with central brand rules enforced — not a choice between relevance and compliance.",
      image: "/images/competeter-benchmark/cto.png",
    },
    {
      role: "AGENCY PARTNERS",
      headline: "Client brand standards built into agency workflows.",
      description:
        "Agency-produced content checked against client brand rules before delivery — reducing revision cycles and brand dispute risk.",
      image: "/images/competeter-benchmark/man.png",
    },
  ];

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-16 overflow-hidden">
      <motion.div
        className="w-full flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section bounded by max-w-6xl */}
        <div className="max-w-6xl w-full mx-auto px-6 sm:px-10 lg:px-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3.5"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
              WHO THIS SOLVES FOR
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl max-w-140 lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white max-w-2xl"
          >
            Every role that carries brand and compliance responsibility.
          </motion.h2>
        </div>

        {/* Full-width Seamless Bento Grid */}
        <motion.div
          variants={itemVariants}
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-px bg-white/10 overflow-hidden border-y border-white/10"
        >
          {roles.map((item, index) => (
            <div
              key={index}
              className="relative group min-h-[480px] sm:min-h-[520px] bg-[#0C1422] flex flex-col justify-end p-5 sm:p-6 overflow-hidden"
            >
              {/* Background Image */}
              <Image
                src={item.image}
                alt={item.role}
                fill
                className="absolute inset-0 w-full h-full object-cover object-center contrast-125 transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark Gradient Overlay for Typography Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30 z-[1]" />

              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-end h-full">
                <span className="text-[11px] font-mono tracking-[0.15em] uppercase text-[#00E5FF] mb-2 block leading-none font-semibold">
                  {item.role}
                </span>

                <h3 className="text-base font-bold leading-snug mb-2 text-white">
                  {item.headline}
                </h3>

                <p className="text-[14px] max-w-50 text-gray-400 leading-relaxed font-normal">
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