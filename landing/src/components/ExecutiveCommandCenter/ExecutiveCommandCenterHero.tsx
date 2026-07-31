"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, TrendingUp, AlertTriangle } from "lucide-react";

const TILES = [
  { value: "42", label: "Active workflows", color: "text-[#20E7F2]" },
  { value: "18", label: "Approved today", color: "text-green-500" },
  { value: "3", label: "Awaiting review", color: "text-amber-500" },
];

const ROWS = [
  {
    label: "Campaign: Q4 Retail Launch",
    badge: "In approval",
    tone: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  {
    label: "Agent: Content variant generator",
    badge: "Running · 7 tasks",
    tone: "text-[#20E7F2] bg-[#20E7F2]/10 border-[#20E7F2]/20",
  },
  {
    label: "Approval SLA: Legal review",
    badge: "48h — approaching",
    tone: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
];

const METERS = [
  { label: "Campaign execution velocity", value: 76, bar: "bg-[#20E7F2]" },
  { label: "Governance evidence coverage", value: 94, bar: "bg-green-500" },
];

export default function ExecutiveCommandCenterHero() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <Image
          src="/images/executive-command-center/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover saturate-[0.25]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(26deg,rgba(8,13,26,0.95)_0%,rgba(8,13,26,0.90)_44%,rgba(8,13,26,0.20)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#20E7F2]/[0.05] to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-start">
          {/* ─── Copy ─────────────────────────────────────────────────── */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/20 bg-[#20E7F2]/10 mb-8">
              <span className="w-[5px] h-[5px] rounded-full bg-[#20E7F2]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                Executive Command Center
              </span>
            </div>

            <h1 className="text-[clamp(2.25rem,4.6vw,3.75rem)] font-extrabold leading-[1.14] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
              See every agent, workflow, approval, risk and ROI signal in one{" "}
              <span className="text-[#20E7F2]">governed command center.</span>
            </h1>

            <p className="mt-8 max-w-[617px] text-base font-light leading-8 text-white/50 font-[family-name:var(--font-jakarta)]">
              ZoikoVertex gives leaders a real-time operating view of AI-assisted execution,
              campaign velocity, governance exceptions, approval bottlenecks, evidence links,
              and measurable business outcomes — from one trusted executive layer.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/request-demo"
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
              >
                <CalendarDays className="w-[14px] h-[14px]" strokeWidth={2.5} />
                Book an Executive Demo
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[#C9A94A] text-[#080d1a] text-sm font-bold hover:bg-[#C9A94A]/90 transition font-[family-name:var(--font-jakarta)]"
              >
                <TrendingUp className="w-[14px] h-[14px]" strokeWidth={2.5} />
                Explore the ROI Engine
              </Link>
            </div>

            <p className="mt-7 text-xs font-medium tracking-[0.02em] text-white/25 font-[family-name:var(--font-jetbrains)]">
              Built for enterprise teams that need speed, visibility, control, and auditability.
            </p>
          </div>

          {/* ─── Live view panel ──────────────────────────────────────── */}
          <div className="w-full max-w-[460px] justify-self-end rounded-2xl bg-[#0E1626]/95 border border-white/10 shadow-[0px_24px_80px_0px_rgba(0,0,0,0.60)] overflow-hidden">
            <div className="flex items-center gap-2 h-8 px-4 bg-[#0A111E] border-b border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="ml-1.5 text-[9.6px] font-medium uppercase tracking-[0.08em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                Executive Command Center · Live view
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {TILES.map((t) => (
                  <div
                    key={t.label}
                    className="rounded-lg bg-[#0A111E] border border-white/10 px-3 py-2.5"
                  >
                    <div
                      className={`text-lg font-extrabold leading-4 font-[family-name:var(--font-bricolage)] ${t.color}`}
                    >
                      {t.value}
                    </div>
                    <div className="mt-2 text-[8.8px] font-medium uppercase tracking-[0.08em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                      {t.label}
                    </div>
                  </div>
                ))}
              </div>

              {ROWS.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#0A111E] border border-white/10 px-4 h-10"
                >
                  <span className="text-[10.1px] font-medium text-white/50 font-[family-name:var(--font-jetbrains)] truncate">
                    {r.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9.3px] font-medium font-[family-name:var(--font-jetbrains)] ${r.tone}`}
                  >
                    {r.badge}
                  </span>
                </div>
              ))}

              <div className="space-y-3 pt-1">
                {METERS.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9.6px] text-white/25 font-[family-name:var(--font-jetbrains)]">
                        {m.label}
                      </span>
                      <span className="text-xs font-bold text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                        {m.value}%
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.bar}`}
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-500" strokeWidth={2.5} />
                <p className="text-[9.9px] font-medium leading-[1.35] text-red-500/75 font-[family-name:var(--font-jetbrains)]">
                  Policy trigger: restricted pricing claim detected in variant 3 — pending
                  compliance review
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#0A111E] border border-white/10 px-4 h-10">
                <span className="text-[10.1px] font-medium text-white/50 font-[family-name:var(--font-jetbrains)] truncate">
                  ROI Engine: estimated value saved
                </span>
                <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9.3px] font-medium text-green-500 font-[family-name:var(--font-jetbrains)]">
                  +$142k this quarter
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
