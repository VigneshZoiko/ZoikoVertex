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

interface ActionItem {
  id: string;
  title: string;
  description: string;
  ownerRole: string;
  deadlineType: "Recommended" | "Required";
  deadlineDetail: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
}

const actionData: ActionItem[] = [
  {
    id: "action-1",
    title: "Privileged-action logging in Identity Ledger",
    description:
      "Review admin permissions so privileged actions are correctly attributed.",
    ownerRole: "Security admin",
    deadlineType: "Recommended",
    deadlineDetail: "30 days",
    primaryCtaText: "Open setup guide",
    primaryCtaHref: "#",
    secondaryCtaText: "Contact support",
    secondaryCtaHref: "#",
  },
  {
    id: "action-2",
    title: "Salesforce & HubSpot connector v2",
    description:
      "Reconnect the integration to enable v2 sync and signed events.",
    ownerRole: "Integration admin",
    deadlineType: "Required",
    deadlineDetail: "rollout window",
    primaryCtaText: "Open setup guide",
    primaryCtaHref: "#",
    secondaryCtaText: "View docs",
    secondaryCtaHref: "#",
  },
  {
    id: "action-3",
    title: "Legacy CSV export endpoint deprecation",
    description:
      "Migrate to the new export API before the endpoint is retired.",
    ownerRole: "Developer",
    deadlineType: "Required",
    deadlineDetail: "Mar 31, 2026",
    primaryCtaText: "Migration guide",
    primaryCtaHref: "#",
    secondaryCtaText: "API reference",
    secondaryCtaHref: "#",
  },
];

export default function AdminActionRequiredSection() {
  return (
    <section className="relative min-h-[650px] w-full bg-[#0B1524] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-start">
        {/* Header Content */}
        <div className="mb-12 max-w-2xl text-left">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-amber-500"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-amber-500 uppercase">
              ADMIN ACTION REQUIRED
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            What your team needs to do.
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
            Updates that require configuration, review, or migration &mdash;
            with owners, deadlines, and setup guides.
          </p>
        </div>

        {/* Action List Items */}
        <motion.div
          className="w-full flex flex-col gap-4 text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {actionData.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              className="group relative rounded-2xl bg-[#131C2B] border-l-3 border-l-[#F2B53C] border-[#7AA0BE24] hover:border-slate-700 transition-all duration-300 backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.4)] p-6 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center overflow-hidden"
            >
              {/* Amber Accent Bar on the Left */}
              <div className="absolute left-0 top-3 bottom-3 w-1 bg-amber-500 rounded-r-md" />

              {/* Column 1: Title & Description */}
              <div className="md:col-span-5 pl-2">
                <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Column 2: Owner Role */}
              <div className="md:col-span-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-1">
                  OWNER ROLE
                </span>
                <span className="text-xs font-mono text-slate-200">
                  {item.ownerRole}
                </span>
              </div>

              {/* Column 3: Deadline */}
              <div className="md:col-span-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-1">
                  DEADLINE
                </span>
                <div className="text-xs font-mono">
                  <span className="text-amber-400 font-semibold">
                    {item.deadlineType}
                  </span>
                  <span className="text-amber-400/80">
                    {" "}
                    &bull; {item.deadlineDetail}
                  </span>
                </div>
              </div>

              {/* Column 4: CTAs */}
              <div className="md:col-span-2 flex flex-col items-center md:items-end gap-2">
                <a
                  href={item.primaryCtaHref}
                  className="w-full md:w-auto px-4 py-2 rounded-full bg-[#00E5FF] text-slate-950 font-bold text-xs text-center hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_15px_rgba(0,229,255,0.25)] active:scale-[0.98]"
                >
                  {item.primaryCtaText}
                </a>

                <a
                  href={item.secondaryCtaHref}
                  className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors py-1"
                >
                  {item.secondaryCtaText}
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
