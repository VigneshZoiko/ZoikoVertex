"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const PILL_COLORS = {
  cyan: "border-[#20E7F2]/40 text-[#20E7F2] bg-[#20E7F2]/5",
  amber: "border-[#E2A03F]/40 text-[#E2A03F] bg-[#E2A03F]/5",
  violet: "border-[#A855F7]/40 text-[#A855F7] bg-[#A855F7]/5",
  green: "border-[#25CA7B]/40 text-[#25CA7B] bg-[#25CA7B]/5",
} as const;

type PillColor = keyof typeof PILL_COLORS;

const events: {
  event: string;
  captured: string;
  layer: string;
  color: PillColor;
}[] = [
  {
    event: "AI agent task",
    captured: "Prompt, model, output, risk score, task status",
    layer: "Vault + Trail",
    color: "cyan",
  },
  {
    event: "Approval action",
    captured: "Approver identity, decision, rationale, timestamp",
    layer: "Ledger + Vault",
    color: "amber",
  },
  {
    event: "Policy trigger",
    captured: "Rule matched, severity, content flagged, reviewer",
    layer: "Trail + Vault",
    color: "cyan",
  },
  {
    event: "Override / exception",
    captured:
      "Override actor, authority basis, justification, risk accepted",
    layer: "Ledger + Identity",
    color: "violet",
  },
  {
    event: "Integration event",
    captured: "Platform, endpoint, payload hash, success/fail, retry",
    layer: "Trail + Vault",
    color: "cyan",
  },
  {
    event: "User access action",
    captured: "Identity, role, session, action type, resource accessed",
    layer: "Identity + Trail",
    color: "violet",
  },
  {
    event: "Configuration change",
    captured: "What changed, previous state, actor authority, approval",
    layer: "Ledger + Identity",
    color: "amber",
  },
  {
    event: "Legal hold / export",
    captured: "Hold scope, requester, expiry override, export bundle ID",
    layer: "Vault + Trail",
    color: "green",
  },
];

export default function AuditEngineEventTypesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
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

  return (
    <section className="relative w-full bg-[#0C1422] text-white overflow-hidden">
      <motion.div
        className="w-full grid grid-cols-1 lg:grid-cols-2 min-h-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {/* Left Column - Full-bleed Image */}
        <div className="relative w-full min-h-[360px] lg:min-h-0 lg:h-full overflow-hidden">
          <Image
            src="/images/audit-engine/WHAT-GETS-CAPTURED.png"
            alt="Governed operations floor"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Right Column - Event Capture Table */}
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12 lg:py-16">
          {/* Eyebrow */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#20E7F2]">
              WHAT GETS CAPTURED
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight leading-[1.2] mb-4 text-white max-w-md"
          >
            Every event type. Every evidence layer it creates.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-[13px] text-gray-400 leading-relaxed font-normal mb-9 max-w-md"
          >
            The Audit Engine captures events across every operational layer and
            routes them to the appropriate evidence components automatically.
          </motion.p>

          {/* Column Headers */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-[minmax(90px,110px)_1fr_auto] gap-x-4 sm:gap-x-6 pb-3"
          >
            <span className="text-[8.5px] font-mono tracking-[0.18em] uppercase text-gray-500">
              Event Type
            </span>
            <span className="text-[8.5px] font-mono tracking-[0.18em] uppercase text-gray-500">
              Evidence Created
            </span>
            <span className="text-[8.5px] font-mono tracking-[0.18em] uppercase text-gray-500">
              Layer
            </span>
          </motion.div>

          {/* Event Rows */}
          <div className="flex flex-col">
            {events.map((row, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="grid grid-cols-[minmax(90px,110px)_1fr_auto] gap-x-4 sm:gap-x-6 items-center py-2.5"
              >
                <span className="text-[10.5px] font-mono text-[#20E7F2] leading-snug">
                  {row.event}
                </span>

                <span className="text-[10.5px] text-gray-400 leading-snug font-normal">
                  {row.captured}
                </span>

                <span
                  className={`justify-self-end whitespace-nowrap px-2.5 py-[3px] rounded-full border text-[8.5px] font-mono ${
                    PILL_COLORS[row.color]
                  }`}
                >
                  {row.layer}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
