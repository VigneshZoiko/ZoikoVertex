"use client";

import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  FileClock,
  BookOpen,
  Lock,
  Search,
  Fingerprint,
  CalendarClock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Control = { icon: LucideIcon; title: string; desc: string };

const CONTROLS: Control[] = [
  {
    icon: Bot,
    title: "Responsible AI Controls",
    desc: "Prevents uncontrolled AI publishing, hallucinated claims, unapproved offers, and inconsistent brand output across channels.",
  },
  {
    icon: CheckCircle2,
    title: "Approval Workflows",
    desc: "Routes content to the right reviewer by channel, risk tier, category, region, and spend level — with clear escalation paths.",
  },
  {
    icon: FileClock,
    title: "Audit Trail",
    desc: "Shows what happened across campaigns, agents, workflows, integrations, approvals, and system actions — complete and retrievable.",
  },
  {
    icon: BookOpen,
    title: "Decision Ledger",
    desc: "Records why key approvals, rejections, overrides, and policy decisions were made — not just what happened.",
  },
  {
    icon: Lock,
    title: "Evidence Vault",
    desc: "Stores prompts, outputs, approvals, final content, platform confirmations, and exportable evidence bundles in sealed records.",
  },
  {
    icon: Search,
    title: "Forensic Hub",
    desc: "Reconstructs disputed, failed, escalated, or suspicious events from linked audit, identity, and evidence records.",
  },
  {
    icon: Fingerprint,
    title: "Identity Ledger",
    desc: "Binds every privileged action to role, authority, session, and permission context — making accountability undeniable.",
  },
  {
    icon: CalendarClock,
    title: "Legal Holds & Retention",
    desc: "Preserves evidence when required. Avoids indefinite data hoarding. Supports legal, procurement, and audit review on demand.",
  },
];

const LINKS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: ShieldCheck, label: "Compliance & Governance", href: "/governance" },
  { icon: Bot, label: "Responsible AI", href: "/governance" },
  { icon: Fingerprint, label: "Auditability", href: "/governance" },
  { icon: FileText, label: "Data Processing Addendum", href: "/privacy" },
];

export default function EnterpriseRetailGovernance() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Governance &amp; Auditability
          </span>
        </div>

        <h2 className="max-w-[540px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Enterprise retail governance built into the execution layer — not bolted on.
        </h2>

        <p className="mt-7 max-w-[500px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          ZoikoVertex positions governance as a business advantage: faster approvals, safer AI
          delegation, and a complete evidence record that protects the brand and the business.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTROLS.map((c) => (
            <div key={c.title} className="rounded-xl border border-white/[0.14] bg-[#0E1626] p-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#20E7F2]/10 border border-[#20E7F2]/30">
                <c.icon className="w-4 h-4 text-[#20E7F2]" strokeWidth={2} />
              </div>
              <h3 className="mt-5 text-sm font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                {c.title}
              </h3>
              <p className="mt-2.5 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-white/[0.14] text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
            >
              <l.icon className="w-[14px] h-[14px]" strokeWidth={2} />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
