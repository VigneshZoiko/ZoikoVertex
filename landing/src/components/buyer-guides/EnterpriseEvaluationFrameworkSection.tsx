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

interface PillarItem {
  id: string;
  pillarNumber: string;
  title: string;
  question: string;
  links: string[];
}

const pillarsData: PillarItem[] = [
  {
    id: "pillar-01",
    pillarNumber: "Pillar 01",
    title: "Governed autonomy",
    question:
      '"Can agents act safely within policy, approvals, and human oversight?"',
    links: ["Agentic Architecture", "Approval Workflows", "Responsible AI"],
  },
  {
    id: "pillar-02",
    pillarNumber: "Pillar 02",
    title: "Workflow control",
    question:
      '"Can work move from brief to approval to publishing without losing accountability?"',
    links: ["AI Workflow Orchestration", "Command Center"],
  },
  {
    id: "pillar-03",
    pillarNumber: "Pillar 03",
    title: "Auditability",
    question:
      '"Can every action, decision, actor, and proof item be reconstructed?"',
    links: ["Auditability", "Evidence Layer", "Decision Ledger"],
  },
  {
    id: "pillar-04",
    pillarNumber: "Pillar 04",
    title: "ROI measurement",
    question:
      '"Can the platform prove time saved, risk avoided, and value created?"',
    links: ["ROI Engine", "ROI & Governance Audit"],
  },
  {
    id: "pillar-05",
    pillarNumber: "Pillar 05",
    title: "Integration readiness",
    question:
      '"Can the system connect to existing enterprise tools without brittle workflows?"',
    links: ["Integrations", "API & Webhooks", "Data Connectors"],
  },
  {
    id: "pillar-06",
    pillarNumber: "Pillar 06",
    title: "Procurement readiness",
    question:
      '"Can security, legal, privacy, and governance reviewers approve it?"',
    links: ["Compliance & Governance", "DPA", "Security Pack"],
  },
];

export default function EnterpriseEvaluationFrameworkSection() {
  return (
    <section className="relative min-h-[900px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center">
        {/* Header Content */}
        <div className="text-center mb-16 max-w-6xl">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              ENTERPRISE EVALUATION FRAMEWORK
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Six pillars to evaluate any agentic AI platform.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
            The questions to ask &mdash; and where ZoikoVertex proves its
            answer.
          </p>
        </div>

        {/* 6 Pillars Grid Cards */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {pillarsData.map((pillar) => (
            <motion.div
              key={pillar.id}
              variants={cardVariants}
              className="group relative flex flex-col justify-between p-7 rounded-2xl bg-[#131C2B] border border-[#7AA0BE24] hover:border-slate-700 hover:bg-[#162235] transition-all duration-300 backdrop-blur-sm"
            >
              <div>
                {/* Pillar Number */}
                <span className="text-xs font-mono text-[#00E5FF] tracking-wider uppercase block mb-3">
                  {pillar.pillarNumber}
                </span>

                {/* Pillar Title */}
                <h3 className="text-xl font-bold text-slate-100 mb-3 tracking-tight group-hover:text-white transition-colors">
                  {pillar.title}
                </h3>

                {/* Question Quote */}
                <p className="text-xs sm:text-sm text-slate-400 font-normal italic leading-relaxed mb-6 pb-6 border-b border-slate-800/80">
                  {pillar.question}
                </p>
              </div>

              {/* Footer Links */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {pillar.links.map((link, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-slate-600 text-xs">&bull;</span>
                    )}
                    <button className="text-xs font-mono tracking-[1px] font-semibold text-[#E8B768] hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer">
                      <span className="text-[#E8B768] tracking-[1px]">&rarr;</span> {link}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
