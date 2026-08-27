"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

type Layer = {
  id: number;
  icon: string;
  title: string;
  description: string;
  colors: {
    border: string;
    background: string;
  };
};

const layers: Layer[] = [
  {
    id: 1,
    icon: "/images/audit-engine/Audit-Trail.png",
    title: "Audit Trail",
    description:
      "Every system event — AI actions, approvals, policy triggers, integrations — timestamped, actor-linked, and retrievable.",
    colors: {
      border: "border-[#20E7F2]/30",
      background: "bg-[#0B1E28]",
    },
  },
  {
    id: 2,
    icon: "/images/audit-engine/Decision-Ledger.png",
    title: "Decision Ledger",
    description:
      "Why approvals were made, rejections issued, overrides granted, and exceptions recorded — not just what happened.",
    colors: {
      border: "border-[#E2A03F]/30",
      background: "bg-[#252319]",
    },
  },
  {
    id: 3,
    icon: "/images/audit-engine/Evidence-Vault.png",
    title: "Evidence Vault",
    description:
      "Sealed evidence packages per campaign — prompts, outputs, approvals, publish confirmations, and export bundles.",
    colors: {
      border: "border-[#25CA7B]/30",
      background: "bg-[#142621]",
    },
  },
  {
    id: 4,
    icon: "/images/audit-engine/Forensic-Hub.png",
    title: "Forensic Hub + Identity Ledger",
    description:
      "Cross-referenced forensic reconstruction and identity binding for every privileged action and governance decision.",
    colors: {
      border: "border-[#A855F7]/30",
      background: "bg-[#201B2E]",
    },
  },
];

export default function AuditEngineLayersStrip() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
    <section className="relative w-full bg-[#111D2E] px-10 text-white border-t border-b border-white/10">
      <motion.div
        className="relative z-10 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-h-[200px]"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {layers.map((layer, index) => (
          <motion.div
            key={layer.id}
            variants={itemVariants}
            className={`flex flex-col justify-start px-6 py-8 border-b sm:border-b-0 border-white/10 ${
              index !== layers.length - 1 ? "lg:border-r" : ""
            }`}
          >
            {/* Icon Container */}
            <div
              className={`w-10 h-10 rounded-lg ${layer.colors.background} ${layer.colors.border} border flex items-center justify-center mb-4 flex-shrink-0`}
            >
              <Image
                src={layer.icon}
                alt=""
                aria-hidden="true"
                width={18}
                height={18}
                className="max-w-[18px] max-h-[18px]"
              />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold tracking-tight leading-snug mb-2 text-white">
              {layer.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-gray-400 leading-relaxed font-normal">
              {layer.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
