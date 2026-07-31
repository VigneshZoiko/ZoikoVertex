"use client";

import { Gauge, ShieldAlert, TrendingUp, UserCheck, FileSearch, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Signal = {
  icon: LucideIcon;
  title: string;
  desc: string;
  fg: string;
  bg: string;
  border: string;
};

const SIGNALS: Signal[] = [
  {
    icon: Gauge,
    title: "Execution velocity",
    desc: "Track how fast campaigns, agent tasks, and workflows move from brief to approval to publishing.",
    fg: "text-[#20E7F2]",
    bg: "bg-[#20E7F2]/10",
    border: "border-[#20E7F2]/20",
  },
  {
    icon: ShieldAlert,
    title: "Governance risk",
    desc: "See high-risk actions, policy exceptions, approval delays, and content blocks before they become operational problems.",
    fg: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: TrendingUp,
    title: "ROI visibility",
    desc: "Connect campaigns, workflows, and agentic execution to measurable revenue, productivity, and cost-efficiency indicators.",
    fg: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/25",
  },
  {
    icon: UserCheck,
    title: "Accountability",
    desc: "Know which user, agent, workflow, or integration owns the next action — with no blind spots.",
    fg: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    icon: FileSearch,
    title: "Audit readiness",
    desc: "Open the evidence, approval, and audit trail behind any critical action within seconds.",
    fg: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Crown,
    title: "Executive decisions",
    desc: "Identify where leadership intervention is needed now — before delays compound into risk.",
    fg: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

export default function ExecutiveCommandCenterSignals() {
  return (
    <section className="bg-[#0A111E] border-t border-b border-white/10">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {SIGNALS.map((s) => (
          <div
            key={s.title}
            className="px-6 py-7 border-r border-b border-white/10 last:border-r-0 xl:border-b-0"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${s.bg} ${s.border}`}
            >
              <s.icon className={`w-4 h-4 ${s.fg}`} strokeWidth={2} />
            </div>
            <h3 className="mt-5 text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
              {s.title}
            </h3>
            <p className="mt-2 text-xs font-light leading-4 text-white/50 font-[family-name:var(--font-jakarta)]">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
