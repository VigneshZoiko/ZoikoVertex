"use client";

import React from "react";
import { motion } from "framer-motion";

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

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface StepItem {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

const stepsData: StepItem[] = [
  {
    id: "step-01",
    stepNumber: "STEP 01",
    title: "Download & align",
    description:
      "Share the buyer guide with your committee to align on evaluation criteria.",
    ctaText: "Download Buyer Guide",
    ctaHref: "#",
  },
  {
    id: "step-02",
    stepNumber: "STEP 02",
    title: "See it in action",
    description:
      "Watch the demo mapped to your role — governance, workflows, or auditability.",
    ctaText: "Watch a demo",
    ctaHref: "#",
  },
  {
    id: "step-03",
    stepNumber: "STEP 03",
    title: "Prove the case",
    description:
      "Run the ROI & Governance Audit and book a guided evaluation with our team.",
    ctaText: "Book guided evaluation",
    ctaHref: "#",
  },
];

export default function GuidedDemoPathSection() {
  return (
    <section className="relative min-h-[600px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              GUIDED DEMO PATH
            </span>
            <span className="w-4 h-[2px] bg-cyan-400"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            From guide to demo to decision.
          </h2>
        </div>

        {/* 3 Step Cards Grid */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stepsData.map((step) => (
            <motion.div
              key={step.id}
              variants={cardVariants}
              className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-[#7AA0BE24] hover:border-slate-700 hover:bg-[#131C2B]/80 transition-all duration-300 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
              <div>
                {/* Step Number */}
                <span className="text-xs font-mono font-bold text-[#20E7F2] tracking-wider uppercase block mb-3">
                  {step.stepNumber}
                </span>

                {/* Step Title */}
                <h3 className="text-xl font-bold text-slate-100 mb-3 tracking-tight group-hover:text-white transition-colors">
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              {/* Action Link */}
              <div>
                <a
                  href={step.ctaHref}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#20E7F2] hover:text-cyan-300 transition-colors group/link"
                >
                  <span>{step.ctaText}</span>
                  <span className="group-hover/link:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
