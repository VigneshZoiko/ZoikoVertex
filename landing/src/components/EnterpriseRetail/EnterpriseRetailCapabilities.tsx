"use client";

import { Bot, Network, CheckCircle2, Store, FileStack, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Capability = { icon: LucideIcon; title: string; desc: string };

const CAPABILITIES: Capability[] = [
  {
    icon: Bot,
    title: "Governed AI Agents",
    desc: "Retail agents for campaign planning, content generation, localization, QA, and performance summaries — all operating within policy boundaries and approval controls.",
  },
  {
    icon: Network,
    title: "AI Workflow Orchestration",
    desc: "Connect brief, generation, review, approval, publication, and ROI measurement in a single governed workflow — with handoffs and escalations built in.",
  },
  {
    icon: CheckCircle2,
    title: "Approval Workflow Engine",
    desc: "Route content to the right approver by brand, region, category, offer type, risk level, and channel — with defined SLAs and escalation paths.",
  },
  {
    icon: Store,
    title: "Store & Regional Localization",
    desc: "Generate and govern store-level and regional content variants under central brand rules — at scale, with evidence, and with risk-based approval routing.",
  },
  {
    icon: FileStack,
    title: "Evidence Architecture",
    desc: "Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger create a complete, linked evidence record for every retail campaign action.",
  },
  {
    icon: BarChart3,
    title: "Retail ROI Engine",
    desc: "Track campaign throughput, approval cycle-time, rework reduction, agency efficiency, risk reduction, and governance maturity — tied to measurable business outcomes.",
  },
];

export default function EnterpriseRetailCapabilities() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Platform Capabilities
          </span>
        </div>

        <h2 className="max-w-[490px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Governed retail execution capabilities built for enterprise scale.
        </h2>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-xl border border-white/[0.14] bg-[#0E1626] p-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#20E7F2]/10 border border-[#20E7F2]/30">
                <c.icon className="w-4 h-4 text-[#20E7F2]" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-[15px] font-bold text-white font-[family-name:var(--font-bricolage)]">
                {c.title}
              </h3>
              <p className="mt-3 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
