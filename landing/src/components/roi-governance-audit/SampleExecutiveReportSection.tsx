"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

const graphicVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
  },
} as const;

interface ReportFeature {
  id: string;
  tag: string;
  title: string;
  description: string;
}

const reportFeatures: ReportFeature[] = [
  {
    id: "roi-summary",
    tag: "F1",
    title: "ROI summary",
    description: "Savings range, payback, and hours recovered.",
  },
  {
    id: "governance-readiness-score",
    tag: "F2",
    title: "Governance readiness score",
    description: "Maturity tier with control-by-control breakdown.",
  },
  {
    id: "risk-exposure-map",
    tag: "F3",
    title: "Risk exposure map",
    description: "Where unmanaged AI creates brand and compliance risk.",
  },
  {
    id: "recommendations",
    tag: "F4",
    title: "Recommendations",
    description: "Prioritized controls to close the largest gaps.",
  },
  {
    id: "implementation-path",
    tag: "F5",
    title: "Implementation path",
    description: "Pilot scope, rollout stages, and procurement notes.",
  },
];

export default function SampleExecutiveReportSection() {
  return (
    <section className="relative w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-20 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-950/15 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-[500px] h-[300px] bg-blue-950/15 blur-[150px] pointer-events-none rounded-full" />

      <motion.div
        className="max-w-[1240px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Column Content */}
        <div className="lg:col-span-6 flex flex-col items-start">
          {/* Eyebrow Label */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              SAMPLE EXECUTIVE REPORT
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            variants={itemVariants}
            className="text-4xl lg:text-[40px] font-bold tracking-tight text-white mb-6 leading-[1.15]"
          >
            A shareable business case, not <br />a score.
          </motion.h2>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mb-10 font-normal"
          >
            The audit generates a report your team can circulate through
            finance, risk, and procurement — with the assumptions kept
            transparent.
          </motion.p>

          {/* Feature List with Border Dividers */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-lg flex flex-col"
          >
            {reportFeatures.map((feature, idx) => (
              <div
                key={feature.id}
                className={`flex items-start gap-4 py-4 ${
                  idx !== reportFeatures.length - 1
                    ? "border-b border-slate-800/80"
                    : ""
                }`}
              >
                <span className="text-[11px] font-mono font-bold text-cyan-400 mt-0.5 min-w-[20px]">
                  {feature.tag}
                </span>
                <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-slate-100 mb-1 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column Image */}
        <motion.div
          className="lg:col-span-6 w-full flex justify-center lg:justify-end"
          variants={graphicVariants}
        >
          <div className="relative w-full max-w-[580px] rounded-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <Image
              src="/images/roi-governance-audit/report.png"
              alt="Sample Executive Report Illustration"
              width={602}
              height={404}
              className="w-full h-auto object-cover block"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
