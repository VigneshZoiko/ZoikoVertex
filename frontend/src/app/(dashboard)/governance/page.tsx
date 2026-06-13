"use client";

import Link from "next/link";
import { Scale, BookMarked, ShieldAlert, FileSearch, Archive, ListChecks } from "lucide-react";

const GOVERNANCE_SECTIONS = [
  { href: "/governance/legal",    icon: BookMarked,  label: "Brand Standards",   desc: "Voice, tone, visual rules, and content guardrails." },
  { href: "/governance/policy",   icon: Scale,       label: "Policy Center",     desc: "Governance rules, thresholds, and workspace standards." },
  { href: "/governance/risk",     icon: ShieldAlert, label: "Risk & Compliance",  desc: "AI risk flags, regulatory checks, and brand safety." },
  { href: "/governance/audit",    icon: FileSearch,  label: "Audit Trail",        desc: "Tamper-evident records of all actions and decisions." },
  { href: "/governance/evidence", icon: Archive,     label: "Evidence Vault",     desc: "Exportable evidence packs and legal-hold records." },
  { href: "/governance/rules",    icon: ListChecks,  label: "Approval Rules",     desc: "Approval paths by brand, market, risk level, and role." },
];

export default function GovernanceCenterPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-warning-bg flex items-center justify-center">
          <Scale className="w-6 h-6 text-warning-text" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Governance Center</h1>
          <p className="text-foreground-muted text-sm mt-1">Platform trust layer — policies, risk, audit, and compliance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {GOVERNANCE_SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-card border border-border rounded-2xl p-6 hover:border-warning-border hover:bg-surface-hover transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-warning-bg flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-warning-text" />
            </div>
            <h3 className="text-foreground font-semibold mb-2 group-hover:text-warning-text transition-colors">{label}</h3>
            <p className="text-foreground-muted text-sm leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
