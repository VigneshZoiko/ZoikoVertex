"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  progressColor?: string;
  progressWidth?: string;
  hasBorder?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  progressColor,
  progressWidth,
  hasBorder = true,
}) => {
  return (
    <div
      className={`flex flex-col justify-between p-6 h-full ${
        hasBorder ? "border-r border-[#162235]" : ""
      }`}
    >
      <div className="space-y-4">
        {/* Label */}
        <div className="text-[10px] font-mono font-medium text-[#5E6E82] uppercase tracking-[0.15em]">
          {label}
        </div>

        {/* Metric Value */}
        <div className="text-[32px] md:text-[36px] font-bold text-[#00F3FF] tracking-tight font-mono leading-none">
          {value}
        </div>

        {/* Subtext */}
        <p className="text-[11px] font-mono text-[#5E6E82] leading-relaxed">
          {subtext}
        </p>
      </div>

      {/* Progress Bar (if available) */}
      {progressWidth && progressColor && (
        <div className="w-full bg-[#111C2D] h-[3px] rounded-full overflow-hidden mt-6">
          <div
            className={`h-full ${progressColor}`}
            style={{ width: progressWidth }}
          />
        </div>
      )}
    </div>
  );
};

const cardContainerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function IntegrationHealthObservability() {
  return (
    <section className="relative w-full bg-[#03060C] text-[#8E9B9E] font-sans antialiased px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-28 flex items-center justify-center overflow-hidden">
      <div className="max-w-[1240px] w-full space-y-12 z-10">
        {/* Header Section */}
        <motion.header
          className="space-y-3 max-w-3xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center space-x-2 text-[#D9A755] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
            <span className="w-4 h-[1px] bg-[#D9A755]/80 inline-block -translate-y-[1px]" />
            <span>INTEGRATION HEALTH & OBSERVABILITY</span>
          </div>

          <h2 className="text-[32px] leading-[1.15] md:text-[46px] font-bold text-white tracking-[-0.02em]">
            A control center, not a one-time setup.
          </h2>

          <p className="text-[14px] leading-[1.6] text-[#8E9AAB] font-normal pt-1">
            Every connected system stays observable — so silent failures don't
            become workflow disruptions, and gaps become expansion paths.
          </p>
        </motion.header>

        {/* Observability Dashboard Card */}
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
          className="bg-[#0B1320] border border-[#162235] rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Card Top Bar */}
          <div className="px-6 py-4 border-b border-[#162235] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#5E6E82] tracking-[0.15em] uppercase font-medium">
              WORKSPACE - INTEGRATION HEALTH
            </span>

            <div className="flex items-center space-x-2 font-mono text-[11px] text-[#00F3FF]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F3FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F3FF]" />
              </span>
              <span>All systems nominal - synthetic</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 divide-[#162235]">
            <MetricCard
              label="CONNECTED SYSTEMS"
              value="18"
              subtext="active this workspace"
            />

            <MetricCard
              label="SYNC HEALTH"
              value="99.6%"
              subtext="success · low latency"
              progressColor="bg-[#10B981]"
              progressWidth="90%"
            />

            <MetricCard
              label="TOKEN STATUS"
              value="2"
              subtext="expiring in 14 days"
            />

            <MetricCard
              label="EVIDENCE COVERAGE"
              value="94%"
              subtext="governed events linked"
              progressColor="bg-[#00F3FF]"
              progressWidth="75%"
            />

            <MetricCard
              label="USAGE EXPANSION"
              value="3"
              subtext="recommended connectors"
              hasBorder={false}
            />
          </div>
        </motion.div>

        {/* CTA Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-2"
        >
          <a
            href="#"
            className="inline-flex items-center text-[12px] font-mono text-[#D9A755] hover:underline tracking-tight"
          >
            Monitor integration health →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
