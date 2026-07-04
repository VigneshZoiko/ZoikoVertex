"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, ShieldCheck } from "lucide-react";

const STATS = [
  { label: "Zero", sub: "Unreviewed Claims" },
  { label: "Full chain", sub: "Approval Evidence" },
  { label: "Instant", sub: "Audit Retrieval" },
];

export default function FintechHero() {
  return (
    <section className="relative min-h-[620px] flex items-center overflow-hidden bg-[#050810] pt-[68px]">
      <div className="absolute inset-0">
        <Image
          src="/images/fintech/hero-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050810] via-[#050810]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-[#050810]/30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full py-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/25 bg-[#20E7F2]/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Fintech · Governed AI Marketing</span>
          </div>

          <h1 className="text-[clamp(2.5rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight mb-6 text-white">
            Financial marketing with{" "}
            <span className="text-[#20E7F2]">evidence at every step.</span>
          </h1>

          <p className="text-[16px] text-white/60 leading-relaxed mb-10 max-w-[540px]">
            Govern AI-assisted financial communications, enforce claims review, route regulated content to legal and compliance, and maintain complete audit trails for every marketing decision.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
            >
              <Calendar className="w-4 h-4" />
              Request an Enterprise Demo
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-sm font-medium text-white/80 hover:bg-white/5 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              Explore Governance
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-[#20E7F2]">{s.label}</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
