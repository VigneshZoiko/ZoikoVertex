"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HowWeRouteYou() {
  const tableData = [
    {
      select: "Agentic architecture & autonomous workflows",
      hearFrom: "Solutions Architect + Enterprise Sales",
    },
    {
      select: "Executive Command Center",
      hearFrom: "Executive Sales Specialist",
    },
    {
      select: "Approval workflows & governance",
      hearFrom: "Governance Specialist",
    },
    {
      select: "ROI Engine & business case",
      hearFrom: "Value Engineering",
    },
    {
      select: "Enterprise retail deployment",
      hearFrom: "Retail Solutions Lead",
    },
    {
      select: "Compliance, DPA, or security review",
      hearFrom: "Legal Ops + Security Review Queue",
    },
    {
      select: "Support request",
      hearFrom: "Routed to Support directly",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  } as const;

  const rowVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#F5F3EC] text-[#0D1526] py-20 px-6 sm:px-12 md:px-16 min-h-screen flex flex-col justify-center font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase">
              HOW WE ROUTE YOU
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl max-w-180 font-semibold tracking-tight text-[#0D1526] mb-4 max-w-3xl leading-[1.15]">
            Every inquiry reaches a specialist, not a queue.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#64748B] text-sm sm:text-base max-w-120 font-normal leading-relaxed">
            Select &ldquo;primary interest&rdquo; above, or use this as a guide
            to what each path covers.
          </p>
        </motion.div>

        {/* Table/List Container */}
        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-4 border-b border-[#E2E8F0] text-[11px] font-mono tracking-[0.15em] text-[#94A3B8] uppercase">
            <div className="md:col-span-6">YOU SELECT</div>
            <div className="md:col-span-6">YOU&apos;LL HEAR FROM</div>
          </div>

          {/* Table Rows */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-[#E2E8F0]"
          >
            {tableData.map((row, index) => (
              <motion.div
                key={index}
                variants={rowVariants}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 py-5 items-center group transition-colors duration-200 hover:bg-black/[0.015]"
              >
                {/* Left Column: YOU SELECT */}
                <div className="md:col-span-6 pr-4">
                  <span className="text-base font-semibold text-[#0D1526] leading-snug">
                    {row.select}
                  </span>
                </div>

                {/* Right Column: YOU'LL HEAR FROM + ARROW */}
                <div className="md:col-span-6 flex items-center justify-between gap-4">
                  <span className="text-sm text-[#64748B] font-normal">
                    {row.hearFrom}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#2DD4BF] shrink-0 transform group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
