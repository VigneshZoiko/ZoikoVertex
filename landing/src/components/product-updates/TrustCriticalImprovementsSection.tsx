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

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

interface TrustFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const trustFeatures: TrustFeature[] = [
  {
    id: "auditability",
    title: "Auditability",
    description:
      "Hash-chain validation improvements, evidence export logs, and audit search filters.",
    icon: (
      <div className="w-5 h-5 flex items-center justify-center text-amber-400">
        {/* Filled Diamond Icon */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      </div>
    ),
  },
  {
    id: "responsible-ai",
    title: "Responsible AI",
    description:
      "New autonomy thresholds, policy checks, and human-in-the-loop controls.",
    icon: (
      <div className="w-5 h-5 flex items-center justify-center text-amber-400">
        {/* Outline Diamond Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      </div>
    ),
  },
  {
    id: "access-identity",
    title: "Access & identity",
    description:
      "Role updates, privileged-action logging, and identity-binding improvements.",
    icon: (
      <div className="w-5 h-5 flex items-center justify-center text-amber-400">
        {/* Shield Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
    ),
  },
  {
    id: "data-privacy",
    title: "Data & privacy",
    description:
      "Retention controls, redaction improvements, and privacy-request handling.",
    icon: (
      <div className="w-5 h-5 flex items-center justify-center text-amber-400">
        {/* Server / Storage Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <rect x="2" y="4" width="20" height="6" rx="2" />
          <rect x="2" y="14" width="20" height="6" rx="2" />
          <line x1="6" y1="7" x2="6.01" y2="7" strokeWidth="3" />
          <line x1="6" y1="17" x2="6.01" y2="17" strokeWidth="3" />
        </svg>
      </div>
    ),
  },
  {
    id: "admin-guidance",
    title: "Admin guidance",
    description:
      "Configuration notes, migration windows, and default-setting changes.",
    icon: (
      <div className="w-5 h-5 flex items-center justify-center text-amber-400">
        {/* Gear / Cog Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>
    ),
  },
];

export default function TrustCriticalImprovementsSection() {
  return (
    <section className="relative min-h-[600px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Header Content */}
        <div className="mb-14">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              GOVERNANCE, SECURITY &amp; RESPONSIBLE AI
            </span>
            <span className="w-4 h-[2px] bg-amber-500"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Trust-critical improvements, surfaced.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
            Because ZoikoVertex sells governed execution, these updates get
            their own space &mdash; not buried in a changelog.
          </p>
        </div>

        {/* 5-Column Feature Card Container */}
        <motion.div
          className="w-full rounded-2xl border border-[#7AA0BE24] backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 lg:divide-x divide-slate-800/80 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {trustFeatures.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              className="p-6 sm:p-7 flex flex-col items-start hover:bg-[#0C1524] transition-colors duration-200 group cursor-pointer"
            >
              {/* Icon */}
              <div className="mb-4">{item.icon}</div>

              {/* Feature Title */}
              <h3 className="text-sm font-bold text-slate-100 mb-2 tracking-tight group-hover:text-white transition-colors">
                {item.title}
              </h3>

              {/* Feature Description */}
              <p className="text-xs text-slate-400 font-normal leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Text Link CTA */}
        <a
          href="#"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400 hover:text-amber-300 transition-colors group"
        >
          <span>View all governance updates</span>
          <span className="group-hover:translate-x-1 transition-transform">
            &rarr;
          </span>
        </a>
      </div>
    </section>
  );
}
