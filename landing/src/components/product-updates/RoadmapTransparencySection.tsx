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

interface RoadmapItem {
  title: string;
  subtitle: string;
}

interface RoadmapColumn {
  id: string;
  status: string;
  statusType: "released" | "rolling" | "preview" | "planned" | "deprecated";
  items: RoadmapItem[];
}

const roadmapData: RoadmapColumn[] = [
  {
    id: "released",
    status: "Released",
    statusType: "released",
    items: [
      {
        title: "Evidence Vault sealed-output controls",
        subtitle: "GA • all eligible plans",
      },
      {
        title: "Approval SLA escalation rules",
        subtitle: "GA",
      },
      {
        title: "ROI drilldowns in Command Center",
        subtitle: "GA",
      },
    ],
  },
  {
    id: "rolling-out",
    status: "Rolling out",
    statusType: "rolling",
    items: [
      {
        title: "Salesforce & HubSpot connector v2",
        subtitle: "Phased • tenant-by-tenant",
      },
      {
        title: "Data retention policy scheduler",
        subtitle: "Phased rollout",
      },
    ],
  },
  {
    id: "enterprise-preview",
    status: "Enterprise preview",
    statusType: "preview",
    items: [
      {
        title: "Webhooks 2.0 with signed payloads",
        subtitle: "Selected customers",
      },
      {
        title: "Cross-tenant governance dashboards",
        subtitle: "Design partners",
      },
    ],
  },
  {
    id: "planned",
    status: "Planned",
    statusType: "planned",
    items: [
      {
        title: "Expanded connector library",
        subtitle: "Directional • may change",
      },
      {
        title: "Additional evidence export formats",
        subtitle: "Directional • may change",
      },
    ],
  },
  {
    id: "deprecated",
    status: "Deprecated",
    statusType: "deprecated",
    items: [
      {
        title: "Legacy CSV export endpoint",
        subtitle: "Migrate by Mar 31, 2026",
      },
    ],
  },
];

const getStatusBadgeDot = (type: RoadmapColumn["statusType"]) => {
  switch (type) {
    case "released":
      return "bg-emerald-400";
    case "rolling":
      return "bg-cyan-400";
    case "preview":
      return "bg-amber-400";
    case "planned":
      return "bg-purple-400";
    case "deprecated":
      return "bg-slate-400";
  }
};

export default function RoadmapTransparencySection() {
  return (
    <section className="relative min-h-[750px] w-full bg-[#030711] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-950/15 blur-[180px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Header Content */}
        <div className="mb-12">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              ROADMAP TRANSPARENCY
            </span>
            <span className="w-4 h-[2px] bg-cyan-400"></span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-bold tracking-tight text-white mb-4 leading-[1.12]">
            Shipped is separated from planned.
          </h2>

          {/* Subtitle / Description */}
          <p className="text-[#8B97A6] text-xs sm:text-sm font-normal leading-relaxed">
            We use firm language only for what&apos;s live. Everything else is
            clearly staged.
          </p>
        </div>

        {/* 5-Column Staged Roadmap Grid */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {roadmapData.map((col) => (
            <motion.div
              key={col.id}
              variants={cardVariants}
              className="rounded-2xl bg-[#131C2B] border border-[#7AA0BE24] backdrop-blur-md p-5 flex flex-col shadow-[0_15px_30px_rgba(0,0,0,0.4)]"
            >
              {/* Header Badge */}
              <div className="flex items-center gap-2 pb-4 mb-2 border-b border-slate-800/60">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${getStatusBadgeDot(
                    col.statusType,
                  )}`}
                />
                <span className="text-sm font-semibold text-slate-100 tracking-tight">
                  {col.status}
                </span>
              </div>

              {/* Items Container */}
              <div className="divide-y divide-slate-800/40 flex-1 flex flex-col">
                {col.items.map((item, idx) => (
                  <div key={idx} className="py-3.5 first:pt-2 last:pb-0">
                    <h4 className="text-xs font-semibold text-[#C3CCD6] tracking-[.5px] mb-1 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[10px] font-mono text-[#5F6D7E] uppercase tracking-wider">
                      {item.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Warning Callout Box */}
        <div className="w-full max-w-[1280px] rounded-2xl bg-[#E8B7680D] border border-[#E8B76847] p-5 mb-8 text-left flex items-start gap-3.5 backdrop-blur-md">
          <div className="text-[#E8B768] mt-0.5 shrink-0">
            {/* Warning Triangle Icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10h2v4h-2v-4zm0 6h2v2h-2v-2z" />
            </svg>
          </div>
          <p className="text-xs text-[#C3CCD6] font-normal leading-relaxed">
            Roadmap items are provided for planning transparency and may change
            based on security, compliance, customer feedback, product quality,
            and engineering readiness. Released features are clearly marked
            separately from planned or preview items.
          </p>
        </div>

        {/* Bottom CTA Link */}
        <a
          href="#"
          className="inline-flex tracking-[1px] items-center gap-1.5 text-xs font-mono font-semibold text-[#20E7F2] hover:text-cyan-300 transition-colors group"
        >
          <span>Discuss the roadmap with sales</span>
          <span className="group-hover:translate-x-1 transition-transform">
            &rarr;
          </span>
        </a>
      </div>
    </section>
  );
}
