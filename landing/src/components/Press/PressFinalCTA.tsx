"use client";

import Image from "next/image";
import { Mail, Download } from "lucide-react";

export default function PressFinalCTA() {
  return (
    <section className="relative bg-[#0A0F1C] border-t border-white/[0.06] py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/press/final-cta-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/85 to-[#0A0F1C]/60" />
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[#C9A84C]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Official Media Destination</span>
        </div>

        <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-black leading-tight text-white mb-6">
          Need official information about ZoikoVertex?
        </h2>

        <p className="text-white/50 text-[15px] leading-relaxed mb-10 max-w-xl mx-auto">
          For media inquiries, interviews, analyst briefings, speaking requests, approved brand assets, or official company statements, contact ZoikoVertex media relations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-[#080d1a] text-sm font-bold transition">
            <Mail className="w-4 h-4" />
            Contact Media Relations
          </button>
          <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5 transition">
            <Download className="w-4 h-4" />
            Download Press Kit
          </button>
        </div>

        <p className="text-white/30 text-[12px] font-mono">
          Please include your organization, topic, deadline, publication or event name, and requested spokesperson where applicable.
        </p>
      </div>
    </section>
  );
}
