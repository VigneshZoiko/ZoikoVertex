"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Layers } from "lucide-react";

type Layer = {
  name: string;
  feeds: string;
  status: string;
  tone: string;
};

const LAYERS: Layer[] = [
  {
    name: "AI Agent Runtime",
    feeds: "Agent tasks, tool usage, autonomy limits, handoffs, output status",
    status: "Live",
    tone: "text-green-500 bg-green-500/10 border-green-500",
  },
  {
    name: "Workflow Engine",
    feeds: "Stage, owner, SLA, state transitions, blocked items, approvals",
    status: "Live",
    tone: "text-green-500 bg-green-500/10 border-green-500",
  },
  {
    name: "Approval Workflows",
    feeds: "Review stage, pending decisions, rejection reasons, workload",
    status: "Live",
    tone: "text-green-500 bg-green-500/10 border-green-500",
  },
  {
    name: "Policy Engine",
    feeds: "Policy triggers, risk level, block/review/allow decisions",
    status: "Live",
    tone: "text-green-500 bg-green-500/10 border-green-500",
  },
  {
    name: "Evidence Layer",
    feeds: "Audit event IDs, evidence IDs, case IDs, identity references",
    status: "Linked",
    tone: "text-[#20E7F2] bg-[#20E7F2]/5 border-[#20E7F2]",
  },
  {
    name: "Integrations",
    feeds: "Publishing status, sync health, CRM/ad/social signals, errors",
    status: "Live",
    tone: "text-green-500 bg-green-500/10 border-green-500",
  },
  {
    name: "ROI Engine",
    feeds: "Campaign outcomes, productivity measures, cost savings, conversion",
    status: "Near-real-time",
    tone: "text-orange-400 bg-orange-400/5 border-orange-400",
  },
];

export default function ExecutiveCommandCenterDataLayers() {
  return (
    <section className="grid lg:grid-cols-2 bg-[#0A111E]">
      {/* ─── Visual half ────────────────────────────────────────────── */}
      <div className="relative min-h-[280px] lg:min-h-full overflow-hidden order-first">
        <Image
          src="/images/executive-command-center/data-layers.png"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover saturate-[0.25]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/5 to-[#080d1a]/60" />
      </div>

      {/* ─── Content half ───────────────────────────────────────────── */}
      <div className="px-6 lg:px-[72px] py-20 lg:py-24">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Data Inputs &amp; Outputs
          </span>
        </div>

        <h2 className="text-[clamp(1.5rem,2.4vw,1.75rem)] font-extrabold leading-[1.2] text-white/90 font-[family-name:var(--font-bricolage)]">
          Seven live data layers. One trusted operating view.
        </h2>

        <p className="mt-6 max-w-[440px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          The command center aggregates event feeds from every operational layer — without requiring
          executives to switch tools to understand what is happening.
        </p>

        {/* ─── Layer table ──────────────────────────────────────────── */}
        <div className="mt-10 -mx-6 lg:mx-0 px-6 lg:px-0 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Layer", "What it feeds", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-2 text-[9.6px] font-medium uppercase tracking-[0.08em] text-white/25 font-[family-name:var(--font-jetbrains)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAYERS.map((l) => (
                <tr key={l.name} className="border-b border-white/5">
                  <td className="px-3.5 py-4 align-middle w-[160px]">
                    <span className="text-xs font-medium text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                      {l.name}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 align-middle">
                    <span className="text-xs font-light leading-4 text-white/50 font-[family-name:var(--font-jakarta)]">
                      {l.feeds}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 align-middle w-[130px]">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-1 text-[9.3px] font-medium whitespace-nowrap font-[family-name:var(--font-jetbrains)] ${l.tone}`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
          >
            <CalendarDays className="w-[14px] h-[14px]" strokeWidth={2.5} />
            Book Executive Demo
          </Link>
          <Link
            href="/agentic-architecture"
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full border border-white/10 text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
          >
            <Layers className="w-[14px] h-[14px]" strokeWidth={2} />
            View Architecture
          </Link>
        </div>
      </div>
    </section>
  );
}
