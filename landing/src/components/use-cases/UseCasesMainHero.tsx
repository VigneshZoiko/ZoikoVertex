"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface CTAButton {
  label: string;
  variant: "primary" | "outline";
}

const buttons: CTAButton[] = [
  { label: "Find Your Use Case", variant: "primary" },
  { label: "Book a Demo", variant: "outline" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
} as const;

const buttonVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

const imageVariants = {
  hidden: { opacity: 0, x: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" },
  },
} as const;

export default function UseCasesMainHero() {
  return (
    <div className="relative w-full overflow-hidden bg-[#060a12] px-6 py-24 sm:px-10 lg:px-16">
      {/* Radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(6,60,70,0.4) 0%, rgba(6,10,18,0) 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        {/* Left column */}
        <div>
          {/* Eyebrow label */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-5 flex items-center gap-3"
          >
            <span className="h-px w-6 bg-cyan-400" />
            <span className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400">
              ZOIKOVERTEX USE CASES
            </span>
          </motion.div>

          {/* Heading */}

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl mb-4 lg:text-[54px] max-w-110 font-bold tracking-tight text-white leading-[1.1]"
          >
            Governed AI execution for the workflows that{" "}
            <span className="text-[#20E7F2] text-[50px]">
              cannot afford to fail.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.2 }}
            className="mb-10 max-w-lg text-[14px] leading-relaxed text-slate-400"
          >
            See how ZoikoVertex helps teams automate high-value work, control AI
            agents, prove ROI, manage approvals, preserve evidence, and scale
            execution across marketing, retail, governance, and operations.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-wrap items-center gap-3"
          >
            {buttons.map((btn) => {
              if (btn.variant === "primary") {
                return (
                  <motion.button
                    key={btn.label}
                    variants={buttonVariants}
                    type="button"
                    className="rounded-lg bg-cyan-400 px-5 py-3 text-[13px] font-semibold text-[#0a0e1a] transition-colors hover:bg-cyan-300"
                  >
                    {btn.label}
                  </motion.button>
                );
              }

              return (
                <motion.button
                  key={btn.label}
                  variants={buttonVariants}
                  type="button"
                  className="rounded-lg border border-white/20 bg-transparent px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/5"
                >
                  {btn.label}
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Right column - Image */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={imageVariants}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl"
        >
          <Image
            src="/images/use-cases/hero.png"
            alt="Governed AI execution platform visualization"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </div>
    </div>
  );
}
