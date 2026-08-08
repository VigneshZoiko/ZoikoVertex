"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Code2, Cpu, Lightbulb, Link2, BarChart2, Users } from "lucide-react";

interface HireCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  imageSrc: string;
}

const hireCards: HireCard[] = [
  {
    id: "engineers",
    icon: Code2,
    title: "Engineers who ship reliable systems",
    description:
      "You build platform infrastructure that holds up under enterprise scrutiny — approvals, evidence, audit, and workflow coordination designed for scale and accountability.",
    imageSrc: "/images/careers/code.png",
  },
  {
    id: "ai-ml",
    icon: Cpu,
    title: "AI/ML builders who respect governance",
    description:
      "You build and constrain agents with intentionality — understanding that in enterprise settings, how AI is controlled matters as much as what it produces.",
    imageSrc: "/images/careers/boys.png",
  },
  {
    id: "product",
    icon: Lightbulb,
    title: "Product thinkers who reduce complexity",
    description:
      "You translate enterprise governance requirements into product experiences that feel clear and fast, not bureaucratic. You understand that good UX is a trust mechanism.",
    imageSrc: "/images/careers/office.png",
  },
  {
    id: "designers",
    icon: Link2,
    title: "Designers who make trust visible",
    description:
      "You understand that enterprise software must communicate control, evidence, and accountability — not just look polished. Clarity is the design outcome, not decoration.",
    imageSrc: "/images/careers/meet.png",
  },
  {
    id: "gtm",
    icon: BarChart2,
    title: "GTM operators who sell with evidence",
    description:
      "You understand that enterprise sales is built on credibility, specificity, and proof. You can hold a conversation about governance, auditability, and ROI with a CIO.",
    imageSrc: "/images/careers/pc.png",
  },
  {
    id: "customer-teams",
    icon: Users,
    title: "Customer teams who protect adoption",
    description:
      "You don't just handle support — you build adoption. You understand governance workflows deeply enough to help customers configure them with confidence and evidence.",
    imageSrc: "/images/careers/girl.png",
  },
];

const fitTraits = [
  "Precise",
  "Accountable",
  "Curious about governance",
  "Calm under ambiguity",
  "Serious about enterprise trust",
  "Evidence-driven",
  "Fast but careful",
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

export default function WhoWeHire() {
  return (
    <section className="w-full bg-[#06090F] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
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
            <span className="w-4 h-[1.5px] bg-[#20E7F2]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#20E7F2]">
              WHO WE HIRE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight max-w-3xl">
            Precise builders.
            <br />
            Accountable operators.
            <br />
            People who care about trust.
          </h2>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {hireCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0B101D] flex flex-col justify-between"
              >
                {/* Image Container with Top-to-Bottom Gradient Blend */}
                <div className="relative w-full h-48 overflow-hidden">
                  <Image
                    src={card.imageSrc}
                    alt={card.title}
                    fill
                    className="object-cover object-center grayscale contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B101D] via-[#0B101D]/40 to-transparent" />
                </div>

                {/* Card Content Body */}
                <div className="p-6 pt-0 relative z-10 flex-1 flex flex-col">
                  {/* Icon Badge */}
                  <div className="w-9 h-9 rounded-xl bg-[#0F222F] border border-[#20E7F2]/30 flex items-center justify-center text-[#20E7F2] mb-4 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug mb-2">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#8EA0B8] leading-relaxed font-normal">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Fit Criteria Pill Container */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-2xl border border-slate-800/80 bg-[#0B101D]/70 p-6 sm:p-8"
        >
          {/* Eyebrow label in amber/gold color */}
          <div className="mb-4">
            <span
              className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "#C9A84CB2" }}
            >
              YOU MAY BE A FIT IF YOU ARE
            </span>
          </div>

          {/* Pill Badges */}
          <div className="flex flex-wrap gap-2.5">
            {fitTraits.map((trait) => (
              <span
                key={trait}
                className="font-mono text-xs text-[#94A3B8] bg-[#101726] border border-slate-800/90 px-4 py-2 rounded-full hover:border-slate-700 hover:text-white transition-colors duration-150"
              >
                {trait}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
