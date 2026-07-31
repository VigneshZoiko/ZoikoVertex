"use client";

import Image from "next/image";
import { Eye, Bell, UserCog, Link2, Siren, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Pillar = {
  icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
  image: string;
  fg: string;
  bg: string;
  border: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Eye,
    tag: "Role-based views",
    title: "Executives see strategy. Operators see tasks. Auditors see evidence.",
    desc: "Permission-scoped visibility by role, workspace, unit, and sensitivity level — so every leader sees exactly what they need and nothing they should not.",
    image: "/images/executive-command-center/governance-1.png",
    fg: "text-[#20E7F2]",
    bg: "bg-[#20E7F2]/5",
    border: "border-[#20E7F2]/20",
  },
  {
    icon: Bell,
    tag: "Policy-aware alerts",
    title: "Risk signals with context, not just notifications.",
    desc: "High-risk outputs, blocked content, override requests, and restricted claims surface with the policy version, severity, affected item, and required next action — not just an alert count.",
    image: "/images/executive-command-center/governance-2.png",
    fg: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: UserCog,
    tag: "Human-in-the-loop",
    title: "Decision points require human review when risk or autonomy thresholds demand it.",
    desc: "Configured autonomy limits define when AI agents hand off to humans. The command center shows exactly which decisions are queued, who owns them, and how long they have waited.",
    image: "/images/executive-command-center/governance-3.png",
    fg: "text-orange-400",
    bg: "bg-orange-400/5",
    border: "border-orange-400/25",
  },
  {
    icon: Link2,
    tag: "Evidence links",
    title: "Every material action opens its Audit Trail, Evidence Vault, or Decision Ledger record.",
    desc: "The command center does not just show status. From any workflow item, approval, agent task, or risk alert, executives can open the underlying evidence record in one click.",
    image: "/images/executive-command-center/governance-4.png",
    fg: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Siren,
    tag: "Forensic escalation",
    title: "Critical events escalate into the Forensic Hub without losing context.",
    desc: "When disputed, failed, or suspicious events require deeper investigation, the command center routes them to the Forensic Hub with full event chain preserved.",
    image: "/images/executive-command-center/governance-5.png",
    fg: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Lock,
    tag: "Retention & legal holds",
    title: "Evidence under hold, expiring retention, and integrity exceptions flagged directly.",
    desc: "The command center flags records under legal hold, approaching retention expiry, and integrity exceptions — so governance teams act before obligations are missed.",
    image: "/images/executive-command-center/governance-6.png",
    fg: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
];

const STATS = [
  {
    value: "100%",
    label: "Evidence coverage",
    desc: "Every material action in the command center links to at least one evidence record in the Audit Trail or Evidence Vault.",
  },
  {
    value: "< 30s",
    label: "Evidence retrieval",
    desc: "Any audit trail event, approval decision, or evidence vault record is retrievable from the command center in under 30 seconds.",
  },
  {
    value: "Zero",
    label: "Uncontrolled agent actions",
    desc: "No AI agent action escapes the command center's visibility, logging, and human-approval boundary controls.",
  },
];

export default function ExecutiveCommandCenterGovernance() {
  return (
    <section className="bg-[#0E1626] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Governance Control Layer
          </span>
        </div>

        <h2 className="max-w-[510px] text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Command without control is just observation. This is different.
        </h2>

        <p className="mt-6 max-w-[520px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Every critical action in the command center is traceable to its actor, policy, decision,
          evidence, and outcome. The governance layer is not a separate tool — it is built into the
          operating view.
        </p>

        {/* ─── Pillar cards ─────────────────────────────────────────── */}
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div
              key={p.tag}
              className="rounded-2xl border border-white/10 bg-[#0E1626] overflow-hidden flex flex-col"
            >
              <div className="relative h-40 shrink-0">
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover saturate-0"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#080d1a]/95" />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div
                  className={`inline-flex self-start items-center gap-2 rounded-full border px-2.5 py-1 ${p.bg} ${p.border}`}
                >
                  <p.icon className={`w-2.5 h-2.5 ${p.fg}`} strokeWidth={2.5} />
                  <span
                    className={`text-[9.3px] font-medium uppercase tracking-[0.08em] font-[family-name:var(--font-jetbrains)] ${p.fg}`}
                  >
                    {p.tag}
                  </span>
                </div>

                <h3 className="mt-3.5 text-base font-bold leading-snug text-white/90 font-[family-name:var(--font-bricolage)]">
                  {p.title}
                </h3>
                <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Stat band ────────────────────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0E1626] grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 py-8">
              <div className="text-4xl font-extrabold leading-9 text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                {s.value}
              </div>
              <div className="mt-3 text-[10.4px] font-medium uppercase tracking-[0.1em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                {s.label}
              </div>
              <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
