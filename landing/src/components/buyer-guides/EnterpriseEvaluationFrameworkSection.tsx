"use client";

import React from "react";
import Link from "next/link";
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
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

interface PillarLink {
  name: string;
  href: string;
}

interface PillarItem {
  id: string;
  pillarNumber: string;
  title: string;
  question: string;
  links: PillarLink[];
}

const pillarsData: PillarItem[] = [
  {
    id: "pillar-01",
    pillarNumber: "Pillar 01",
    title: "Governed autonomy",
    question:
      '"Can agents act safely within policy, approvals, and human oversight?"',
    links: [
      {
        name: "Agentic Architecture",
        href: "/agentic-architecture",
      },
      {
        name: "Approval Workflows",
        href: "/approval-workflows",
      },
      {
        name: "Responsible AI",
        href: "/responsible-ai",
      },
    ],
  },

  {
    id: "pillar-02",
    pillarNumber: "Pillar 02",
    title: "Workflow control",
    question:
      '"Can work move from brief to approval to publishing without losing accountability?"',
    links: [
      {
        name: "AI Workflow Orchestration",
        href: "/ai-workflow-orchestration",
      },
      {
        name: "Command Center",
        href: "/contact-sales",
      },
    ],
  },

  {
    id: "pillar-03",
    pillarNumber: "Pillar 03",
    title: "Auditability",
    question:
      '"Can every action, decision, actor, and proof item be reconstructed?"',
    links: [
      {
        name: "Auditability",
        href: "/auditability",
      },

      // {
      //   name: "Evidence Layer",
      //   href: "#",
      // },

      // {
      //   name: "Decision Ledger",
      //   href: "#",
      // },
    ],
  },

  {
    id: "pillar-04",
    pillarNumber: "Pillar 04",
    title: "ROI measurement",
    question:
      '"Can the platform prove time saved, risk avoided, and value created?"',
    links: [
      {
        name: "ROI Engine",
        href: "/roi-engine",
      },
      {
        name: "ROI & Governance Audit",
        href: "/roi-governance-audit",
      },
    ],
  },

  {
    id: "pillar-05",
    pillarNumber: "Pillar 05",
    title: "Integration readiness",
    question:
      '"Can the system connect to existing enterprise tools without brittle workflows?"',
    links: [
      {
        name: "Integrations",
        href: "/integrations",
      },

      // {
      //   name: "API & Webhooks",
      //   href: "#",
      // },

      // {
      //   name: "Data Connectors",
      //   href: "#",
      // },
    ],
  },

  {
    id: "pillar-06",
    pillarNumber: "Pillar 06",
    title: "Procurement readiness",
    question:
      '"Can security, legal, privacy, and governance reviewers approve it?"',
    links: [
      {
        name: "Compliance & Governance",
        href: "/governance",
      },
      {
        name: "DPA",
        href: "/dpa",
      },
      {
        name: "Security Pack",
        href: "/security",
      },
    ],
  },
];

export default function EnterpriseEvaluationFrameworkSection() {
  return (
    <section className="relative min-h-[900px] w-full bg-[#08101F] px-6 py-20 font-sans text-white md:px-12 lg:px-16">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-center">
        {/* Header */}
        <motion.div
          className="mb-14 flex w-full max-w-[900px] flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            variants={cardVariants}
            className="mb-5 inline-flex items-center rounded-full border border-[#E8B768]/30 bg-[#E8B768]/10 px-4 py-2"
          >
            <span className="font-mono text-xs font-semibold uppercase tracking-[2px] text-[#E8B768]">
              Enterprise Evaluation Framework
            </span>
          </motion.div>

          <motion.h2
            variants={cardVariants}
            className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            Evaluate the platform
            <br />
            <span className="text-[#E8B768]">across six pillars.</span>
          </motion.h2>

          <motion.p
            variants={cardVariants}
            className="mt-6 max-w-[720px] text-sm leading-7 text-slate-400 md:text-base"
          >
            A structured framework for evaluating governance, workflow
            control, auditability, ROI, integration readiness, and procurement
            requirements.
          </motion.p>
        </motion.div>

        {/* Pillars */}
        <motion.div
          className="grid w-full grid-cols-1 gap-6 text-left md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {pillarsData.map((pillar) => (
            <motion.div
              key={pillar.id}
              variants={cardVariants}
              className="group relative flex min-h-[300px] flex-col justify-between rounded-2xl border border-slate-700/60 bg-[#0D1627] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8B768]/40"
            >
              {/* Top Content */}
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[2px] text-[#E8B768]">
                    {pillar.pillarNumber}
                  </span>

                  <span className="font-mono text-xs text-slate-600">
                    {pillar.id.replace("pillar-", "#")}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-white md:text-2xl">
                  {pillar.title}
                </h3>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  {pillar.question}
                </p>
              </div>

              {/* Links */}
              <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2">
                {pillar.links.map((link, i) => (
                  <React.Fragment key={link.name}>
                    {i > 0 && (
                      <span className="text-xs text-slate-600">
                        &bull;
                      </span>
                    )}

                    <Link
                      href={link.href}
                      className="flex items-center gap-1 font-mono text-xs font-semibold tracking-[1px] text-[#E8B768] transition-colors hover:text-amber-300"
                    >
                      <span className="tracking-[1px] text-[#E8B768]">
                        &rarr;
                      </span>

                      {link.name}
                    </Link>
                  </React.Fragment>
                ))}
              </div>

              {/* Hover line */}
              <div className="absolute bottom-0 left-7 right-7 h-px origin-left scale-x-0 bg-[#E8B768] transition-transform duration-300 group-hover:scale-x-100" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}