"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Diamond,
  Sparkles,
  Scale,
  Layers,
  Grid2x2,
  ShieldCheck,
} from "lucide-react";

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

interface RoleCard {
  id: string;
  title: string;
  count: string;
  icon: React.ElementType;
}

const roles: RoleCard[] = [
  {
    id: "executive",
    title: "Executive",
    count: "2 demos",
    icon: Diamond,
  },
  {
    id: "marketing",
    title: "Marketing Operations",
    count: "2 demos",
    icon: Sparkles,
  },
  {
    id: "ai-governance",
    title: "AI Governance",
    count: "2 demos",
    icon: Scale,
  },
  {
    id: "it-architecture",
    title: "IT / Architecture",
    count: "1 demo",
    icon: Layers,
  },
  {
    id: "retail-ops",
    title: "Retail Operations",
    count: "1 demo",
    icon: Grid2x2,
  },
  {
    id: "legal-compliance",
    title: "Legal / Compliance",
    count: "0 demos",
    icon: ShieldCheck,
  },
];

export default function RoleBasedPlaylistsSection() {
  return (
    <section className="relative min-h-[500px] w-full bg-[#08101F] text-white px-6 py-20 md:px-12 lg:px-16 flex items-center justify-center font-sans overflow-hidden">
      {/* Subtle Ambient Radial Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-900/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] w-full z-10 flex flex-col items-center text-center">
        {/* Header Section */}
        <div className="mb-12 max-w-2xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-[2px] bg-cyan-400"></span>
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              ROLE-BASED PLAYLISTS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Curated for how you evaluate.
          </h2>

          <p className="text-slate-400 text-xs sm:text-sm font-normal">
            Jump to the demos built for your role.
          </p>
        </div>

        {/* Roles Grid */}
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                variants={cardVariants}
                className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-[#131C2B] border border-slate-800/80 hover:border-cyan-500/40 hover:bg-[#0A1524] transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-sm"
              >
                {/* Icon Wrapper */}
                <div className="mb-5 text-cyan-400 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-6 h-6 stroke-[1.75]" />
                </div>

                {/* Role Title */}
                <h3 className="text-xs font-semibold text-slate-200 mb-1.5 text-center group-hover:text-cyan-300 transition-colors">
                  {role.title}
                </h3>

                {/* Demo Count Label */}
                <span className="text-[10px] font-mono text-slate-500">
                  {role.count}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
