"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface RoleCard {
  id: string;
  roleTag: string;
  title: string;
  description: string;
  imageSrc?: string; // Optional so card 1 can remain solid dark
}

const roleCards: RoleCard[] = [
  {
    id: "ceos-coos",
    roleTag: "FOR CEOS & COOS",
    title: "See execution, risk, and ROI from one operating layer.",
    description:
      "Not a project board. A governed execution command center with accountability at every node.",
    // First card: pure dark background (no image)
  },
  {
    id: "cmos",
    roleTag: "FOR CMOS",
    title:
      "Scale campaigns without losing brand control or approval discipline.",
    description:
      "AI accelerates content. Approval workflows protect accountability. Evidence closes disputes.",
    imageSrc: "/images/competeter-benchmark/cmo.png",
  },
  {
    id: "cios-ctos",
    roleTag: "FOR CIOS & CTOS",
    title:
      "Govern agents, workflows, integrations, and evidence without fragmented tooling.",
    description:
      "One architecture. Policy gates, identity binding, audit trails, and integration fabric together.",
    imageSrc: "/images/competeter-benchmark/cto.png",
  },
  {
    id: "cisos-legal",
    roleTag: "FOR CISOS & LEGAL",
    title: "Preserve auditability, evidence, identity, and legal hold support.",
    description:
      "Forensic Hub, Evidence Vault, Identity Ledger, and legal hold controls in one governed model.",
    imageSrc: "/images/competeter-benchmark/legal.png",
  },
  {
    id: "procurement",
    roleTag: "FOR PROCUREMENT",
    title: "Evaluate using a structured matrix — not vendor claims.",
    description:
      "Benchmark rubric, procurement checklist, DPA, and governance documentation available on request.",
    imageSrc: "/images/competeter-benchmark/man.png",
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
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function WhyItMattersByRole() {
  return (
    <section className="w-full bg-[#080C14] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-7xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#00D2B4]">
              WHY IT MATTERS BY ROLE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl">
            The right case for every enterprise buyer.
          </h2>
        </div>

        {/* 5-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 p-2 backdrop-blur-md">
          {roleCards.map((card) => (
            <motion.div
              key={card.id}
              variants={itemVariants}
              className="relative group overflow-hidden min-h-[460px] flex flex-col justify-end p-6"
            >
              {/* Background Image & Overlay Gradient (Only rendered if imageSrc exists) */}
              {card.imageSrc ? (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={card.imageSrc}
                    alt={card.roleTag}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  {/* Heavy dark gradient overlay from bottom to top for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/85 to-[#080C14]/40" />
                </div>
              ) : (
                /* Pure dark card background for Card 1 */
                <div className="absolute inset-0 z-0 bg-[#0B0F19]" />
              )}

              {/* Content Container */}
              <div className="relative z-10">
                {/* Role Label */}
                <div className="mb-3">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[#00D2B4] uppercase">
                    {card.roleTag}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-base max-w-40 font-bold text-white tracking-tight leading-snug mb-3">
                  {card.title}
                </h3>

                {/* Card Subtitle / Description */}
                <p className="text-[14px] max-w-45 text-[#FFFFFF80] leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
