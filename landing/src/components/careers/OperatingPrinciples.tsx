"use client";

import React from "react";
import { motion } from "framer-motion";

interface PrincipleItem {
  number: string;
  title: string;
  description: string;
}

const principles: PrincipleItem[] = [
  {
    number: "01",
    title: "Evidence over opinion",
    description:
      "When a decision has implications for the product or a customer, we default to what the evidence says — usage data, audit records, customer feedback, test results. Opinion is a starting point, not a conclusion.",
  },
  {
    number: "02",
    title: "Speed with control",
    description:
      "We move fast, but not at the cost of correctness, security, or customer trust. Shipping something that breaks evidence records or bypasses governance is not shipping faster — it is shipping damage.",
  },
  {
    number: "03",
    title: "Autonomy with accountability",
    description:
      "Team members have significant autonomy in their domain. That autonomy comes with responsibility for outcomes, decisions, and their downstream effects on the product and customers.",
  },
  {
    number: "04",
    title: "Customer trust before vanity",
    description:
      "We do not ship features to look impressive. We ship what makes customers' governance stronger, their execution more accountable, and their evidence more defensible. Vanity metrics are a distraction.",
  },
  {
    number: "05",
    title: "Clear writing",
    description:
      "We write decisions, designs, product specs, and customer communications in plain, direct language. If you cannot explain a governance behavior in writing, it is not ready to build.",
  },
  {
    number: "06",
    title: "Security by default",
    description:
      "Security is not a review item at the end of a feature. It is a design constraint from the start — access control, data minimization, audit logging, and evidence integrity are built in, not bolted on.",
  },
  {
    number: "07",
    title: "Owners, not passengers",
    description:
      "Every team member is an owner of the quality, reliability, and trustworthiness of what they build. Passing a problem to someone else without helping solve it is not how we operate.",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
} as const;

export default function OperatingPrinciples() {
  return (
    <section className="w-full bg-[#0C1422] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-4 h-[1.5px]"
              style={{ backgroundColor: "#C9A84CB2" }}
            />
            <span
              className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase"
              style={{ color: "#C9A84CB2" }}
            >
              OPERATING PRINCIPLES
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-xl leading-tight">
            How we work. Not what we aspire to.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed font-normal">
            These are behaviors we observe and hold each other to — not values
            statements on a wall.
          </p>
        </div>

        {/* 7-Row Bordered List Card */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-2xl border border-slate-800/80 bg-[#0B101D]/80 divide-y divide-slate-800/70 overflow-hidden shadow-2xl"
        >
          {principles.map((item) => (
            <motion.div
              key={item.number}
              variants={itemVariants}
              className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start hover:bg-[#0E1526]/50 transition-colors duration-150"
            >
              {/* Left Column: Number + Title */}
              <div className="md:col-span-5 flex items-start gap-4">
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#1E293B] shrink-0 leading-none pt-0.5 select-none">
                  {item.number}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                  {item.title}
                </h3>
              </div>

              {/* Right Column: Detailed Description */}
              <div className="md:col-span-7">
                <p className="text-xs sm:text-sm text-[#FFFFFF85] leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
