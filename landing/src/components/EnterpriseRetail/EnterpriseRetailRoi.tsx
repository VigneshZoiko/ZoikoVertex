"use client";

import Link from "next/link";
import { BarChart3, CalendarDays } from "lucide-react";

type Lever = { num: string; title: string; metrics: string; desc: string; roles: string };

const LEVERS: Lever[] = [
  {
    num: "01",
    title: "Campaign throughput",
    metrics: "Campaigns launched · Variants created · Reviews completed",
    desc: "Measure how many more campaigns, creative variants, and markets can be served without adding headcount when AI and governance work together.",
    roles: "CMO · Marketing Operations",
  },
  {
    num: "02",
    title: "Approval cycle-time",
    metrics: "Brief-to-approval time · Bottleneck reduction · SLA adherence",
    desc: "Track the reduction in time from campaign brief to approved activation. Shorter cycles mean faster speed to market on seasonal and promotional windows.",
    roles: "CMO · COO · Retail Media",
  },
  {
    num: "03",
    title: "Rework reduction",
    metrics: "Rejected variants · Duplicate work · Agency correction cycles",
    desc: "Measure the cost of rejected content, redundant revisions, and agency correction loops eliminated when policy checks and clear briefs reduce misalignment upstream.",
    roles: "Procurement · Finance · Agency Mgmt",
  },
  {
    num: "04",
    title: "Agency efficiency",
    metrics: "Brief clarity · Revision cycles · Evidence transfer · Approval visibility",
    desc: "Structured briefs, approval transparency, and evidence handoffs reduce the cost and friction of external agency relationships at enterprise scale.",
    roles: "Agency Management · Procurement",
  },
  {
    num: "05",
    title: "Risk reduction",
    metrics: "Blocked claims · Policy triggers · Avoided unauthorized publishing",
    desc: "Quantify the value of claims blocked, unapproved content stopped, and compliance incidents avoided before they reached market — and the legal costs not incurred.",
    roles: "Legal · Compliance · COO",
  },
  {
    num: "06",
    title: "Performance impact",
    metrics: "Conversion · Engagement · Campaign velocity · Local relevance",
    desc: "More campaigns, faster speed to market, better local relevance, and consistent brand execution contribute to measurable revenue and margin improvement.",
    roles: "CMO · CEO · CIO",
  },
  {
    num: "07",
    title: "Governance maturity",
    metrics: "Evidence completeness · Decision coverage · Audit readiness",
    desc: "Board confidence, procurement pass rates, and audit readiness are enterprise-grade outcomes that ZoikoVertex makes measurable and reportable.",
    roles: "CEO · Board · Procurement",
  },
];

export default function EnterpriseRetailRoi() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            ROI Engine for Retail
          </span>
        </div>

        <h2 className="max-w-[545px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Connect governed execution to measurable retail business value.
        </h2>

        <p className="mt-7 max-w-[540px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Seven levers. Both cost and revenue side. The ZoikoVertex ROI Engine builds an executive
          business case from operational improvements and governance maturity.
        </p>

        <div className="mt-14 grid md:grid-cols-2 gap-px bg-white/10 rounded-xl overflow-hidden">
          {LEVERS.map((l) => (
            <div key={l.num} className="bg-[#0E1626] border-l-2 border-[#20E7F2]/40 p-7">
              <div className="text-3xl font-extrabold leading-8 text-white/[0.06] font-[family-name:var(--font-bricolage)]">
                {l.num}
              </div>

              <h3 className="mt-3 text-base font-bold text-white font-[family-name:var(--font-bricolage)]">
                {l.title}
              </h3>

              <p className="mt-2.5 text-[10.5px] leading-[1.6] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                {l.metrics}
              </p>

              <p className="mt-3.5 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                {l.desc}
              </p>

              <p className="mt-5 text-[9.6px] font-medium uppercase tracking-[0.1em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                {l.roles}
              </p>
            </div>
          ))}
          <div className="hidden md:block bg-[#080d1a]" />
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
          >
            <BarChart3 className="w-[14px] h-[14px]" strokeWidth={2.5} />
            Calculate Retail ROI
          </Link>
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-white/[0.14] text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
          >
            <CalendarDays className="w-[14px] h-[14px]" strokeWidth={2} />
            Request Enterprise Retail Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
