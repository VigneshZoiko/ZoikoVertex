"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, BarChart3, Workflow } from "lucide-react";

export default function ExecutiveCommandCenterFinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <Image
        src="/images/executive-command-center/final-cta.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover saturate-[0.25]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/80 via-[#080d1a]/70 to-[#080d1a]/95" />

      {/* Oversized wordmark */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(6rem,17vw,15rem)] font-extrabold tracking-tight text-white/[0.02] select-none font-[family-name:var(--font-bricolage)]"
      >
        COMMAND
      </span>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2.5 mb-8">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Executive Command Center · ZoikoVertex
          </span>
        </div>

        <h2 className="mx-auto max-w-[640px] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.15] text-white font-[family-name:var(--font-bricolage)]">
          Every agent, approval, risk, and ROI signal.{" "}
          <span className="text-[#20E7F2]">One governed view.</span>
        </h2>

        <p className="mx-auto mt-7 max-w-[520px] text-base font-light leading-8 text-white/50 font-[family-name:var(--font-jakarta)]">
          ZoikoVertex gives enterprise leaders the operating layer that connects AI execution,
          governance controls, evidence, and measurable business outcomes — without requiring them to
          assemble it from fragmented tools.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
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
            <BarChart3 className="w-[14px] h-[14px]" strokeWidth={2.5} />
            Explore the ROI Engine
          </Link>
          <Link
            href="/ai-workflow-orchestration"
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full border border-white/15 text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
          >
            <Workflow className="w-[14px] h-[14px]" strokeWidth={2} />
            AI Workflow Orchestration
          </Link>
        </div>

        <p className="mx-auto mt-10 max-w-[480px] text-xs leading-5 text-white/20 font-[family-name:var(--font-jetbrains)]">
          Built for CEOs, CMOs, COOs, CTOs, legal, governance, and procurement leaders evaluating
          enterprise agentic execution.
        </p>
      </div>
    </section>
  );
}
