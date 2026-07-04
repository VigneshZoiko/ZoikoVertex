"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, ShieldCheck } from "lucide-react";

export default function B2BSaaSFinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/b2b-saas/above-footer-bg-v3.png"
          alt=""
          fill
          className="object-cover opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0C1523]/90" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">B2B SaaS · ZoikoVertex</span>
        </div>

        <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-white mb-6">
          B2B SaaS marketing that earns — and keeps — enterprise trust.
        </h2>

        <p className="text-white/55 text-[15px] leading-relaxed max-w-2xl mx-auto mb-10">
          ZoikoVertex helps B2B SaaS marketing teams move faster on product launches, security messaging, and customer proof — with claims review, authorization governance, and procurement-ready evidence built in.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
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

        <p className="text-white/30 text-[12px] font-mono">
          For b2b saas enterprise teams, agencies, and governance-led marketing departments.
        </p>
      </div>
    </section>
  );
}
