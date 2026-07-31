"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, BarChart3 } from "lucide-react";

const STATS = [
  { value: "7-step", label: "Governed campaign flow" },
  { value: "Full chain", label: "Evidence per campaign" },
  { value: "8 buyer", label: "Persona pathways" },
  { value: "Zero", label: "Uncontrolled AI publishing" },
];

export default function EnterpriseRetailHero() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a] lg:min-h-[963px] flex items-center">
      <div className="absolute inset-0">
        {/* PENDING: the hero frame is 1440x963 in Figma. The only supplied
            1440-wide export is 1440x700, which matches the testimonial band
            instead. Using it here as a stand-in until the hero export lands. */}
        <Image
          src="/images/enterprise-retail/Enterprise retail environment.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center saturate-[0.4]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(26deg,rgba(8,13,26,0.95)_0%,rgba(8,13,26,0.90)_44%,rgba(8,13,26,0.20)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#C9A94A]/5 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/30 bg-[#20E7F2]/10 mb-8">
          <span className="w-[5px] h-[5px] rounded-full bg-[#20E7F2]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Enterprise Retail · Governed AI Execution
          </span>
        </div>

        <h1 className="max-w-[663px] text-[clamp(2.5rem,5.2vw,4.25rem)] font-extrabold leading-[1.13] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
          Govern AI-powered retail execution across brands, stores,{" "}
          <span className="text-[#20E7F2]">regions, and channels.</span>
        </h1>

        <p className="mt-8 max-w-[550px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          ZoikoVertex helps enterprise retailers orchestrate governed AI workflows, approvals,
          omnichannel campaigns, store-level localization, evidence, auditability, and ROI — from one
          executive-grade platform.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
          >
            <CalendarDays className="w-[14px] h-[14px]" strokeWidth={2.5} />
            Request Enterprise Retail Demo
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-white/[0.14] text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
          >
            <BarChart3 className="w-[14px] h-[14px]" strokeWidth={2} />
            Calculate Retail ROI
          </Link>
        </div>

        {/* ─── Stat band ────────────────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-white/[0.14] grid grid-cols-2 lg:grid-cols-4 gap-y-8 divide-x-0 lg:divide-x divide-white/[0.14]">
          {STATS.map((s) => (
            <div key={s.label} className="lg:first:pl-0 lg:pl-8 pr-8">
              <div className="text-4xl font-extrabold leading-9 text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                {s.value}
              </div>
              <div className="mt-3 text-[9.9px] font-medium uppercase tracking-[0.1em] text-white/30 font-[family-name:var(--font-jetbrains)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
