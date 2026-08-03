"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Clock, TrendingUp, RefreshCw, ShieldCheck } from "lucide-react";

interface DriverCard {
  title: string;
  description: string;
  formula: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  imageSrc: string;
}

const valueDrivers: DriverCard[] = [
  {
    title: "Labor efficiency",
    description:
      "Current effort × automation reduction × loaded cost. Captures drafting, routing, review, evidence capture, and reporting time.",
    formula: "Effort hours × reduction % × hourly rate",
    icon: Clock,
    iconBg: "bg-[#20E7F2]/10 border-[#20E7F2]/30",
    iconColor: "text-[#20E7F2]",
    imageSrc: "/images/roi-engine/labour.png",
  },
  {
    title: "Cycle-time value",
    description:
      "Baseline duration minus projected governed workflow duration. Approval SLA, handoff count, publishing delay, escalation history.",
    formula: "Days saved × campaigns/mo × opportunity value",
    icon: TrendingUp,
    iconBg: "bg-[#C9A84C]/10 border-[#C9A84C]/30",
    iconColor: "text-[#C9A84C]",
    imageSrc: "/images/roi-engine/cycle.png",
  },
  {
    title: "Rework reduction",
    description:
      "Current rework rate × expected reduction from policy and approval controls. Captures revision count, rejection reasons, and exception costs.",
    formula: "Rework rate × reduction % × cycle cost",
    icon: RefreshCw,
    iconBg: "bg-[#00D284]/10 border-[#00D284]/30",
    iconColor: "text-[#00D284]",
    imageSrc: "/images/roi-engine/rework.png",
  },
  {
    title: "Governance readiness",
    description:
      "Audit prep hours + evidence search hours + compliance review friction. Quantifies the cost of unstructured evidence and manual audit work.",
    formula: "Audit hours × reduction % × loaded cost",
    icon: ShieldCheck,
    iconBg: "bg-[#FF5C5C]/10 border-[#FF5C5C]/30",
    iconColor: "text-[#FF5C5C]",
    imageSrc: "/images/roi-engine/paper.png",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoValueDriversSection() {
  return (
    <section className="relative w-full bg-[#0C1422] py-16 md:py-24 px-6 font-sans text-white">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* Section Header */}
        <div className="space-y-3">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="h-px w-6 bg-[#20E7F2]" />
            <span className="text-xs font-mono tracking-widest text-[#20E7F2] uppercase">
              VALUE DRIVERS
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-xl leading-tight"
          >
            How the model calculates value across four dimensions.
          </motion.h2>
        </div>

        {/* 4-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {valueDrivers.map((driver, index) => {
            const Icon = driver.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#0f1723]/80 rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all duration-300 group"
              >
                {/* Top Image Preview Area with Grayscale Filter & Fade Overlay */}
                <div className="relative w-full h-40 bg-[#162032] overflow-hidden">
                  <img
                    src={driver.imageSrc}
                    alt={driver.title}
                    className="w-full h-full object-cover grayscale group-hover:scale-105 transition-all duration-500"
                  />
                  {/* Bottom Gradient Overlay for Smooth Transition */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1723] via-[#0f1723]/30 to-transparent" />
                </div>

                {/* Card Content */}
                <div className="p-6 pt-0 flex-1 flex flex-col justify-between space-y-5 -mt-6 relative z-10">
                  <div className="space-y-4">
                    {/* Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border ${driver.iconBg}`}
                    >
                      <Icon className={`w-4 h-4 ${driver.iconColor}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {driver.title}
                    </h3>

                    {/* Description Paragraph */}
                    <p className="text-xs leading-relaxed text-[#ffffff80]">
                      {driver.description}
                    </p>
                  </div>

                  {/* Formula Code Footer */}
                  <div className="pt-2">
                    <p className="text-[11px] max-w-40 font-mono text-[#20E7F2] leading-tight">
                      {driver.formula}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
