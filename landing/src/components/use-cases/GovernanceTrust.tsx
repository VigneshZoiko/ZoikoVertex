"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ElementType } from "react";
import {
  Contrast,
  MoveRight,
  ShieldCheck,
  FileText,
  Clock,
  Scale,
  ArrowRight,
} from "lucide-react";

interface FeatureCard {
  icon: ElementType;
  title: string;
  description: string;
}

interface FooterLink {
  label: string;
}

const cards: FeatureCard[] = [
  {
    icon: Contrast,
    title: "Role-based access",
    description:
      "Scope who can act, approve, and view across teams and workspaces.",
  },
  {
    icon: MoveRight,
    title: "Approval workflows",
    description:
      "Structured routing, reviewer roles, and escalation before anything ships.",
  },
  {
    icon: ShieldCheck,
    title: "Policy controls",
    description:
      "Brand, compliance, and safety rules enforced on every agent action.",
  },
  {
    icon: FileText,
    title: "Evidence capture",
    description: "Decisions, rationale, and outputs preserved as work happens.",
  },
  {
    icon: Clock,
    title: "Retention rules",
    description:
      "Configurable retention and legal-hold status for regulated workflows.",
  },
  {
    icon: Scale,
    title: "Audit trail",
    description:
      "Identity-bound, timestamped record ready for security and procurement.",
  },
];

const footerLinks: FooterLink[] = [
  { label: "Compliance & Governance" },
  { label: "Responsible AI" },
  { label: "Auditability" },
  { label: "Data Processing Addendum" },
  { label: "Contact Sales" },
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
      delayChildren: 0.25,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

export default function GovernanceTrust() {
  return (
    <div className="min-h-screen w-full bg-[#0B1524] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-5 flex items-center justify-center gap-3"
        >
          <span className="h-px w-6 bg-amber-400" />
          <span className="text-[11px] font-semibold tracking-[0.25em] text-amber-400">
            GOVERNANCE &amp; TRUST
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-6 text-center text-[32px] font-bold leading-tight text-white sm:text-[38px]"
        >
          Controlled AI execution — not unmonitored automation.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.15 }}
          className="mx-auto mb-16 max-w-2xl text-center text-[14px] leading-relaxed text-slate-400"
        >
          Every use case can be governed through the same controls, so buyers
          never trade speed for accountability.
        </motion.p>

        {/* Feature Cards Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={cardVariants}
                className="rounded-2xl border border-white/10 bg-[#0d1220] p-6"
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                  <Icon
                    className="h-4.5 w-4.5 text-[#E8B768]"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="mb-2 text-[15px] font-bold text-white">
                  {card.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-400">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Callout */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-amber-400/20 bg-[#E8B7680D] px-8 py-10 sm:px-12"
        >
          <div className="mb-8 rounded-xl border border-white/10">
            <p className="text-center text-[19px] font-bold leading-snug sm:text-[22px]">
              <span className="text-[#E8B768]">
                Automation where appropriate.
              </span>{" "}
              <span className="text-white">
                Human authority where required.
              </span>{" "}
              <span className="text-[#E8B768]">Evidence always.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {footerLinks.map((link) => {
              return (
                <a
                  key={link.label}
                  href="#"
                  className="group flex items-center gap-1.5 text-[12.5px] text-slate-400 transition-colors hover:text-slate-200"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
