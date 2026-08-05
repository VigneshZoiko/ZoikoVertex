"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, Clock, EyeOff, Users } from "lucide-react";

export default function MarketingOpsChallengesSection() {
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

  const challenges = [
    {
      icon: Layers,
      title: "Tool fragmentation across the stack",
      description:
        "Marketing operations teams coordinate across CRM, DAM, social, paid media, email, analytics, and collaboration tools with no unified governance layer — creating visibility gaps, duplicate work, and accountability failures.",
    },
    {
      icon: Clock,
      title: "Approval bottlenecks that compound",
      description:
        "Manual approval coordination via email, Slack, and shared drives creates untracked bottlenecks that delay campaigns, miss windows, and create compliance exposure when approvals are informal or absent.",
    },
    {
      icon: EyeOff,
      title: "No unified execution visibility",
      description:
        "Marketing operations leaders cannot see campaign status, approval queue depth, workflow bottlenecks, or team workload across the entire campaign portfolio without switching between multiple disconnected systems.",
    },
    {
      icon: Users,
      title: "Accountability gaps across agencies and teams",
      description:
        "When campaigns span internal teams, agencies, and vendors, ownership, approvals, and revisions are distributed across systems — creating accountability gaps that surface when something goes wrong.",
    },
  ];

  return (
    <section className="relative w-full bg-[#080C10] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Section Header */}
        <div className="mb-12">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#00E5FF]">
              MARKETING OPS CHALLENGES
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.15] text-white"
          >
            Why AI amplifies marketing operations complexity without governance.
          </motion.h2>
        </div>

        {/* Outer Grid Card with Seamless Border Divide */}
        <motion.div
          variants={itemVariants}
          className="w-full bg-[#111D2E] border border-white/10 rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-white/10"
        >
          {challenges.map((item, index) => (
            <div
              key={index}
              className="p-8 flex flex-col justify-start transition-colors duration-200 hover:bg-white/[0.02]"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mb-6 shrink-0">
                <item.icon
                  className="w-5 h-5 text-[#00E5FF]"
                  strokeWidth={1.75}
                />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold tracking-tight leading-snug mb-3 text-white">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
