"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Building2, ClipboardCheck, Lock } from "lucide-react";

interface Badge {
  label: string;
  icon: React.ElementType;
}

const badges: Badge[] = [
  { label: "Responsible AI", icon: ShieldCheck },
  { label: "Compliance & Governance", icon: Building2 },
  { label: "Auditability", icon: ClipboardCheck },
  { label: "Security", icon: Lock },
];

export default function ResponsibleAiCulture() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0b0f1a] lg:flex-row">
      {/* Left - Image */}
      <div className="relative h-[320px] w-full lg:h-screen lg:w-1/2">
        <img
          src="/images/careers/left.png"
          alt="Hand using a stylus on a tablet beside a keyboard and open magazine"
          className="h-full w-full object-cover grayscale"
        />
      </div>

      {/* Right - Content */}
      <div className="flex w-full items-center px-8 py-16 sm:px-14 lg:w-1/2 lg:px-16 lg:py-0">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <span className="text-[#3fd6c4]">—</span>
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-[#3fd6c4]">
              RESPONSIBLE AI CULTURE
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
            className="mt-5 text-[30px] max-w-90 font-bold leading-[1.2] tracking-tight text-white sm:text-[34px]"
          >
            We build AI that can be questioned, reviewed, and defended.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
            className="mt-5 text-[14.5px] max-w-90 leading-relaxed text-slate-400"
          >
            Everyone at ZoikoVertex works with auditability, human oversight,
            evidence retention, role permissions, data minimization, and
            responsible AI expectations as operating standards — not optional
            practices.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
            className="mt-7 flex max-w-150 gap-3"
          >
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#FFFFFF1A] px-3.5 py-2 text-[12.5px] font-medium text-slate-300"
                >
                  <Icon className="h-3.5 w-3.5 text-[#3fd6c4]" />
                  {badge.label}
                </span>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
