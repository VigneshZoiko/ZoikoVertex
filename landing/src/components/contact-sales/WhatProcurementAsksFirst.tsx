"use client";

import React from "react";
import { motion } from "framer-motion";

export default function WhatProcurementAsksFirst() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
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

  const steps = [
    {
      number: "01",
      title: "Data handling",
      description:
        "Details go to CRM for routing only. Marketing opt-in is a separate, unticked checkbox.",
    },
    {
      number: "02",
      title: "Security review",
      description:
        "SOC 2 Type II and ISO 27001 documentation available on request once NDA is in place.",
    },
    {
      number: "03",
      title: "Contracting",
      description:
        "DPA and security whitepaper ready for legal review before your first call, not after.",
    },
    {
      number: "04",
      title: "Retention",
      description:
        "Lead data retained per CRM policy. Deletion requests are honored on request.",
    },
  ];

  return (
    <section className="w-full bg-[#F5F3EC] text-[#0D1526] py-20 px-6 sm:px-12 md:px-16 lg:px-24 min-h-screen flex flex-col justify-center font-sans antialiased">
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
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              BEFORE YOU TALK TO US
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#0D1526] max-w-120 leading-[1.15]">
            What procurement and security ask first.
          </h2>
        </motion.div>

        {/* 4-Column Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col items-start"
            >
              {/* Pill Number Badge */}
              <div className="w-7 h-7 rounded-full border border-[#0D1526]/20 flex items-center justify-center text-xs font-mono font-medium text-[#0D1526] mb-6 bg-transparent">
                {step.number}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-[#0D1526] mb-3 leading-snug">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-[#64748B] text-sm leading-relaxed font-normal">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
