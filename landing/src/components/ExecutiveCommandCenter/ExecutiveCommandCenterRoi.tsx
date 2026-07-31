"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

const METRICS = [
  {
    value: "+34%",
    label: "Execution velocity",
    desc: "Average increase in campaign-launch speed when governed workflows replace manual coordination and fragmented approval chains.",
  },
  {
    value: "−62%",
    label: "Approval cycle-time",
    desc: "Reduction in brief-to-approval time across enterprise workflows when SLA controls and escalation paths remove bottlenecks.",
  },
  {
    value: "Full",
    label: "Evidence coverage",
    desc: "Every tracked execution event links to an evidence record — making ROI attribution traceable, defensible, and board-ready.",
  },
  {
    value: "Zero",
    label: "Uncontrolled publishes",
    desc: "No AI agent action reaches a distribution channel without human approval, policy clearance, and evidence capture in the governance layer.",
  },
];

export default function ExecutiveCommandCenterRoi() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* ─── Panel ────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl border border-white/10 overflow-hidden">
          <Image
            src="/images/executive-command-center/roi-panel.png"
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1184px"
            className="object-cover saturate-[0.25]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/95 via-[#080d1a]/75 to-[#080d1a]/25" />

          <div className="relative px-8 lg:px-14 py-16 lg:py-20">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <span className="w-3.5 h-px bg-[#C9A94A]" />
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#C9A94A] font-[family-name:var(--font-jetbrains)]">
                ROI Engine Panel
              </span>
            </div>

            <h2 className="max-w-[540px] text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white font-[family-name:var(--font-bricolage)]">
              Connect agentic execution to measurable business value.
            </h2>

            <p className="mt-6 max-w-[500px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
              The ROI Engine panel surfaces execution value, productivity gains, campaign outcomes,
              and risk-reduction indicators — giving boards and finance the proof they need.
            </p>
          </div>
        </div>

        {/* ─── Metric cards ─────────────────────────────────────────── */}
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/10 bg-[#0E1626] p-6">
              <div className="text-3xl font-extrabold leading-none text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                {m.value}
              </div>
              <div className="mt-3 text-[10.4px] font-medium uppercase tracking-[0.1em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                {m.label}
              </div>
              <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                {m.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/platform"
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
          >
            <BarChart3 className="w-[14px] h-[14px]" strokeWidth={2.5} />
            Explore the ROI Engine
          </Link>
        </div>
      </div>
    </section>
  );
}
