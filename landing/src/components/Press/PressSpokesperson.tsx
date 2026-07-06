"use client";

import Image from "next/image";
import { PenSquare } from "lucide-react";

const TAGS = [
  "Governed AI",
  "Enterprise Platform Strategy",
  "Responsible AI Adoption",
  "Marketing Governance",
  "Zoiko Group Ecosystem",
];

const LEADS = [
  { label: "Product Leadership", role: "Product Lead" },
  { label: "Technology Leadership", role: "Technology Lead" },
  { label: "Responsible AI", role: "AI & Governance Lead" },
  { label: "Commercial Leadership", role: "Commercial Lead" },
];

export default function PressSpokesperson() {
  return (
    <section className="bg-[#080D1A] py-20 md:py-24 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Spokesperson &amp; Commentary</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Who can speak on behalf of ZoikoVertex.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          Only approved leaders, quotes, bios, and headshots may be published. Unapproved names, titles, or quotes must not be attributed to ZoikoVertex.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1523] overflow-hidden mb-6 grid lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[320px] bg-[#141414]">
            <Image
              src="/images/leadership/lennox-mcleod.png"
              alt="Lennox McLeod"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="p-8 lg:p-10 flex flex-col">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#C9A84C]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Featured Spokesperson</span>
            </div>
            <h3 className="text-[clamp(1.7rem,3vw,2.3rem)] font-black leading-tight mb-2">
              <span className="text-white">Lennox </span>
              <span className="text-[#C9A84C]">McLeod.</span>
            </h3>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#C9A84C]/70 font-mono mb-6">
              &mdash; Founder and Executive Chairman, Zoiko Group
            </p>
            <p className="text-white/60 text-[14.5px] leading-relaxed mb-6">
              Founder and Executive Chairman of Zoiko Group, guiding the development of multi-industry technology platforms across AI, telecom, workforce systems, digital operations, media, communications, and enterprise software. Available for executive commentary, founder perspective, and strategic commentary on governed AI marketing operations and the Zoiko Group technology ecosystem.
            </p>
            <blockquote className="border-l-2 border-[#C9A84C] pl-5 mb-6">
              <p className="text-white text-[16px] leading-relaxed italic mb-3">
                &ldquo;ZoikoVertex is not being built to automate marketing recklessly. It is being built to help organizations move faster while preserving the controls, evidence, and accountability that serious enterprises require.&rdquo;
              </p>
              <cite className="not-italic text-[11px] uppercase tracking-[0.15em] text-[#C9A84C] font-mono">
                Lennox McLeod &middot; Founder and Executive Chairman, Zoiko Group
              </cite>
            </blockquote>
            <div className="flex flex-wrap gap-2 mb-7">
              {TAGS.map((t) => (
                <span
                  key={t}
                  className="text-[11px] text-[#C9A84C] border border-white/15 rounded-full px-3 py-1.5 font-mono"
                >
                  {t}
                </span>
              ))}
            </div>
            <button className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-full border border-white/15 text-sm font-medium text-[#C9A84C] hover:bg-white/5 transition">
              <PenSquare className="w-4 h-4" />
              Request an Interview
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEADS.map((l) => (
            <div key={l.label} className="rounded-xl border border-white/[0.08] bg-[#0C1523] p-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C] font-mono mb-2">{l.label}</div>
              <div className="text-white font-bold text-[15px] mb-1">{l.role}</div>
              <div className="text-white/30 text-[13px] italic">Profile pending final appointment confirmation</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
